// ============================================
// HeroMascot — decorative inline SVG for the student home hero.
// Purely decorative (aria-hidden), no data, static backdrop.
// ============================================

export default function HeroMascot() {
  return (
    <svg
      className="nh-mascot"
      viewBox="0 0 120 100"
      width="140"
      height="117"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Backdrop circle — static */}
      <circle cx="50" cy="52" r="44" fill="#4d96ff" className="nh-o" />

      {/* Cat body */}
      <rect x="26" y="38" width="48" height="42" rx="12" fill="#ffffff" className="nh-o" />
      <circle cx="41" cy="58" r="3" fill="#111111" />
      <circle cx="59" cy="58" r="3" fill="#111111" />
      <path d="M45 67 Q50 72 55 67" fill="none" className="nh-o nh-thin" />
      <circle cx="33" cy="66" r="3.5" fill="#ff6b6b" />
      <circle cx="67" cy="66" r="3.5" fill="#ff6b6b" />

      {/* Graduation cap */}
      <path d="M34 32 L34 42 Q50 49 66 42 L66 32 Z" fill="#111111" className="nh-o" />
      <polygon points="50,14 86,27 50,40 14,27" fill="#111111" className="nh-o" />
      <circle cx="50" cy="27" r="2.5" fill="#ffd93d" />

      {/* Tassel (swinging) */}
      <g className="nh-tassel">
        <line x1="84" y1="32" x2="84" y2="50" stroke="#ffd93d" strokeWidth="3" />
        <circle cx="84" cy="53" r="4" fill="#ffd93d" className="nh-tassel-dot" />
      </g>

      {/* Coffee mug */}
      <rect x="90" y="66" width="22" height="22" rx="4" fill="#ffffff" className="nh-o" />
      <path d="M112 71 h4 a5 5 0 0 1 0 10 h-4" fill="none" className="nh-o" />
      <rect x="93" y="70" width="16" height="5" fill="#ff6b6b" />

      {/* Steam (rising, staggered) */}
      <path d="M96 60 q-4 -5 0 -9" fill="none" className="nh-o nh-thin nh-steam" />
      <path d="M104 62 q-4 -5 0 -9" fill="none" className="nh-o nh-thin nh-steam nh-steam--2" />
    </svg>
  )
}
