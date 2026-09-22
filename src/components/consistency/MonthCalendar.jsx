import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dateKey, parseDateKey } from '../../utils/consistencyUtils'

// ============================================
// MonthCalendar — minimal monthly consistency grid.
// One small component reused by Progress (student) and
// StudentDetailPage (mentor). Not a calendar app: no events,
// no forms — just per-day status colors.
//
// props:
//   statusForKey(key) -> 'done' | 'partial' | 'missed' | 'future' | 'none'
//   monthOffsetStart  - initially displayed month (0 = this month)
//   compact           - smaller cells for sidebar use
// ============================================

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const CELL_CLASSES = {
  done: 'bg-primary text-white border-primary',
  partial: 'bg-primary-soft text-primary-dark border-primary-soft',
  missed: 'bg-white text-gray-300 border-gray-100',
  none: 'bg-white text-gray-400 border-gray-200',
  future: 'bg-gray-50 text-gray-300 border-gray-100',
}

export default function MonthCalendar({ statusForKey, monthOffsetStart = 0, compact = false }) {
  const today = dateKey()
  const [offset, setOffset] = useState(monthOffsetStart)

  const weeks = useMemo(() => {
    const base = new Date()
    base.setDate(1)
    base.setMonth(base.getMonth() + offset)
    const y = base.getFullYear()
    const m = base.getMonth()

    const first = new Date(y, m, 1)
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const lead = first.getDay() // Sunday = 0

    const cells = []
    for (let i = 0; i < lead; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(dateKey(new Date(y, m, d)))
    }
    while (cells.length % 7 !== 0) cells.push(null)

    const out = []
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
    return out
  }, [offset])

  const monthLabel = useMemo(() => {
    const base = new Date()
    base.setDate(1)
    base.setMonth(base.getMonth() + offset)
    return `${MONTHS[base.getMonth()]} ${base.getFullYear()}`
  }, [offset])

  const cellSize = compact ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[11px]'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-medium text-gray-700">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          title="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className={`grid grid-cols-7 gap-1 ${compact ? 'gap-[3px]' : 'gap-1'}`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className={`${cellSize} flex items-center justify-center text-[9px] text-gray-400 font-medium`}>
            {w}
          </div>
        ))}
        {weeks.flat().map((key, i) => {
          if (!key) return <div key={`pad-${i}`} className={cellSize} />
          const dayNum = parseDateKey(key).getDate()
          const isToday = key === today
          const status = statusForKey ? statusForKey(key) : 'none'
          return (
            <div
              key={key}
              title={`${key}${status === 'done' ? ' · active' : status === 'partial' ? ' · some activity' : ''}${isToday ? ' (today)' : ''}`}
              className={`${cellSize} flex items-center justify-center rounded-md border font-medium transition-colors ${CELL_CLASSES[status] || CELL_CLASSES.none} ${
                isToday && status !== 'done' ? 'ring-2 ring-primary/40' : ''
              }`}
            >
              {dayNum}
            </div>
          )
        })}
      </div>
    </div>
  )
}
