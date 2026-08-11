// Thin wrapper around Drive API v3, scoped to drive.file (only files/folders
// this app itself creates are visible to it — least privilege).
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const JOURNAL_FOLDER_NAME = 'journal'
const FOLDER_ID_CACHE_KEY = 'feelings:journalFolderId'

class DriveApiError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message)
    this.name = 'DriveApiError'
    this.status = status
    this.cause = cause
  }
}

async function driveFetch(accessToken, url, options = {}) {
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    })
  } catch (cause) {
    throw new DriveApiError('No internet connection', { cause })
  }

  if (response.status === 401) {
    throw new DriveApiError('Google Drive session expired — please reconnect', {
      status: 401,
    })
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new DriveApiError(`Drive API error (${response.status}): ${body}`, {
      status: response.status,
    })
  }
  return response
}

async function findJournalFolder(accessToken) {
  const q = encodeURIComponent(
    `mimeType='${FOLDER_MIME}' and name='${JOURNAL_FOLDER_NAME}' and trashed=false and 'root' in parents`
  )
  const res = await driveFetch(
    accessToken,
    `${DRIVE_FILES_URL}?q=${q}&fields=files(id,name)&spaces=drive`
  )
  const { files } = await res.json()
  return files?.[0]?.id ?? null
}

async function createJournalFolder(accessToken) {
  const res = await driveFetch(accessToken, DRIVE_FILES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: JOURNAL_FOLDER_NAME, mimeType: FOLDER_MIME }),
  })
  const folder = await res.json()
  return folder.id
}

// Finds the /journal/ folder (creating it if missing), caching the id locally.
export async function ensureJournalFolder(accessToken) {
  const cached = localStorage.getItem(FOLDER_ID_CACHE_KEY)
  if (cached) return cached

  const existing = await findJournalFolder(accessToken)
  const folderId = existing ?? (await createJournalFolder(accessToken))
  localStorage.setItem(FOLDER_ID_CACHE_KEY, folderId)
  return folderId
}

// Writes one entry as `${entry.id}.json` inside the journal folder.
export async function writeEntryFile(accessToken, folderId, entry) {
  const boundary = 'feelings-boundary'
  const metadata = { name: `${entry.id}.json`, parents: [folderId] }
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${JSON.stringify(entry)}\r\n` +
    `--${boundary}--`

  const res = await driveFetch(
    accessToken,
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  )
  return res.json()
}

// Overwrites an existing entry file's content (used when syncing edits).
export async function updateEntryFile(accessToken, fileId, entry) {
  const res = await driveFetch(
    accessToken,
    `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }
  )
  return res.json()
}

// Lists entry files (id, name, timestamps) inside the journal folder.
export async function listEntryFiles(accessToken, folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const res = await driveFetch(
    accessToken,
    `${DRIVE_FILES_URL}?q=${q}&fields=files(id,name,createdTime,modifiedTime)&orderBy=createdTime desc&pageSize=1000`
  )
  const { files } = await res.json()
  return files ?? []
}

// Fetches and parses one entry file's JSON content.
export async function readEntryFile(accessToken, fileId) {
  const res = await driveFetch(accessToken, `${DRIVE_FILES_URL}/${fileId}?alt=media`)
  return res.json()
}

// Moves an entry file to Drive's own trash (recoverable there for ~30 days)
// rather than a hard delete, since this removes a personal journal entry.
export async function trashEntryFile(accessToken, fileId) {
  await driveFetch(accessToken, `${DRIVE_FILES_URL}/${fileId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  })
}

export { DriveApiError }
