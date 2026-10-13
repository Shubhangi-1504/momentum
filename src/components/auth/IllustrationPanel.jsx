const TICKER_TEXT = 'SMALL STEPS ★ CONSISTENT PROGRESS ★ '.repeat(4)

export default function IllustrationPanel() {
  return (
    <div className="ln-illus">
      <svg
        className="ln-illus-svg"
        viewBox="0 0 300 380"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Study desk with a lamp, clock, plant and cat</title>

        {/* Dot texture */}
        <defs>
          <pattern id="ln-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="rgba(17,17,17,0.18)" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="300" height="380" fill="url(#ln-dots)" />

        {/* Big blue circle */}
        <circle cx="150" cy="170" r="108" className="o ln-f-a2" />

        {/* Lamp */}
        <line x1="150" y1="0" x2="150" y2="40" className="o" />
        <path d="M118 76 L182 76 L168 40 L132 40 Z" className="o ln-f-a1" />
        <circle cx="150" cy="84" r="7" className="o ln-f-w" />

        {/* Wall frame */}
        <rect x="44" y="96" width="42" height="54" rx="4" className="o ln-f-a1" />
        <rect x="52" y="104" width="26" height="38" rx="2" className="o ln-f-w" />
        <line x1="57" y1="116" x2="73" y2="116" className="o" />
        <line x1="57" y1="126" x2="70" y2="126" className="o" />

        {/* Wall clock */}
        <circle cx="236" cy="112" r="28" className="o ln-f-w" />
        <line x1="236" y1="112" x2="236" y2="96" className="o" />
        <line x1="236" y1="112" x2="236" y2="90" className="o ln-second" />
        <circle cx="236" cy="112" r="3" className="ln-f-k" />

        {/* Desk */}
        <rect x="34" y="262" width="232" height="16" rx="3" className="o ln-f-a3" />
        <rect x="46" y="278" width="14" height="70" className="o ln-f-a3" />
        <rect x="240" y="278" width="14" height="70" className="o ln-f-a3" />
        <rect x="68" y="278" width="62" height="46" rx="3" className="o ln-f-w" />
        <rect x="86" y="296" width="26" height="6" rx="3" className="o ln-f-p" />
        <rect x="170" y="278" width="62" height="46" rx="3" className="o ln-f-w" />
        <rect x="188" y="296" width="26" height="6" rx="3" className="o ln-f-p" />

        {/* Books on desk */}
        <rect x="58" y="246" width="44" height="16" rx="3" className="o ln-f-a1" />
        <rect x="62" y="231" width="38" height="15" rx="3" className="o ln-f-w" />
        <rect x="60" y="217" width="36" height="14" rx="3" className="o ln-f-a2" />

        {/* Plant */}
        <rect x="222" y="240" width="34" height="22" rx="3" className="o ln-f-a1" />
        <g className="ln-leaves">
          <ellipse cx="228" cy="218" rx="9" ry="22" fill="#6bcb77" transform="rotate(-26 228 218)" className="o" />
          <ellipse cx="250" cy="216" rx="9" ry="22" fill="#4fb85f" transform="rotate(24 250 216)" className="o" />
          <ellipse cx="239" cy="206" rx="8" ry="22" fill="#86dd91" className="o" />
        </g>

        {/* Cat mascot */}
        <g className="ln-cat">
          <polygon points="128,222 130,198 146,214" className="o ln-f-w" />
          <polygon points="172,222 170,198 154,214" className="o ln-f-w" />
          <rect x="124" y="212" width="52" height="48" rx="12" className="o ln-f-w" />
          <circle cx="141" cy="232" r="3" className="ln-f-k" />
          <circle cx="159" cy="232" r="3" className="ln-f-k" />
          <path d="M145 242 Q150 247 155 242" fill="none" className="o ln-mouth" />
          <circle cx="133" cy="240" r="3.5" className="ln-f-a1" />
          <circle cx="167" cy="240" r="3.5" className="ln-f-a1" />
        </g>

        {/* Floor line */}
        <line x1="26" y1="350" x2="274" y2="350" className="o" />

        {/* Spinning sparkles */}
        <path
          d="M36 196 l5 -12 l5 12 l12 5 l-12 5 l-5 12 l-5 -12 l-12 -5z"
          className="o ln-f-w ln-sparkle"
        />
        <path
          d="M262 266 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4z"
          className="o ln-f-a1 ln-sparkle"
        />
      </svg>

      {/* Decorative sticker (not real data) */}
      <div className="ln-sticker-b" aria-hidden="true">Day 12</div>

      {/* Ticker marquee */}
      <div className="ln-ticker" aria-hidden="true">
        <div className="ln-ticker-track">
          <span>{TICKER_TEXT}</span>
          <span>{TICKER_TEXT}</span>
        </div>
      </div>
    </div>
  )
}
