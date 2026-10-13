import { MessageCircle, Star, Trophy } from 'lucide-react'
import '../../styles/neo-study.css'

// ============================================
// MomentumTrack — the "progress road" strip.
// Purely presentational: totals come from the parent's existing counts.
// ============================================

const MILESTONES = [25, 50, 75]

function trackMessage({ total, pct, overdue }) {
  if (total === 0) return 'Add your first assignment. Start the road.'
  if (pct === 100) return 'Inbox zero. Absolute legend.'
  if (overdue > 0) return `${overdue} overdue. Knock one out first.`
  if (pct < 50) return 'Small steps. Pick one and start.'
  return 'Past halfway. Keep it rolling.'
}

export default function MomentumTrack({ total, completed, overdue }) {
  const pct = total ? Math.round((completed / total) * 100) : 0
  const message = trackMessage({ total, pct, overdue })

  return (
    <section className="nt-track" aria-label="Progress road">
      <div className="nt-track-top">
        <p className="nt-track-msg">
          <MessageCircle className="nt-track-msg-icon" aria-hidden="true" />
          {message}
        </p>
        <span className="nt-track-pct">{pct}% there</span>
      </div>

      <div className="nt-road">
        <div className="nt-road-bar">
          <div className="nt-road-fill" style={{ width: `${pct}%` }} />
        </div>

        {MILESTONES.map((m) => (
          <span
            key={m}
            className={`nt-milestone ${pct >= m ? 'nt-milestone--hit' : ''}`}
            style={{ left: `${m}%` }}
          >
            <Star className="nt-milestone-icon" aria-hidden="true" />
          </span>
        ))}

        <span className={`nt-trophy ${pct === 100 && total > 0 ? 'nt-trophy--win' : ''}`}>
          <Trophy className="nt-trophy-icon" aria-hidden="true" />
        </span>

        <div className="nt-runner" style={{ '--pct': pct / 100 }}>
          <RunnerSvg />
        </div>
      </div>
    </section>
  )
}

function RunnerSvg() {
  return (
    <svg className="nt-runner-svg" viewBox="0 0 64 64" aria-hidden="true">
      <rect
        x="12" y="24" width="40" height="32" rx="10"
        fill="#fff" stroke="#111" strokeWidth="3" strokeLinejoin="round"
      />
      <circle cx="25" cy="42" r="2.8" fill="#111" />
      <circle cx="39" cy="42" r="2.8" fill="#111" />
      <path d="M28 48 Q32 52 36 48" fill="none" stroke="#111" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="19" cy="48" r="3" fill="#ff6b6b" />
      <circle cx="45" cy="48" r="3" fill="#ff6b6b" />
      <path d="M18 22 L18 30 Q32 36 46 30 L46 22Z" fill="#111" />
      <polygon points="32,8 60,19 32,30 4,19" fill="#111" />
      <line x1="56" y1="20" x2="56" y2="34" stroke="#ffd93d" strokeWidth="3" />
      <circle cx="56" cy="37" r="3" fill="#ffd93d" stroke="#111" strokeWidth="2" />
    </svg>
  )
}
