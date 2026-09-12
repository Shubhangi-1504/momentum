export default function IllustrationPanel() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F0FAF0] via-[#F7FCF7] to-[#FFF8F0] relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute top-[-80px] right-[-80px] w-80 h-80 bg-[#C8E6C9] rounded-full opacity-30 blur-3xl" />
      <div className="absolute bottom-[-60px] left-[-40px] w-64 h-64 bg-[#FFF3E0] rounded-full opacity-40 blur-3xl" />
      <div className="absolute top-1/3 left-1/4 w-40 h-40 bg-[#FFF9C4] rounded-full opacity-25 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[#E8F5E9] rounded-full opacity-35 blur-2xl" />

      <div className="relative z-10 flex flex-col items-center px-8 max-w-xl">
        {/* Main illustration SVG — study desk scene */}
        <svg
          viewBox="0 0 560 420"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full mb-8 drop-shadow-md"
        >
          {/* === DESK SURFACE === */}
          <rect x="40" y="290" width="480" height="18" rx="9" fill="#D7CCC8" />
          <rect x="65" y="308" width="22" height="80" rx="5" fill="#BCAAA4" />
          <rect x="473" y="308" width="22" height="80" rx="5" fill="#BCAAA4" />
          {/* Desk surface highlight */}
          <rect x="40" y="290" width="480" height="6" rx="3" fill="#EFEBE9" opacity="0.5" />

          {/* === MONITOR === */}
          <rect x="160" y="120" width="240" height="170" rx="14" fill="#37474F" />
          <rect x="168" y="128" width="224" height="146" rx="6" fill="#E8F5E9" />

          {/* Screen header bar */}
          <rect x="168" y="128" width="224" height="18" rx="6" fill="#C8E6C9" />
          <circle cx="182" cy="137" r="3.5" fill="#EF5350" opacity="0.7" />
          <circle cx="194" cy="137" r="3.5" fill="#FFA726" opacity="0.7" />
          <circle cx="206" cy="137" r="3.5" fill="#66BB6A" opacity="0.7" />

          {/* Chart bars on screen */}
          <rect x="190" y="232" width="24" height="32" rx="4" fill="#81C784" />
          <rect x="222" y="218" width="24" height="46" rx="4" fill="#42A5F5" />
          <rect x="254" y="200" width="24" height="64" rx="4" fill="#FFA726" />
          <rect x="286" y="186" width="24" height="78" rx="4" fill="#AB47BC" />
          <rect x="318" y="210" width="24" height="54" rx="4" fill="#26C6DA" />
          <rect x="350" y="196" width="24" height="68" rx="4" fill="#66BB6A" />

          {/* Trend line on screen */}
          <polyline
            points="202,240 234,226 266,208 298,194 330,218 362,204"
            stroke="#EF5350"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="202" cy="240" r="3.5" fill="#EF5350" />
          <circle cx="234" cy="226" r="3.5" fill="#EF5350" />
          <circle cx="266" cy="208" r="3.5" fill="#EF5350" />
          <circle cx="298" cy="194" r="3.5" fill="#EF5350" />
          <circle cx="330" cy="218" r="3.5" fill="#EF5350" />
          <circle cx="362" cy="204" r="3.5" fill="#EF5350" />

          {/* Monitor stand */}
          <rect x="255" y="290" width="50" height="10" rx="3" fill="#455A64" />
          <rect x="230" y="298" width="100" height="8" rx="4" fill="#546E7A" />

          {/* === BOOK STACK (left) === */}
          <rect x="55" y="242" width="72" height="16" rx="4" fill="#FF8A65" />
          <rect x="60" y="226" width="67" height="16" rx="4" fill="#81C784" />
          <rect x="57" y="210" width="70" height="16" rx="4" fill="#64B5F6" />
          <rect x="63" y="194" width="64" height="16" rx="4" fill="#FFD54F" />
          {/* Book spines */}
          <rect x="55" y="242" width="4" height="16" rx="2" fill="#E64A19" opacity="0.4" />
          <rect x="60" y="226" width="4" height="16" rx="2" fill="#2E7D32" opacity="0.4" />
          <rect x="57" y="210" width="4" height="16" rx="2" fill="#1565C0" opacity="0.4" />

          {/* === NOTEBOOK (right side on desk) === */}
          <rect x="400" y="258" width="65" height="32" rx="4" fill="#FFF9C4" />
          <rect x="400" y="258" width="65" height="32" rx="4" stroke="#F9A825" strokeWidth="1" opacity="0.3" />
          {/* Notebook lines */}
          <line x1="410" y1="268" x2="455" y2="268" stroke="#F9A825" strokeWidth="1" opacity="0.3" />
          <line x1="410" y1="276" x2="450" y2="276" stroke="#F9A825" strokeWidth="1" opacity="0.3" />
          <line x1="410" y1="284" x2="440" y2="284" stroke="#F9A825" strokeWidth="1" opacity="0.3" />

          {/* === PENCIL (on notebook) === */}
          <rect x="430" y="250" width="5" height="28" rx="1.5" fill="#FFD54F" transform="rotate(-15, 432, 264)" />
          <polygon points="428,278 430.5,287 433,278" fill="#FFE0B2" transform="rotate(-15, 430, 282)" />
          <rect x="430" y="248" width="5" height="5" rx="1.5" fill="#EF5350" transform="rotate(-15, 432, 250)" />

          {/* === COFFEE MUG (right) === */}
          <rect x="490" y="248" width="34" height="36" rx="6" fill="#8D6E63" />
          <rect x="494" y="252" width="26" height="28" rx="4" fill="#A1887F" />
          {/* Coffee inside */}
          <rect x="494" y="260" width="26" height="20" rx="4" fill="#6D4C41" opacity="0.3" />
          {/* Mug handle */}
          <path d="M524 258 C534 258, 534 278, 524 278" stroke="#8D6E63" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Steam */}
          <path d="M500 242 Q503 232 506 242" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M509 238 Q512 228 515 238" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
          <path d="M514 244 Q517 234 520 244" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />

          {/* === PLANT (right corner) === */}
          <rect x="496" y="280" width="20" height="24" rx="5" fill="#A5D6A7" />
          <circle cx="506" cy="268" r="16" fill="#66BB6A" />
          <circle cx="497" cy="262" r="11" fill="#81C784" />
          <circle cx="515" cy="264" r="12" fill="#4CAF50" />
          <circle cx="506" cy="255" r="8" fill="#A5D6A7" />
          <rect x="504" y="272" width="4" height="10" rx="1" fill="#795548" />

          {/* === FLOATING ELEMENTS === */}

          {/* Sticky note (top left) */}
          <g opacity="0.9">
            <rect x="60" y="100" width="56" height="56" rx="5" fill="#FFF9C4" transform="rotate(-6, 88, 128)" />
            <line x1="72" y1="116" x2="106" y2="116" stroke="#F9A825" strokeWidth="1.5" opacity="0.35" transform="rotate(-6, 88, 128)" />
            <line x1="72" y1="126" x2="100" y2="126" stroke="#F9A825" strokeWidth="1.5" opacity="0.35" transform="rotate(-6, 88, 128)" />
            <line x1="72" y1="136" x2="104" y2="136" stroke="#F9A825" strokeWidth="1.5" opacity="0.35" transform="rotate(-6, 88, 128)" />
          </g>

          {/* Sticky note (top right) */}
          <g opacity="0.85">
            <rect x="420" y="90" width="52" height="52" rx="5" fill="#C8E6C9" transform="rotate(4, 446, 116)" />
            <line x1="432" y1="106" x2="462" y2="106" stroke="#66BB6A" strokeWidth="1.5" opacity="0.35" transform="rotate(4, 446, 116)" />
            <line x1="432" y1="116" x2="458" y2="116" stroke="#66BB6A" strokeWidth="1.5" opacity="0.35" transform="rotate(4, 446, 116)" />
            <line x1="432" y1="126" x2="460" y2="126" stroke="#66BB6A" strokeWidth="1.5" opacity="0.35" transform="rotate(4, 446, 116)" />
          </g>

          {/* Checkmark badge */}
          <g transform="translate(130, 105)" opacity="0.85">
            <circle cx="0" cy="0" r="20" fill="#E8F5E9" stroke="#66BB6A" strokeWidth="2.5" />
            <polyline points="-8,0 -2.5,6 9,-7" stroke="#66BB6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>

          {/* Star badge */}
          <g transform="translate(460, 170)" opacity="0.75">
            <circle cx="0" cy="0" r="16" fill="#FFF3E0" stroke="#FFA726" strokeWidth="2" />
            <polygon
              points="0,-9 2.7,-3 9,-3 4,1.3 5.8,7.5 0,4 -5.8,7.5 -4,1.3 -9,-3 -2.7,-3"
              fill="#FFA726"
            />
          </g>

          {/* Clock badge */}
          <g transform="translate(500, 130)" opacity="0.65">
            <circle cx="0" cy="0" r="14" fill="#E3F2FD" stroke="#42A5F5" strokeWidth="2" />
            <line x1="0" y1="0" x2="0" y2="-7" stroke="#42A5F5" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="0" x2="5" y2="2" stroke="#42A5F5" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="0" r="1.5" fill="#42A5F5" />
          </g>

          {/* Target/habit badge */}
          <g transform="translate(90, 165)" opacity="0.6">
            <circle cx="0" cy="0" r="13" fill="#FCE4EC" stroke="#EF5350" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="7" stroke="#EF5350" strokeWidth="1.5" fill="none" />
            <circle cx="0" cy="0" r="3" fill="#EF5350" />
          </g>

          {/* Small floating dots */}
          <circle cx="160" cy="80" r="3" fill="#A5D6A7" opacity="0.5" />
          <circle cx="400" cy="60" r="4" fill="#FFCC80" opacity="0.4" />
          <circle cx="520" cy="200" r="3" fill="#90CAF9" opacity="0.45" />
          <circle cx="70" cy="280" r="2.5" fill="#CE93D8" opacity="0.35" />
        </svg>

        {/* Motivational text */}
        <div className="text-center mt-2">
          <p className="text-3xl font-bold text-gray-800 mb-2 tracking-tight">
            Small steps.
          </p>
          <p className="text-xl text-gray-500 font-medium">
            Consistent progress.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {[
            { label: 'Track Habits', color: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]' },
            { label: 'Stay Focused', color: 'bg-[#FFF8E1] text-[#F57F17] border-[#FFE082]' },
            { label: 'Grow Daily', color: 'bg-[#E3F2FD] text-[#1565C0] border-[#90CAF9]' },
          ].map((item) => (
            <span
              key={item.label}
              className={`px-5 py-2 ${item.color} text-sm font-semibold rounded-full border shadow-sm`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
