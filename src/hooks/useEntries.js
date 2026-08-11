import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'
import {
  subscribe,
  getEntries,
  init,
  addEntry,
  updateEntry,
  deleteEntry,
  getEntriesByDay,
  getEntriesForRange,
} from '../lib/entriesStore'

// Exposes the singleton local-first entries store to React components.
export function useEntries() {
  const entries = useSyncExternalStore(subscribe, getEntries)

  useEffect(() => {
    init()
  }, [])

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntriesByDay,
    getEntriesForRange,
  }
}
