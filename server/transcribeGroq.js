const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

// Shared by the local dev Express server (server/dev-server.js) and the
// Vercel serverless function (api/transcribe.js) so the two runtimes stay
// in sync instead of drifting apart.
export async function transcribeWithGroq(buffer, mimetype, apiKey) {
  if (!apiKey) {
    const err = new Error('Server is missing GROQ_API_KEY')
    err.status = 500
    throw err
  }

  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimetype }), 'recording.webm')
  form.append('model', 'whisper-large-v3-turbo')

  const groqRes = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!groqRes.ok) {
    const detail = await groqRes.text().catch(() => '')
    const err = new Error(`Groq transcription failed (${groqRes.status}): ${detail}`)
    err.status = 502
    throw err
  }

  const { text } = await groqRes.json()
  return text
}
