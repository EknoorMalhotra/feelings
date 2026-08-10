import { useEffect, useRef, useState } from 'react'
import { formatSeconds } from '../lib/dateUtils'
import { textToDoc } from '../lib/tiptapText'
import WritingEditor from './WritingEditor'

const PAPER_NOISE =
  "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAuMDM1IDAiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')"

const MIN_RECORDING_SECONDS = 1

// Ported from the HTML prototype's entry screen. Writing mode uses a real
// Tiptap editor (WritingEditor). Speaking mode records via MediaRecorder,
// drives the orb from a live AnalyserNode, and auto-saves the instant a
// transcript comes back (no review-before-save step — see PROGRESS.md).
export default function Entry({ background, todayLabel, onGoHome, onSave }) {
  const [entryMode, setEntryMode] = useState('writing')
  const [title, setTitle] = useState('')
  const [bodyHasContent, setBodyHasContent] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordedSeconds, setRecordedSeconds] = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState(null)
  const editorRef = useRef(null)
  const timerRef = useRef(null)
  const secondsRef = useRef(0)
  const orbInnerRef = useRef(null)

  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)
  const smoothedScaleRef = useRef(1)
  const discardRef = useRef(false)

  const isWriting = entryMode === 'writing'
  const entryBackground = isWriting ? background : '#FBF5EA'
  const entryHeaderBorder = isWriting ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(59,70,81,0.08)'
  const entryChromeColor = isWriting ? '#FBF5EACC' : 'rgba(59,70,81,0.6)'
  const entryToggleBg = isWriting ? 'rgba(255,255,255,0.14)' : 'rgba(59,70,81,0.06)'

  // Speaking mode saves itself the moment a transcript arrives; the header
  // Save button only ever applies to writing mode.
  const canSave = isWriting && ((title && title.trim().length > 0) || bodyHasContent)

  function stopTracksAndAudio() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
  }

  function animateOrb() {
    if (!analyserRef.current || !orbInnerRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteTimeDomainData(data)
    let sumSquares = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sumSquares += v * v
    }
    const rms = Math.sqrt(sumSquares / data.length)
    const target = 1 + Math.min(rms * 3.2, 0.42)
    smoothedScaleRef.current = smoothedScaleRef.current * 0.8 + target * 0.2
    orbInnerRef.current.style.transform = `scale(${smoothedScaleRef.current.toFixed(3)})`
    rafRef.current = requestAnimationFrame(animateOrb)
  }

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      // Pinned (not left to the browser default) so a long entry has a
      // predictable upload size — comfortably speech-clear at 32kbps opus,
      // and keeps a 10-minute recording well under Vercel's ~4.5MB request cap.
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stopTracksAndAudio()
        if (discardRef.current) {
          discardRef.current = false
          return
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        transcribeBlob(blob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder

      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioCtx()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser
      smoothedScaleRef.current = 1

      secondsRef.current = 0
      setRecordedSeconds(0)
      timerRef.current = setInterval(() => {
        secondsRef.current += 1
        setRecordedSeconds(secondsRef.current)
      }, 1000)

      setRecording(true)
      rafRef.current = requestAnimationFrame(animateOrb)
    } catch {
      setError('Microphone access is needed to record. Please allow it and try again.')
    }
  }

  function stopRecording(discard = false) {
    discardRef.current = discard
    clearInterval(timerRef.current)
    timerRef.current = null
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (orbInnerRef.current) orbInnerRef.current.style.transform = ''
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }

  function toggleRecording() {
    if (recording) {
      if (secondsRef.current < MIN_RECORDING_SECONDS) {
        stopRecording(true)
        setRecordedSeconds(0)
      } else {
        stopRecording(false)
      }
    } else {
      startRecording()
    }
  }

  async function transcribeBlob(blob) {
    setTranscribing(true)
    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Transcription failed')
      const text = (data.text || '').trim()
      onSave({ title: '', body: textToDoc(text), input_method: 'voice' })
    } catch (err) {
      setError(err.message || 'Something went wrong transcribing your recording.')
      setTranscribing(false)
      setRecordedSeconds(0)
    }
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      cancelAnimationFrame(rafRef.current)
      stopTracksAndAudio()
    }
  }, [])

  function handleGoHome() {
    if (recording) stopRecording(true)
    onGoHome()
  }

  function handleSave() {
    if (!canSave) return
    const body = editorRef.current?.getJSON()
    onSave({ title: title.trim(), body, input_method: 'typed' })
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: entryBackground, animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 'clamp(16px, 5vw, 26px) clamp(16px, 5vw, 48px)', borderBottom: entryHeaderBorder, boxSizing: 'border-box', fontFamily: "'Inter', sans-serif" }}>
        <button type="button" onClick={handleGoHome} style={{ background: 'none', border: 'none', fontSize: 20, color: entryChromeColor, cursor: 'pointer' }}>
          ←
        </button>
        <div style={{ display: 'flex', background: entryToggleBg, borderRadius: 999, padding: 4, gap: 4 }}>
          <button
            type="button"
            onClick={() => setEntryMode('writing')}
            style={{
              fontFamily: "'Inter', sans-serif",
              padding: 'clamp(7px, 2vw, 9px) clamp(12px, 3.5vw, 22px)',
              borderRadius: 999,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: isWriting ? '#FBF5EA' : 'transparent',
              color: isWriting ? '#3B4651' : 'rgba(59,70,81,0.5)',
            }}
          >
            Writing
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('speaking')}
            style={{
              fontFamily: "'Inter', sans-serif",
              padding: 'clamp(7px, 2vw, 9px) clamp(12px, 3.5vw, 22px)',
              borderRadius: 999,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: !isWriting ? '#FBF5EA' : 'transparent',
              color: !isWriting ? '#3B4651' : 'rgba(59,70,81,0.5)',
            }}
          >
            Speaking
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          style={{
            fontFamily: "'Inter', sans-serif",
            background: '#FBF5EA',
            color: '#3B4651',
            border: '1px solid rgba(59,70,81,0.1)',
            borderRadius: 999,
            padding: '9px 22px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            opacity: canSave ? 1 : 0.4,
            pointerEvents: canSave ? 'auto' : 'none',
          }}
        >
          Save
        </button>
      </div>

      {isWriting && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px, 6vw, 48px) clamp(16px, 6vw, 64px)', boxSizing: 'border-box', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '70%',
              minWidth: 'min(520px, 100%)',
              maxWidth: 900,
              margin: '0 auto',
              backgroundColor: '#F7F1E4',
              backgroundImage: PAPER_NOISE,
              backgroundSize: '200px 200px',
              borderRadius: 6,
              padding: 'clamp(24px, 6vw, 56px) clamp(20px, 6vw, 64px)',
              boxShadow: '0 10px 40px rgba(59,70,81,0.14), inset 0 0 0 1px rgba(59,70,81,0.04)',
              minHeight: 600,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, letterSpacing: 2, color: 'rgba(59,70,81,0.4)', marginBottom: 18 }}>
              {todayLabel}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: "'Lora', serif",
                fontWeight: 700,
                fontSize: 'clamp(26px, 7vw, 38px)',
                color: '#2C2620',
                marginBottom: 22,
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            <WritingEditor ref={editorRef} onContentChange={setBodyHasContent} />
          </div>
        </div>
      )}

      {!isWriting && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 38, padding: 'clamp(20px, 6vw, 48px)', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', width: 240, height: 240, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(59,70,81,0.18), inset 0 0 44px rgba(255,255,255,0.25)' }}>
            <div
              ref={orbInnerRef}
              style={{
                position: 'absolute',
                width: '190%',
                height: '190%',
                top: '-45%',
                left: '-45%',
                background,
                animation: recording ? 'none' : 'orbIdle 8s ease-in-out infinite',
              }}
            />
            {!transcribing && (
              <button
                type="button"
                onClick={toggleRecording}
                aria-label="Toggle recording"
                style={{
                  position: 'absolute',
                  inset: 0,
                  margin: 'auto',
                  width: 44,
                  height: 44,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'none',
                  color: entryBackground,
                  fontSize: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                {recording ? '❚❚' : '▶'}
              </button>
            )}
          </div>

          <div style={{ fontFamily: "'Lora', serif", fontSize: 24, fontWeight: 600, color: '#3B4651' }}>{formatSeconds(recordedSeconds)}</div>

          {transcribing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Inter', sans-serif", color: 'rgba(59,70,81,0.6)', fontSize: 14 }}>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(59,70,81,0.2)', borderTopColor: '#B46A4F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Transcribing...
            </div>
          )}

          {error && (
            <div style={{ fontFamily: "'Inter', sans-serif", color: '#C77B6E', fontSize: 13, maxWidth: 320, textAlign: 'center' }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
