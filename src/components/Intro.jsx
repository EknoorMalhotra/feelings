const NOISE_OVERLAY =
  "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iMiIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIvPjwvc3ZnPg==')"

// Ported from the HTML prototype's intro screen. The time-of-day preview
// buttons were intentionally dropped (design-time aid, not a real feature).
export default function Intro({ greeting, name, textColor, background, quote, onSkip }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background,
        overflow: 'hidden',
        animation: 'fadeUp 0.6s ease',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.16,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          backgroundImage: NOISE_OVERLAY,
        }}
      />

      <div style={{ position: 'absolute', top: 64, left: 80, right: 64, maxWidth: 760, zIndex: 1 }}>
        <div
          style={{
            fontFamily: "'Bodoni Moda', serif",
            fontWeight: 400,
            fontSize: 88,
            lineHeight: 1.02,
            color: textColor,
          }}
        >
          {greeting},
          <br />
          {name}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            fontSize: 17,
            color: textColor,
            opacity: 0.9,
            textAlign: 'center',
            maxWidth: 460,
            lineHeight: 1.6,
            padding: '0 40px',
            boxSizing: 'border-box',
          }}
        >
          {quote}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 56, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <button
          type="button"
          onClick={onSkip}
          aria-label="Check in"
          style={{
            background: 'none',
            border: 'none',
            color: textColor,
            fontSize: 26,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
            opacity: 0.85,
          }}
        >
          →
        </button>
      </div>
    </div>
  )
}
