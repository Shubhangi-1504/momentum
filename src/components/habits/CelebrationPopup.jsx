import { useEffect } from 'react'
import { Flame } from 'lucide-react'
import '../../styles/neo-habits.css'

// Cat-with-graduation-cap mascot (matches the login/home mascot family)
function Mascot() {
  return (
    <svg className="nh-celebrate-mascot" viewBox="0 0 64 64" aria-hidden="true">
      {/* body */}
      <rect x="12" y="24" width="40" height="32" rx="10" fill="#fff" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="25" cy="42" r="2.8" fill="#111" />
      <circle cx="39" cy="42" r="2.8" fill="#111" />
      {/* mouth */}
      <path d="M28 48 Q32 52 36 48" fill="none" stroke="#111" strokeWidth="2.4" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="19" cy="48" r="3" fill="#ff6b6b" />
      <circle cx="45" cy="48" r="3" fill="#ff6b6b" />
      {/* cap base */}
      <path d="M18 22 L18 30 Q32 36 46 30 L46 22Z" fill="#111" />
      {/* cap board */}
      <polygon points="32,8 60,19 32,30 4,19" fill="#111" />
      {/* tassel */}
      <line x1="56" y1="20" x2="56" y2="34" stroke="#ffd93d" strokeWidth="3" strokeLinecap="round" />
      <circle cx="56" cy="37" r="3" fill="#ffd93d" stroke="#111" strokeWidth="2" />
    </svg>
  )
}

// UI-only celebration popup. Renders nothing when `celebration` is null.
// Auto-dismisses after 3400ms; closes on click or Escape.
export default function CelebrationPopup({ celebration, onClose }) {
  useEffect(() => {
    if (!celebration) return
    const timer = window.setTimeout(() => onClose(), 3400)
    return () => window.clearTimeout(timer)
  }, [celebration, onClose])

  useEffect(() => {
    if (!celebration) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [celebration, onClose])

  if (!celebration) return null

  return (
    <div
      className="nh-celebrate"
      role="status"
      aria-live="polite"
      onClick={onClose}
    >
      <div className={`nh-celebrate-band nh-celebrate-band--${celebration.tone}`}>
        <Mascot />
        <Flame
          className="nh-celebrate-flame"
          style={{ width: celebration.flame, height: celebration.flame }}
          fill="currentColor"
        />
      </div>
      <h3 className="nh-celebrate-title">{celebration.title}</h3>
      <p className="nh-celebrate-line">{celebration.line}</p>
    </div>
  )
}
