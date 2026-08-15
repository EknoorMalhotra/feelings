import { useEffect, useRef, useState } from 'react'
import '../styles/animations.css'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { useEntries } from '../hooks/useEntries'
import { getTimeKeyForHour, getTimeConfig } from '../lib/timeConfig'
import { getRandomQuote } from '../lib/quotes'
import { moodConfig } from '../lib/moods'
import ConnectGate from '../components/ConnectGate'
import Intro from '../components/Intro'
import Home from '../components/Home'
import CheckinModal from '../components/CheckinModal'
import Entry from '../components/Entry'

const USER_NAME = 'Eknoor'
const INTRO_AUTO_ADVANCE_MS = 10000
const TOAST_DURATION_MS = 2600

export default function JournalApp() {
  const auth = useGoogleAuth()
  const { entries, addEntry, updateEntry, deleteEntry } = useEntries()

  const [screen, setScreen] = useState('intro')
  const [selectedMood, setSelectedMood] = useState(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMoodValue, setToastMoodValue] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)

  const introTimerRef = useRef(null)
  const toastTimerRef = useRef(null)

  const now = new Date()
  const timeKey = getTimeKeyForHour(now.getHours())
  const timeCfg = getTimeConfig(timeKey)
  const [quote] = useState(() => getRandomQuote(timeKey))
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    if (auth.status !== 'connected') return undefined
    introTimerRef.current = setTimeout(() => {
      setScreen((s) => (s === 'intro' ? 'home' : s))
    }, INTRO_AUTO_ADVANCE_MS)
    return () => clearTimeout(introTimerRef.current)
  }, [auth.status])

  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  if (auth.status !== 'connected') {
    return <ConnectGate status={auth.status} error={auth.error} onConnect={auth.connect} />
  }

  function skipIntro() {
    clearTimeout(introTimerRef.current)
    setScreen('home')
  }

  function openCheckin() {
    setSelectedMood(null)
    setEditingEntry(null)
    setScreen('checkin')
  }

  function closeCheckin() {
    setScreen('home')
  }

  function confirmMood() {
    setScreen('entry')
  }

  function openEntry(entry) {
    setEditingEntry(entry)
    setScreen('entry')
  }

  function goHome() {
    setEditingEntry(null)
    setScreen('home')
  }

  async function handleSaveEntry({ title, body, input_method }) {
    if (editingEntry) {
      await updateEntry(editingEntry.id, { title, body })
      setEditingEntry(null)
      setScreen('home')
      return
    }

    const mood = selectedMood ?? 2
    await addEntry({ title, body, mood, tags: [], input_method })
    setScreen('home')
    setSelectedMood(null)
    setToastMoodValue(mood)
    setShowToast(true)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShowToast(false), TOAST_DURATION_MS)
  }

  async function handleDeleteEntry(entry) {
    await deleteEntry(entry.id)
    setEditingEntry(null)
    setScreen('home')
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        minHeight: 700,
        overflow: 'hidden',
        background: '#F3E8D6',
        fontFamily: "'Work Sans', sans-serif",
        color: '#3B4651',
        boxSizing: 'border-box',
      }}
    >
      {screen === 'intro' && (
        <Intro
          greeting={timeCfg.greeting}
          name={USER_NAME}
          textColor={timeCfg.textColor}
          background={timeCfg.background}
          quote={quote}
          onSkip={skipIntro}
        />
      )}

      {(screen === 'home' || screen === 'checkin') && (
        <Home
          entries={entries}
          background={timeCfg.background}
          textColor={timeCfg.textColor}
          greeting={timeCfg.greeting}
          name={USER_NAME}
          todayLabel={todayLabel}
          onOpenCheckin={openCheckin}
          onOpenEntry={openEntry}
          showToast={screen === 'home' && showToast}
          toastMoodCfg={moodConfig(toastMoodValue)}
        />
      )}

      {screen === 'checkin' && (
        <CheckinModal
          name={USER_NAME}
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
          onConfirm={confirmMood}
          onClose={closeCheckin}
        />
      )}

      {screen === 'entry' && (
        <Entry
          background={timeCfg.background}
          todayLabel={todayLabel}
          onGoHome={goHome}
          onSave={handleSaveEntry}
          entry={editingEntry}
          onDelete={handleDeleteEntry}
        />
      )}
    </div>
  )
}
