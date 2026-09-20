import { ClipboardList, Clock, Circle, CheckCircle2, ArrowRight, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import { STATUS_META, PRIORITY_META } from './focusMeta'

// ============================================
// TodaysFocus — real assignments due today from the Study Tracker.
// Status can be cycled live (pending → in_progress → completed),
// which writes through dbService.updateAssignment, same as Study Tracker.
// ============================================

export default function TodaysFocus({ tasks, loading, error, onCycleStatus }) {
  return (
    <section className="bg-white rounded-3xl border border-line shadow-sm p-6 md:p-7 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="flex items-center gap-2.5 text-lg font-bold text-gray-900">
          <span className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </span>
          Today's Focus
        </h3>
        <Link
          to="/student/study"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#4CAF50] hover:text-[#43A047] transition-colors"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-16 rounded-2xl bg-gray-50 animate-pulse" />
          ))}
        </ul>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-10 text-center">
          <span className="inline-flex w-14 h-14 rounded-full bg-[#F1F8E9] items-center justify-center mb-3">
            <Inbox className="w-7 h-7 text-[#81C784]" strokeWidth={1.5} />
          </span>
          <p className="font-semibold text-gray-800">Nothing scheduled for today.</p>
          <p className="text-sm text-gray-500 mt-1">You're all caught up.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => {
            const meta = STATUS_META[t.status] || STATUS_META.pending
            const pm = PRIORITY_META[t.priority] || PRIORITY_META.medium
            return (
              <li
                key={t.id}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3.5 hover:border-[#C8E6C9] hover:bg-[#FBFDFB] transition-colors duration-150"
              >
                {/* status cycle button — same semantics as Study Tracker's status change */}
                <button
                  type="button"
                  onClick={() => onCycleStatus(t)}
                  title={`Status: ${meta.label} — click to advance`}
                  aria-label={`Advance status of ${t.title}`}
                  className="shrink-0 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/30 rounded-full"
                >
                  {t.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#4CAF50]" />
                  ) : (
                    <Circle
                      className={`w-5 h-5 ${
                        t.status === 'in_progress' ? 'text-blue-500' : 'text-gray-300'
                      } group-hover:text-[#4CAF50] transition-colors`}
                    />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.description}</p>
                  )}
                  <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.classes}`}
                    >
                      {meta.label}
                    </span>
                    <span
                      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${pm.classes}`}
                    >
                      {pm.label}
                    </span>
                    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F1F8E9] text-[#33691E] border border-[#DCEDC8]">
                      Study
                    </span>
                  </div>
                  {t.due_date && (
                    <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1.5">
                      <Clock className="w-3 h-3" />
                      {new Date(t.due_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
