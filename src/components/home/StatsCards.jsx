import { useEffect, useRef, useState } from 'react'
import { BookOpen, Target, PenTool, TrendingUp } from 'lucide-react'

// ============================================
// StatsCards — four live metrics computed in StudentHome from
// real Supabase data (assignments, habit_logs, journal_entries).
// Numeric values count up with requestAnimationFrame once loading
// becomes false; the "0/4"-style habits value renders as-is.
// ============================================

const TILES = [
  { key: 'studySessions', icon: BookOpen, title: 'Study Sessions', sub: 'Due Today', tone: 'blue', numeric: true },
  { key: 'habitsCompleted', icon: Target, title: 'Habits Completed', sub: 'Today', tone: 'green', numeric: false },
  { key: 'journalThisWeek', icon: PenTool, title: 'Journal Entries', sub: 'This Week', tone: 'coral', numeric: true },
  { key: 'overallProgress', icon: TrendingUp, title: 'Overall Progress', sub: null, tone: 'white', numeric: true },
]

const NUMERIC_KEYS = ['studySessions', 'journalThisWeek', 'overallProgress']
const COUNT_DURATION = 600

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function StatsCards({ stats, loading, error }) {
  // null → render the real values directly (reduced motion / no animation)
  const [display, setDisplay] = useState(() =>
    prefersReducedMotion()
      ? null
      : { studySessions: 0, journalThisWeek: 0, overallProgress: 0 }
  )
  const displayRef = useRef(display)

  useEffect(() => {
    if (loading || error || !stats) return undefined
    if (prefersReducedMotion()) return undefined

    const targets = {
      studySessions: stats.studySessions,
      journalThisWeek: stats.journalThisWeek,
      overallProgress: stats.overallProgress,
    }
    const from =
      displayRef.current && NUMERIC_KEYS.every((k) => typeof displayRef.current[k] === 'number')
        ? displayRef.current
        : { studySessions: 0, journalThisWeek: 0, overallProgress: 0 }

    const start = performance.now()
    let rafId
    const tick = (now) => {
      const t = Math.min((now - start) / COUNT_DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = {}
      for (const key of NUMERIC_KEYS) {
        next[key] = Math.round(from[key] + (targets[key] - from[key]) * eased)
      }
      displayRef.current = next
      setDisplay(next)
      if (t < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [loading, error, stats])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TILES.map((t, i) => (
          <div key={t.title} className="nh-tile nh-tile--white" style={{ '--i': i }}>
            <div className="min-w-0 flex-1">
              <div className="nh-skel nh-skel-value" />
              <div className="nh-skel nh-skel-label" />
              <div className="nh-skel nh-skel-sub" />
            </div>
            <span className="nh-tile-icon" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="nh-error">{error}</div>
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {TILES.map((t, i) => {
        const Icon = t.icon
        const shown = t.numeric && display ? display[t.key] : stats[t.key]
        const value = t.key === 'overallProgress' ? `${shown}%` : String(shown)
        return (
          <div key={t.title} className={`nh-tile nh-tile--${t.tone}`} style={{ '--i': i }}>
            <div className="min-w-0 flex-1">
              <p className="nh-tile-value">{value}</p>
              <p className="nh-tile-label">{t.title}</p>
              {t.sub ? (
                <p className="nh-tile-sub">{t.sub}</p>
              ) : (
                <span className="nh-bar">
                  <span
                    className="nh-bar-fill"
                    style={{ width: `${Math.max(0, Math.min(100, stats.overallProgress))}%` }}
                  />
                </span>
              )}
            </div>
            <span className="nh-tile-icon">
              <Icon />
            </span>
          </div>
        )
      })}
    </div>
  )
}
