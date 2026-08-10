// Google Identity Services (GIS) token client — the SPA-friendly OAuth flow.
// No client secret involved: only the public Client ID is used, and the
// browser exchanges it directly with Google for a short-lived access token.
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function waitForGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google)
      return
    }
    const start = Date.now()
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval)
        resolve(window.google)
      } else if (Date.now() - start > 10000) {
        clearInterval(interval)
        reject(new Error('Google Identity Services script failed to load'))
      }
    }, 50)
  })
}

let tokenClientPromise = null

// Creates (once) and returns the GIS token client. `onToken` is called with
// the raw token response every time a token is granted or refreshed;
// `onError` is called if the user/browser rejects the request.
export function getTokenClient(onToken, onError) {
  if (!CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set in .env')
  }
  if (!tokenClientPromise) {
    tokenClientPromise = waitForGis().then((google) =>
      google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error) {
            onError?.(response)
          } else {
            onToken?.(response)
          }
        },
      })
    )
  }
  return tokenClientPromise
}

// Revokes an access token, e.g. on explicit "disconnect".
export function revokeToken(accessToken) {
  if (!accessToken || !window.google?.accounts?.oauth2) return
  window.google.accounts.oauth2.revoke(accessToken)
}
