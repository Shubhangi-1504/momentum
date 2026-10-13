import { ClipboardList, Clock, Circle, CheckCircle2, ArrowRight, Inbox, Play, Target } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { STATUS_META, PRIORITY_META } from './focusMeta'

// ============================================
// TodaysFocus — real assignments due today from the Study Tracker.
// Status can be cycled live (pending → in_progress → completed),
// which writes through dbService.updateAssignment, same as Study Tracker.
// ============================================

export default function TodaysFocus({ tasks, loading, error, onCycleStatus }) {
  const navigate = useNavigate()

  return (
    <section className="nh-focus">
      <div className="nh-focus-head">
        <h3 className="nh-focus-title">
          <span className="nh-focus-iconbox">
            <ClipboardList />
          </span>
          Today's Focus
        </h3>
        <Link to="/student/study" className="nh-viewall">
          View All
          <ArrowRight />
        </Link>
      </div>

      {loading ? (
        <ul className="nh-focus-list">
          {[0, 1, 2].map((i) => (
            <li key={i} className="nh-skel nh-skel-row" />
          ))}
        </ul>
      ) : error ? (
        <div className="nh-error">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="nh-empty">
          <span className="nh-empty-box">
            <Inbox />
          </span>
          <div className="min-w-0">
            <p className="nh-empty-title">Nothing scheduled for today.</p>
            <p className="nh-empty-sub">You're all caught up.</p>
          </div>
        </div>
      ) : (
        <ul className="nh-focus-list">
          {tasks.map((t) => {
            const meta = STATUS_META[t.status] || STATUS_META.pending
            const statusKey =
              t.status === 'completed' || t.status === 'in_progress' ? t.status : 'pending'
            const prioKey = PRIORITY_META[t.priority] ? t.priority : 'medium'
            const pm = PRIORITY_META[prioKey]
            return (
              <li key={t.id} className="nh-task">
                {/* status cycle button — same semantics as Study Tracker's status change */}
                <button
                  type="button"
                  onClick={() => onCycleStatus(t)}
                  title={`Status: ${meta.label} — click to advance`}
                  aria-label={`Advance status of ${t.title}`}
                  className={`nh-status-btn nh-status-${statusKey}`}
                >
                  {t.status === 'completed' ? (
                    <CheckCircle2 className="nh-status-icon" />
                  ) : t.status === 'in_progress' ? (
                    <Clock className="nh-status-icon" />
                  ) : (
                    <Circle className="nh-status-icon" />
                  )}
                </button>

                <div className="nh-task-body">
                  <p className={`nh-task-title ${t.status === 'completed' ? 'nh-task-title--done' : ''}`}>
                    {t.title}
                  </p>
                  {t.description && <p className="nh-task-desc">{t.description}</p>}
                  {t.due_date && (
                    <p className="nh-task-when">
                      <Clock className="nh-task-clock" />
                      {new Date(t.due_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>

                <span className={`nh-chip nh-chip-${prioKey}`}>{pm.label}</span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Footer actions — same targets the old QuickActions used */}
      <div className="nh-footrow">
        <button type="button" onClick={() => navigate('/student/study')} className="nh-btn nh-btn--yellow">
          <Play />
          Start Studying
        </button>
        <button type="button" onClick={() => navigate('/student/habits')} className="nh-btn">
          <Target />
          Track Habit
        </button>
      </div>
    </section>
  )
}
