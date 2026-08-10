import { useSyncExternalStore } from 'react'
import { subscribe, getState, connect, disconnect } from '../lib/authStore'

// Exposes the singleton Google auth state to React components.
export function useGoogleAuth() {
  const state = useSyncExternalStore(subscribe, getState)
  return { ...state, connect, disconnect }
}
