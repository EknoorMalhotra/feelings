// Singleton entries store: local-first writes to IndexedDB, with a background
// push to Drive whenever we're connected and online. Mirrors the pattern in
// authStore.js so both React (via useEntries) and plain JS can use it.
import * as db from './db'
import { getState as getAuthState, subscribe as subscribeAuth } from './authStore'
import { ensureJournalFolder, writeEntryFile, updateEntryFile } from './driveApi'

let entries = []
let folderId = null
let initialized = false
let syncing = false

const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getEntries() {
  return entries
}

function dayFromIso(iso) {
  return iso.slice(0, 10)
}

function upsertLocal(entry) {
  const idx = entries.findIndex((e) => e.id === entry.id)
  entries =
    idx >= 0
      ? [...entries.slice(0, idx), entry, ...entries.slice(idx + 1)]
      : [...entries, entry]
  notify()
}

// Strips local-only bookkeeping fields before writing to Drive.
function toDriveJson(entry) {
  const { day, driveFileId, syncStatus, ...driveEntry } = entry
  return driveEntry
}

export async function init() {
  if (initialized) return
  initialized = true
  entries = await db.getAllEntries()
  notify()
  maybeSync()
}

export async function addEntry({ title, body, mood, tags = [], input_method }) {
  const now = new Date().toISOString()
  const entry = {
    id: now,
    created_at: now,
    updated_at: now,
    title,
    body,
    mood,
    tags,
    input_method,
    day: dayFromIso(now),
    driveFileId: null,
    syncStatus: 'pending',
  }
  await db.putEntry(entry)
  upsertLocal(entry)
  maybeSync()
  return entry
}

export async function updateEntry(id, patch) {
  const existing = entries.find((e) => e.id === id)
  if (!existing) throw new Error(`Entry ${id} not found`)
  const updated = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
    syncStatus: 'pending',
  }
  await db.putEntry(updated)
  upsertLocal(updated)
  maybeSync()
  return updated
}

export function getEntriesByDay(day) {
  return entries.filter((e) => e.day === day)
}

export function getEntriesForRange(startDay, endDay) {
  return entries.filter((e) => e.day >= startDay && e.day <= endDay)
}

export async function maybeSync() {
  const auth = getAuthState()
  if (auth.status !== 'connected' || !navigator.onLine || syncing) return

  syncing = true
  try {
    if (!folderId) folderId = await ensureJournalFolder(auth.accessToken)
    const pending = await db.getPendingEntries()

    for (const entry of pending) {
      try {
        const result = entry.driveFileId
          ? await updateEntryFile(auth.accessToken, entry.driveFileId, toDriveJson(entry))
          : await writeEntryFile(auth.accessToken, folderId, toDriveJson(entry))
        const synced = {
          ...entry,
          driveFileId: result.id ?? entry.driveFileId,
          syncStatus: 'synced',
        }
        await db.putEntry(synced)
        upsertLocal(synced)
      } catch (err) {
        console.warn('Sync failed for entry, will retry later:', entry.id, err)
      }
    }
  } finally {
    syncing = false
  }
}

// Re-attempt sync whenever auth connects or the browser comes back online.
subscribeAuth(maybeSync)
if (typeof window !== 'undefined') {
  window.addEventListener('online', maybeSync)
}
