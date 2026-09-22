import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import MonthCalendar from '../../components/consistency/MonthCalendar'
import {
  dateKey,
  isoToKey,
  overallConsistency,
  dueCountdown,
  COUNTDOWN_META,
  daysBetweenKeys,
} from '../../utils/consistencyUtils'
import {
  BarChart3,
  Flame,
  Trophy,
  CalendarCheck,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Sprout,
} from 'lucide-react'

// ============================================
// Progress — real consistency data only (no estimates):
//   streaks / active days come from actual habit completions and
//   assignment completions; the month calendar paints exactly those
//   dates. Tracking starts at the student's tracking_start_date.
// ============================================

export default function StudentProgress() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [consistency, setConsistency] = useState(null) // RPC snapshot
  const [assignments, setAssignments] = useState([])
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([]) // real per-habit completion rows

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!profile?.id) return
      const { data: student, error: stErr } = await dbService.getStudentByProfileId(profile.id)
      if (stErr) throw stErr
      if (!student) throw new Error('Student record not found.')

      const [consRes, asgRes, habRes, logRes] = await Promise.all([
        dbService.getMyConsistency(),
        dbService.getAssignments(student.id),
        dbService.getHabits(student.id),
        dbService.getStudentHabitLogs(student.id),
      ])
      if (asgRes.error) throw asgRes.error
      if (habRes.error) throw habRes.error
      if (logRes.error) throw logRes.error

      // RPC snapshot is preferred, but if the RPC is unavailable/errored
      // we derive the exact same snapshot client-side from the rows we
      // already fetched — the page never hard-fails on it.
      if (!consRes.error && consRes.data?.ok) {
        setConsistency(consRes.data)
      } else {
        if (consRes.error) console.warn('get_my_consistency unavailable, deriving client-side:', consRes.error.message)
        setConsistency({
          ok: true,
          tracking_start_date: student.tracking_start_date || null,
          habit_completion_dates: [
            ...new Set((logRes.data || []).filter((l) => l.completed).map((l) => l.log_date)),
          ],
          assignment_completion_dates: [
            ...new Set(
              (asgRes.data || [])
                .filter((a) => a.status === 'completed' && a.completed_at)
                .map((a) => isoToKey(a.completed_at))
                .filter(Boolean)
            ),
          ],
        })
      }

      setAssignments(asgRes.data || [])
      setHabits(habRes.data || [])
      setHabitLogs(logRes.data || [])
    } catch (err) {
      console.error('Failed to load progress:', err)
      setError(err.message || 'Could not load your progress.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    const t = window.setTimeout(() => {
      load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const stats = useMemo(() => {
    const today = dateKey()
    const habitDates = (consistency?.habit_completion_dates || [])
    const assignDates = (consistency?.assignment_completion_dates || [])
    const startKey = consistency?.tracking_start_date || today

    const overall = overallConsistency(habitDates, assignDates, startKey, today)

    // Assignments (calendar-date semantics)
    const completed = assignments.filter((a) => a.status === 'completed').length
    const pending = assignments.filter(
      (a) => a.status !== 'completed' && a.due_date && isoToKey(a.due_date) >= today
    ).length
    const overdue = assignments.filter(
      (a) => a.status !== 'completed' && a.due_date && isoToKey(a.due_date) < today
    ).length

    // Upcoming deadlines (nearest 3)
    const upcoming = assignments
      .filter((a) => a.status !== 'completed' && a.due_date)
      .map((a) => ({ a, cd: dueCountdown({ dueKey: isoToKey(a.due_date), completed: false, todayK: today }) }))
      .filter((x) => x.cd.state !== 'overdue')
      .sort((x, z) => x.cd.days - z.cd.days)
      .slice(0, 3)

    return { overall, completed, pending, overdue, upcoming }
  }, [consistency, assignments])

  // Calendar status: real activity dates only.
  // done = active day (habit or assignment completed)
  // missed = past tracked day with no activity
  // future = after today
  const activeSet = useMemo(() => {
    return new Set([
      ...(consistency?.habit_completion_dates || []),
      ...(consistency?.assignment_completion_dates || []),
    ])
  }, [consistency])

  const startKey = consistency?.tracking_start_date || dateKey()

  function calendarStatus(key) {
    const today = dateKey()
    if (key > today) return 'future'
    if (key < startKey) return 'none'
    if (activeSet.has(key)) return 'done'
    return 'missed'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="h-9 w-40 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-white rounded-xl border border-gray-100 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Header />
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Something went wrong</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const { overall } = stats

  return (
    <div className="max-w-6xl mx-auto">
      <Header />

      {/* Consistency overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={`${overall.currentStreak} day${overall.currentStreak === 1 ? '' : 's'}`}
          tone="text-orange-600 bg-orange-50"
        />
        <StatCard
          icon={Trophy}
          label="Longest Streak"
          value={`${overall.longestStreak} day${overall.longestStreak === 1 ? '' : 's'}`}
          tone="text-amber-700 bg-amber-50"
        />
        <StatCard
          icon={CalendarCheck}
          label="Study Days"
          value={`${overall.activeDays} / ${overall.totalDays}`}
          tone="text-blue-700 bg-blue-50"
        />
        <StatCard
          icon={BarChart3}
          label="Overall Consistency"
          value={`${overall.overallPct}%`}
          tone="text-green-700 bg-green-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-6">
        {/* Monthly consistency calendar */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Consistency</h2>
          </div>
          <MonthCalendar compact statusForKey={calendarStatus} />
          <p className="text-[11px] text-gray-400 mt-3">
            Tracking since {startKey}. Green = active day (habit or task completed).
          </p>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Assignments breakdown */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Assignments</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={CheckCircle2} label="Completed" value={stats.completed} tone="text-green-700 bg-green-50" />
              <MiniStat icon={Clock} label="Pending" value={stats.pending} tone="text-amber-700 bg-amber-50" />
              <MiniStat icon={AlertCircle} label="Overdue" value={stats.overdue} tone="text-red-700 bg-red-50" />
            </div>

            {stats.upcoming.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Upcoming</p>
                <div className="space-y-2">
                  {stats.upcoming.map(({ a, cd }) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-gray-50">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                      <span className={`shrink-0 inline-block px-2.5 py-1 rounded-full border text-xs font-medium ${COUNTDOWN_META[cd.state]}`}>
                        {cd.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Habit consistency */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Sprout className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Habit Consistency</h2>
            </div>
            {habits.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No habits yet — add one in the Habit Tracker to start building consistency.
              </p>
            ) : (
              <div className="space-y-3">
                {habits.map((h) => {
                  // Real per-habit data: distinct completed log dates for this habit
                  const doneDates = new Set(
                    habitLogs
                      .filter((l) => l.habit_id === h.id && l.completed)
                      .map((l) => l.log_date)
                  )
                  const created = h.created_at ? isoToKey(h.created_at) : dateKey()
                  const age = Math.max(1, daysBetweenKeys(created, dateKey()) + 1)
                  const pct = Math.min(100, Math.round((doneDates.size / age) * 100))
                  return (
                    <div key={h.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium truncate">{h.name}</span>
                        <span className="text-gray-500">{pct}% · {doneDates.size} day{doneDates.size === 1 ? '' : 's'}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
      <p className="text-gray-600 mt-1">How consistently have you actually been using Momentum?</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tone}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
