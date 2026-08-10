import express from 'express'
import multer from 'multer'

const PORT = process.env.PORT || 8787
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// Browser never sees GROQ_API_KEY: it's read server-side only, from an env
// var configured directly in the hosting platform (never a client .env file).
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!GROQ_API_KEY) {
    res.status(500).json({ error: 'Server is missing GROQ_API_KEY' })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'No audio file provided' })
    return
  }

  try {
    const form = new FormData()
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), 'recording.webm')
    form.append('model', 'whisper-large-v3-turbo')

    const groqRes = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
    })

    if (!groqRes.ok) {
      const detail = await groqRes.text().catch(() => '')
      res.status(502).json({ error: `Groq transcription failed (${groqRes.status}): ${detail}` })
      return
    }

    const { text } = await groqRes.json()
    res.json({ text })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Transcribe proxy listening on http://localhost:${PORT}`)
})
