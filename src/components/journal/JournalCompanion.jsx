// ============================================
// JournalCompanion — the study-cat mascot (decorative SVG).
// Purely presentational; aria-hidden. All motion is CSS-only,
// defined in neo-journal.css and disabled under reduced motion.
//
// Props:
//   mood     — journal mood id (great|good|neutral|bad|terrible)
//   mode     — 'idle' | 'typing' | 'sleep'  (eyes + expression)
//   writing  — boolean: wiggle the pencil
//   size     — rendered width/height in px
//   sparkle  — boolean: show twinkling stars
// ============================================

export default function JournalCompanion({
  mood,
  mode = 'idle',
  writing = false,
  size = 96,
  sparkle = false,
}) {
  const eyes = mode === 'sleep' ? 'closed' : mode === 'typing' ? 'down' : 'open'
  const mouth =
    mode === 'sleep'
      ? 'flat'
      : mood === 'bad' || mood === 'terrible'
        ? 'frown'
        : mood === 'neutral'
          ? 'flat'
          : 'smile'
  const showRain = mood === 'bad' || mood === 'terrible'
  const showStars = mood === 'great' || sparkle
  const showZ = mode === 'sleep'

  return (
    <svg
      className="nj-cat"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ stroke: '#111', strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' }}
    >
      {/* tail */}
      <path
        className="nj-cat-tail"
        d="M26 88 q-18 2 -16 -14"
        fill="none"
        strokeWidth={3.5}
      />

      {/* torso + head */}
      <rect x={28} y={74} width={44} height={18} rx={9} fill="#ffffff" />
      <rect x={22} y={40} width={56} height={42} rx={13} fill="#ffffff" />

      {/* eyes */}
      {eyes === 'open' && (
        <g className="nj-cat-eyes">
          <circle cx={38} cy={58} r={3} fill="#111" stroke="none" />
          <circle cx={62} cy={58} r={3} fill="#111" stroke="none" />
        </g>
      )}
      {eyes === 'down' && (
        <g>
          <path d="M34 58 Q38 62 42 58" fill="none" strokeWidth={2.6} />
          <path d="M58 58 Q62 62 66 58" fill="none" strokeWidth={2.6} />
        </g>
      )}
      {eyes === 'closed' && (
        <g>
          <line x1={34} y1={59} x2={42} y2={59} strokeWidth={2.6} />
          <line x1={58} y1={59} x2={66} y2={59} strokeWidth={2.6} />
        </g>
      )}

      {/* mouth */}
      {mouth === 'smile' && (
        <path d="M44 67 Q50 72 56 67" fill="none" strokeWidth={2.4} />
      )}
      {mouth === 'flat' && (
        <path d="M45 68 L55 68" fill="none" strokeWidth={2.4} />
      )}
      {mouth === 'frown' && (
        <path d="M44 71 Q50 65 56 71" fill="none" strokeWidth={2.4} />
      )}

      {/* cheeks */}
      <circle cx={29} cy={67} r={3.6} fill="#ff6b6b" stroke="none" />
      <circle cx={71} cy={67} r={3.6} fill="#ff6b6b" stroke="none" />

      {/* graduation cap */}
      <path d="M30 36 L30 45 Q50 53 70 45 L70 36Z" fill="#111" />
      <polygon points="50,18 86,30 50,42 14,30" fill="#111" />
      <circle cx={50} cy={30} r={2.5} fill="#ffd93d" stroke="none" />
      <line x1={82} y1={31} x2={82} y2={48} stroke="#ffd93d" strokeWidth={3} />
      <circle cx={82} cy={51} r={3.5} fill="#ffd93d" strokeWidth={2} />

      {/* rain cloud (bad/terrible) */}
      {showRain && (
        <g className="nj-cat-rain">
          <path
            d="M62 18 q-8 0 -8 -7 q0 -7 8 -6 q3 -6 11 -3 q7 -1 9 6 q6 1 5 7 q-1 4 -6 4 Z"
            fill="#ffffff"
            strokeWidth={2.5}
          />
          <g className="nj-cat-drops" stroke="#4d96ff" strokeWidth={3}>
            <line x1={64} y1={24} x2={64} y2={30} />
            <line x1={72} y1={24} x2={72} y2={30} />
            <line x1={80} y1={24} x2={80} y2={30} />
          </g>
        </g>
      )}

      {/* twinkling stars (great / sparkle) */}
      {showStars && (
        <g>
          <g className="nj-cat-star">
            <path
              d="M88 36 L89.2 39.2 L92.5 40 L89.2 40.8 L88 44 L86.8 40.8 L83.5 40 L86.8 39.2 Z"
              fill="#ffd93d"
              stroke="none"
            />
          </g>
          <g className="nj-cat-star nj-cat-star--2">
            <path
              d="M8 40 L9.2 43.2 L12.5 44 L9.2 44.8 L8 48 L6.8 44.8 L3.5 44 L6.8 43.2 Z"
              fill="#ffffff"
              stroke="none"
            />
          </g>
        </g>
      )}

      {/* sleeping z's */}
      {showZ && (
        <g>
          <text className="nj-cat-z" x={72} y={40} fontSize={14} fill="#111">z</text>
          <text className="nj-cat-z nj-cat-z--2" x={84} y={30} fontSize={11} fill="#111">z</text>
        </g>
      )}

      {/* pencil in right paw */}
      <g
        className={`nj-cat-pencil ${writing ? '' : 'nj-cat-pencil--idle'}`}
        style={!writing ? { transform: 'rotate(-35deg)' } : undefined}
      >
        <rect x={64} y={80} width={26} height={6} rx={1.5} fill="#ffd93d" strokeWidth={2.2} />
        <polygon points="90,80 98,83 90,86" fill="#f1d4a8" strokeWidth={2.2} />
      </g>
      <circle cx={66} cy={84} r={6.5} fill="#ffffff" strokeWidth={2.6} />
    </svg>
  )
}
