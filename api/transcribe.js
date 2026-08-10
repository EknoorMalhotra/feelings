import { transcribeWithGroq } from '../server/transcribeGroq.js'

// Groq's whisper-large-v3-turbo runs at ~216x real-time, so even a 10-minute
// entry transcribes in a few seconds — 60s (Vercel Hobby's configurable max)
// is generous headroom, not a tight fit.
export const config = {
  maxDuration: 60,
}

export async function POST(request) {
  const formData = await request.formData()
  const file = formData.get('audio')

  if (!file) {
    return Response.json({ error: 'No audio file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const text = await transcribeWithGroq(buffer, file.type, process.env.GROQ_API_KEY)
    return Response.json({ text })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status ?? 500 })
  }
}
