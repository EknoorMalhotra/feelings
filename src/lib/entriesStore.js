// Singleton entries store: local-first writes to IndexedDB, with a background
// push to Drive whenever we're connected and online. Mirrors the pattern in
// authStore.js so both React (via useEntries) and plain JS can use it.
import * as db from './db'
import { getState as getAuthState, subscribe as subscribeAuth } from './authStore'
import {
  ensureJournalFolder,
  writeEntryFile,
  updateEntryFile,
  listEntryFiles,
  readEntryFile,
  trashEntryFile,
} from './driveApi'

let entries = []
let folderId = null
let initialized = false
let syncing = false
let pulling = false

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
  syncAll()
}

async function getFolderId(accessToken) {
  if (!folderId) folderId = await ensureJournalFolder(accessToken)
  return folderId
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

// Trashes the Drive file first (if the entry ever synced), then removes it
// locally — in that order, deliberately. pullFromDrive() treats "in Drive but
// not local" as something to re-fetch, so a local-only delete would just get
// resurrected on the next sync; requiring the Drive trash to succeed first
// (which means being online) avoids that instead of adding a delete queue.
export async function deleteEntry(id) {
  const entry = entries.find((e) => e.id === id)
  if (!entry) return

  if (entry.driveFileId) {
    const auth = getAuthState()
    if (auth.status !== 'connected' || !navigator.onLine) {
      throw new Error('Connect to the internet to delete this entry.')
    }
    await trashEntryFile(auth.accessToken, entry.driveFileId)
  }

  await db.deleteEntry(id)
  entries = entries.filter((e) => e.id !== id)
  notify()
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
    const folder = await getFolderId(auth.accessToken)
    const pending = await db.getPendingEntries()

    for (const entry of pending) {
      try {
        const result = entry.driveFileId
          ? await updateEntryFile(auth.accessToken, entry.driveFileId, toDriveJson(entry))
          : await writeEntryFile(auth.accessToken, folder, toDriveJson(entry))
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

// Pulls entries that exist in Drive but not locally yet — the read side of
// sync, so a fresh browser/device populates from Drive instead of starting
// empty. Matched by id (Drive filenames are `${entry.id}.json`); anything
// already present locally is left untouched rather than re-fetched, since
// this app has no entry-editing feature yet, so there's nothing to merge.
export async function pullFromDrive() {
  const auth = getAuthState()
  if (auth.status !== 'connected' || !navigator.onLine || pulling) return

  pulling = true
  try {
    const folder = await getFolderId(auth.accessToken)
    const files = await listEntryFiles(auth.accessToken, folder)
    const localIds = new Set(entries.map((e) => e.id))

    for (const file of files) {
      const id = file.name.replace(/\.json$/, '')
      if (localIds.has(id)) continue

      try {
        const remote = await readEntryFile(auth.accessToken, file.id)
        const entry = {
          ...remote,
          id,
          day: dayFromIso(remote.created_at),
          driveFileId: file.id,
          syncStatus: 'synced',
        }
        await db.putEntry(entry)
        upsertLocal(entry)
      } catch (err) {
        console.warn('Pull failed for entry, will retry later:', file.id, err)
      }
    }
  } finally {
    pulling = false
  }
}

function syncAll() {
  pullFromDrive()
  maybeSync()
}

// Re-attempt sync whenever auth connects or the browser comes back online.
subscribeAuth(syncAll)
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncAll)
}
