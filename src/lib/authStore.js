// Singleton auth state: plain JS so both React components (via useGoogleAuth)
// and non-React modules (e.g. driveApi.js) can read/request a valid token.
import { getTokenClient, revokeToken } from './googleAuth'

const REFRESH_MARGIN_MS = 60_000 // refresh this long before actual expiry

let state = {
  accessToken: null,
  expiresAt: null, // epoch ms
  status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  error: null,
}

const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState() {
  return state
}

let refreshTimer = null

function scheduleRefresh(expiresAt) {
  if (refreshTimer) clearTimeout(refreshTimer)
  const delay = Math.max(expiresAt - Date.now() - REFRESH_MARGIN_MS, 0)
  refreshTimer = setTimeout(() => requestToken({ silent: true }), delay)
}

function handleToken(response) {
  const expiresAt = Date.now() + response.expires_in * 1000
  setState({
    accessToken: response.access_token,
    expiresAt,
    status: 'connected',
    error: null,
  })
  scheduleRefresh(expiresAt)
}

function handleError(response) {
  // A failed silent refresh just means the user needs to reconnect manually;
  // it isn't a hard error worth surfacing loudly.
  setState({
    status: state.accessToken ? 'disconnected' : 'error',
    error: response?.error ?? 'Google sign-in failed',
    accessToken: null,
    expiresAt: null,
  })
}

async function requestToken({ silent }) {
  setState({ status: 'connecting', error: null })
  const client = await getTokenClient(handleToken, handleError)
  client.requestAccessToken(silent ? { prompt: '' } : {})
}

// Called from the "Connect Google Drive" button.
export function connect() {
  return requestToken({ silent: false })
}

export function disconnect() {
  revokeToken(state.accessToken)
  if (refreshTimer) clearTimeout(refreshTimer)
  setState({ accessToken: null, expiresAt: null, status: 'disconnected', error: null })
}

// For non-component code (Drive API calls) that just needs a usable token.
// Resolves once connected; rejects if the user isn't connected at all.
export function ensureAccessToken() {
  if (state.status === 'connected' && state.accessToken && state.expiresAt > Date.now() + 5000) {
    return Promise.resolve(state.accessToken)
  }
  return Promise.reject(new Error('Not connected to Google Drive'))
}
