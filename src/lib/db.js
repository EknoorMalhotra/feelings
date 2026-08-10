import { openDB } from 'idb'

const DB_NAME = 'feelings-db'
const DB_VERSION = 1
export const ENTRIES_STORE = 'entries'

let dbPromise = null

// Local mirror of the Drive-backed entry JSON, plus a few local-only fields
// (`day`, `driveFileId`, `syncStatus`) used for calendar queries and sync.
export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(ENTRIES_STORE, { keyPath: 'id' })
        store.createIndex('by-day', 'day')
        store.createIndex('by-sync-status', 'syncStatus')
      },
    })
  }
  return dbPromise
}

export async function getAllEntries() {
  const db = await getDb()
  return db.getAll(ENTRIES_STORE)
}

export async function getEntriesByDay(day) {
  const db = await getDb()
  return db.getAllFromIndex(ENTRIES_STORE, 'by-day', day)
}

export async function getPendingEntries() {
  const db = await getDb()
  return db.getAllFromIndex(ENTRIES_STORE, 'by-sync-status', 'pending')
}

export async function putEntry(entry) {
  const db = await getDb()
  return db.put(ENTRIES_STORE, entry)
}

export async function deleteEntry(id) {
  const db = await getDb()
  return db.delete(ENTRIES_STORE, id)
}
