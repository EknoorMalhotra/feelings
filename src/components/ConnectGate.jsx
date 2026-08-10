// Gates the app until Google Drive is connected — the HTML prototype has no
// equivalent screen since it only ever used fake in-memory data.
export default function ConnectGate({ status, error, onConnect }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#F3E8D6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: '#FBF5EA',
          borderRadius: 26,
          padding: 'clamp(28px, 8vw, 48px) clamp(24px, 8vw, 56px)',
          boxShadow: '0 30px 70px rgba(59,70,81,0.14)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          width: 'min(420px, 90vw)',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 34, fontWeight: 500, color: '#2C2620' }}>
          Feelings
        </div>
        <div style={{ fontSize: 14, color: 'rgba(59,70,81,0.65)', lineHeight: 1.6 }}>
          Your entries live in your own Google Drive — nowhere else. Connect once to get started.
        </div>
        {error && <div style={{ color: '#C77B6E', fontSize: 13 }}>{error}</div>}
        <button
          type="button"
          onClick={onConnect}
          disabled={status === 'connecting'}
          style={{
            marginTop: 12,
            background: '#3B4651',
            color: '#FBF5EA',
            border: 'none',
            borderRadius: 999,
            padding: '13px 28px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            opacity: status === 'connecting' ? 0.6 : 1,
          }}
        >
          {status === 'connecting' ? 'Connecting…' : 'Connect Google Drive'}
        </button>
      </div>
    </div>
  )
}
