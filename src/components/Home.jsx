import { useMemo, useState } from 'react'
import { MOODS, moodConfig } from '../lib/moods'
import { buildMonthBlocks } from '../lib/calendar'
import { entrySnippet, extractText } from '../lib/tiptapText'

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const INITIAL_MONTHS = 6
const MAX_MONTHS = 36
const LOAD_MORE_STEP = 3

// Ported from the HTML prototype's home screen (calendar feed + search).
export default function Home({
  entries,
  background,
  textColor,
  greeting,
  name,
  todayLabel,
  onOpenCheckin,
  showToast,
  toastMoodCfg,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [monthsShown, setMonthsShown] = useState(INITIAL_MONTHS)
  const [activeDayKey, setActiveDayKey] = useState(null)
  const [hoveredDayKey, setHoveredDayKey] = useState(null)

  const monthBlocks = useMemo(() => buildMonthBlocks(entries, monthsShown), [entries, monthsShown])

  const query = searchQuery.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!query) return []
    return entries
      .filter((e) => {
        const title = (e.title || '').toLowerCase()
        const body = extractText(e.body).toLowerCase()
        return title.includes(query) || body.includes(query)
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8)
      .map((e) => ({
        entry: e,
        dateLabel: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))
  }, [entries, query])
  const showSearchResults = query.length > 0
  const noSearchResults = showSearchResults && searchResults.length === 0

  const pendingSyncCount = entries.filter((e) => e.syncStatus === 'pending').length

  const activeDayEntries = activeDayKey
    ? entries
        .filter((e) => e.day === activeDayKey)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    : []

  function handleScroll(e) {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 500) {
      setMonthsShown((m) => Math.min(m + LOAD_MORE_STEP, MAX_MONTHS))
    }
  }

  const homeTextColorMuted = textColor + 'B3'
  const homeTextColorFaint = textColor + '80'

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        onScroll={handleScroll}
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          padding: 'clamp(20px, 6vw, 48px) clamp(16px, 6vw, 64px) 140px',
          boxSizing: 'border-box',
          animation: 'fadeUp 0.5s ease',
          background,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 28,
            flexWrap: 'wrap',
            marginBottom: 14,
            maxWidth: 1360,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 4, color: homeTextColorFaint }}>
              FEELINGS
            </div>
            <div style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(26px, 7vw, 36px)', fontWeight: 500, marginTop: 14, color: textColor }}>
              {greeting}, {name}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: homeTextColorMuted, marginTop: 6 }}>
              {todayLabel}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#FBF5EA',
                border: '1px solid rgba(59,70,81,0.1)',
                borderRadius: 999,
                padding: '13px 20px',
                width: 'min(280px, 100%)',
                boxSizing: 'border-box',
                boxShadow: '0 2px 10px rgba(59,70,81,0.05)',
              }}
            >
              <div style={{ width: 13, height: 13, border: '1.6px solid rgba(59,70,81,0.4)', borderRadius: '50%', position: 'relative', flex: 'none' }}>
                <div style={{ position: 'absolute', width: 6, height: 1.6, background: 'rgba(59,70,81,0.4)', transform: 'rotate(45deg)', bottom: -4, right: -4 }} />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#3B4651', flex: 1, minWidth: 0 }}
              />
            </div>

            {showSearchResults && (
              <div
                style={{
                  position: 'absolute',
                  top: 56,
                  right: 0,
                  width: 'min(320px, 90vw)',
                  background: '#FBF5EA',
                  borderRadius: 16,
                  boxShadow: '0 16px 40px rgba(59,70,81,0.18)',
                  padding: 8,
                  zIndex: 5,
                  maxHeight: 340,
                  overflowY: 'auto',
                  boxSizing: 'border-box',
                }}
              >
                {searchResults.map(({ entry, dateLabel }) => {
                  const cfg = moodConfig(entry.mood)
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setActiveDayKey(entry.day)
                        setSearchQuery('')
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '10px 12px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: cfg?.color ?? 'rgba(59,70,81,0.2)', flex: 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2620', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.title || 'Untitled entry'}
                        </div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(59,70,81,0.5)', marginTop: 2 }}>{dateLabel}</div>
                      </div>
                    </button>
                  )
                })}
                {noSearchResults && (
                  <div style={{ padding: '18px 12px', fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(59,70,81,0.5)', textAlign: 'center' }}>
                    No entries found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 22, flexWrap: 'wrap', maxWidth: 1360, margin: '0 auto 32px' }}>
          {MOODS.map((m) => (
            <div key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: homeTextColorMuted }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: m.color }} />
              {m.label}
            </div>
          ))}
        </div>

        {activeDayEntries.length > 0 && (
          <div style={{ maxWidth: 1360, margin: '0 auto 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeDayEntries.map((entry) => {
              const cfg = moodConfig(entry.mood)
              return (
                <div
                  key={entry.id}
                  style={{
                    background: '#FBF5EA',
                    borderRadius: 18,
                    padding: 'clamp(16px, 5vw, 22px) clamp(18px, 6vw, 30px)',
                    boxShadow: '0 2px 16px rgba(59,70,81,0.06)',
                    animation: 'fadeUp 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: cfg?.color ?? 'rgba(59,70,81,0.2)', flex: 'none' }} />
                    <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 500, fontSize: 19 }}>{entry.title || 'Untitled entry'}</div>
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(59,70,81,0.6)', marginTop: 8, lineHeight: 1.5 }}>
                    {entrySnippet(entry)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {entries.length === 0 ? (
          <div
            style={{
              maxWidth: 640,
              margin: '48px auto 0',
              background: '#FBF5EA',
              border: '1px solid rgba(59,70,81,0.08)',
              borderRadius: 22,
              padding: 'clamp(32px, 10vw, 64px) clamp(20px, 6vw, 40px)',
              textAlign: 'center',
              boxShadow: '0 2px 20px rgba(59,70,81,0.06)',
              boxSizing: 'border-box',
              animation: 'fadeUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
              {MOODS.map((m) => (
                <div key={m.value} style={{ width: 12, height: 12, borderRadius: '50%', background: m.color }} />
              ))}
            </div>
            <div style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 24, fontWeight: 500, color: '#2C2620' }}>
              Nothing here yet
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'rgba(59,70,81,0.6)', marginTop: 10, lineHeight: 1.6 }}>
              Tap the + button below whenever a feeling's worth writing down.
            </div>
          </div>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, maxWidth: 1360, margin: '0 auto' }}>
          {monthBlocks.map((mb) => (
            <div
              key={mb.label}
              style={{
                background: '#FBF5EA',
                border: '1px solid rgba(59,70,81,0.08)',
                borderRadius: 22,
                padding: '24px 26px 28px',
                boxShadow: '0 2px 20px rgba(59,70,81,0.06)',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 20, fontFamily: "'Inter', sans-serif", fontSize: 14, letterSpacing: 0.3, fontWeight: 600 }}>
                {mb.label}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 6 }}>
                {WEEKDAYS.map((wd) => (
                  <div key={wd} style={{ textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 9.5, letterSpacing: 0.5, color: 'rgba(59,70,81,0.4)', fontWeight: 600 }}>
                    {wd}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                {mb.cells.map((cell, i) => {
                  if (!cell) return <div key={i} />
                  const showTooltip = !!cell.latest && hoveredDayKey === cell.key
                  const extraCount = cell.dayEntries.length - 1
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setActiveDayKey((k) => (k === cell.key ? null : cell.key))}
                      onMouseEnter={() => cell.latest && setHoveredDayKey(cell.key)}
                      onMouseLeave={() => setHoveredDayKey(null)}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        border: 'none',
                        background: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        padding: 2,
                        boxSizing: 'border-box',
                      }}
                    >
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: cell.isToday ? '#A9503A' : 'rgba(59,70,81,0.55)', fontWeight: cell.isToday ? 700 : 400 }}>
                        {cell.day}
                      </span>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: cell.moodCfg ? cell.moodCfg.color : 'rgba(59,70,81,0.12)',
                          boxShadow: cell.isToday ? '0 0 0 3px rgba(169,80,58,0.2)' : 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      {showTooltip && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#2C2620',
                            color: '#FBF5EA',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 11,
                            fontWeight: 500,
                            padding: '6px 12px',
                            borderRadius: 8,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
                            pointerEvents: 'none',
                            zIndex: 6,
                          }}
                        >
                          {cell.latest.title || 'Untitled entry'}
                          {extraCount > 0 && ` +${extraCount} more`}
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 0,
                              height: 0,
                              borderLeft: '5px solid transparent',
                              borderRight: '5px solid transparent',
                              borderTop: '5px solid #2C2620',
                            }}
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {showToast && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#2C2620',
            color: '#FBF5EA',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            padding: '12px 20px',
            borderRadius: 999,
            boxShadow: '0 14px 32px rgba(0,0,0,0.28)',
            animation: 'fadeUp 0.3s ease',
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: toastMoodCfg?.color ?? '#D9A02E', flexShrink: 0 }} />
          Feelings acknowledged!
        </div>
      )}

      {pendingSyncCount > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 56,
            bottom: 56,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FBF5EA',
            border: '1px solid rgba(59,70,81,0.1)',
            borderRadius: 999,
            padding: '10px 16px',
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(59,70,81,0.6)',
            boxShadow: '0 2px 10px rgba(59,70,81,0.08)',
            animation: 'fadeUp 0.3s ease',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              border: '2px solid rgba(59,70,81,0.2)',
              borderTopColor: '#B46A4F',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Syncing to Drive…
        </div>
      )}

      <button
        type="button"
        onClick={onOpenCheckin}
        aria-label="New entry"
        style={{
          position: 'absolute',
          right: 56,
          bottom: 56,
          zIndex: 10,
          width: 62,
          height: 62,
          borderRadius: '50%',
          background,
          border: '2px solid #FBF5EA',
          color: '#FBF5EA',
          fontSize: 26,
          fontWeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          lineHeight: 1,
          transition: 'transform 0.2s ease',
        }}
      >
        +
      </button>
    </div>
  )
}
