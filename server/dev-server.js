import express from 'express'
import multer from 'multer'
import { transcribeWithGroq } from './transcribeGroq.js'

const PORT = process.env.PORT || 8787

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// Local-dev-only mirror of api/transcribe.js (the deployed Vercel function).
// Vite's server.proxy forwards /api/* here during `npm run dev`.
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No audio file provided' })
    return
  }

  try {
    const text = await transcribeWithGroq(req.file.buffer, req.file.mimetype, process.env.GROQ_API_KEY)
    res.json({ text })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Transcribe proxy listening on http://localhost:${PORT}`)
})
