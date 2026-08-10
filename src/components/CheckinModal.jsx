import { MOODS } from '../lib/moods'

// Ported from the HTML prototype's check-in modal.
export default function CheckinModal({ name, selectedMood, onSelectMood, onConfirm, onClose }) {
  const hasSelectedMood = selectedMood != null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(59,70,81,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        animation: 'fadeUp 0.25s ease',
      }}
    >
      <div
        style={{
          width: 440,
          maxWidth: '90vw',
          background: '#FBF5EA',
          borderRadius: 26,
          padding: '16px 36px 36px',
          boxShadow: '0 30px 70px rgba(0,0,0,0.28)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: 'rgba(59,70,81,0.5)',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            letterSpacing: 2,
            color: 'rgba(59,70,81,0.5)',
            marginTop: -16,
          }}
        >
          {name}, how are you feeling?
        </div>

        <div style={{ display: 'flex', gap: 14, padding: '20px 0' }}>
          {MOODS.map((m) => {
            const selected = selectedMood === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onSelectMood(m.value)}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: selected ? `2px solid ${m.color}` : '2px solid rgba(59,70,81,0.25)',
                  background: selected ? m.color : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: selected ? 1 : 0.85,
                  transform: selected ? 'scale(1.3)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
              >
                <svg width="30" height="30" viewBox="0 0 64 64">
                  <path
                    d={m.iconPath}
                    fill="none"
                    stroke={selected ? '#FBF5EA' : 'rgba(59,70,81,0.4)'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          aria-label="Continue"
          disabled={!hasSelectedMood}
          style={{
            marginTop: 4,
            background: 'none',
            border: 'none',
            color: 'rgba(59,70,81,0.5)',
            fontSize: 26,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hasSelectedMood ? 1 : 0.4,
            pointerEvents: hasSelectedMood ? 'auto' : 'none',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
          }}
        >
          →
        </button>
      </div>
    </div>
  )
}
