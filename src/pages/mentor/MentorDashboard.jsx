import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import {
  relativeTime,
  reviewStatusMeta,
} from '../../utils/mentorUtils'
import {
  Users,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  UserPlus,
  Flame,
  CalendarDays,
  CalendarCheck,
  RefreshCw,
  Bell,
  Eye,
  PenLine,
  BookOpen,
  ArrowRight,
  Target,
} from 'lucide-react'

// ============================================
// Mentor Dashboard — "Who needs my attention?"
// Every number comes from real connected-student data:
//   stats          → getMentorDashboardStats (assignments, remarks, reviews)
//   activity       → getMentorRecentActivity (assignment + remark events)
//   overview       → getMentorProgressOverview (streaks, consistency,
//                    habits, next deadline — from habit_logs/assignments)
// No mock data, no estimates, RLS-scoped to this mentor's students.
// ============================================

const ACTIVITY_ICON = {
  completed: CheckCircle2,
  assigned: UserPlus,
  created: ClipboardList,
  overdue: AlertCircle,
  remark: MessageSquare,
}

const ACTIVITY_COLOR = {
  completed: { chip: 'bg-[#E8F5E9]', icon: 'text-[#2E7D32]' },
  assigned: { chip: 'bg-[#E3F2FD]', icon: 'text-[#1565C0]' },
  created: { chip: 'bg-gray-100', icon: 'text-gray-500' },
  overdue: { chip: 'bg-[#FDEBEE]', icon: 'text-[#C94F4F]' },
  remark: { chip: 'bg-[#EDE7F6]', icon: 'text-[#5E35B1]' },
}

const QUICK_ACTIONS = [
  { label: 'View Students', icon: Users, to: '/mentor/students', tone: 'bg-[#E8F5E9] hover:bg-[#DCEDC8] text-[#2E7D32]' },
  { label: 'Review Tasks', icon: ClipboardList, to: '/mentor/tasks', tone: 'bg-[#E3F2FD] hover:bg-[#BBDEFB] text-[#1565C0]' },
  { label: 'Add Remark', icon: PenLine, to: '/mentor/remarks', tone: 'bg-[#EDE7F6] hover:bg-[#D1C4E9] text-[#5E35B1]' },
  { label: 'Shared Journals', icon: BookOpen, to: '/mentor/journals', tone: 'bg-[#FBF6EC] hover:bg-[#FFECB3] text-[#8D6E63]' },
]

export default function MentorDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [overview, setOverview] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data: mentor, error: mentorErr } = await dbService.getMentorByProfileId(profile.id)
      if (mentorErr) throw mentorErr
      if (!mentor) return

      const [dashRes, activityRes, overviewRes] = await Promise.all([
        dbService.getMentorDashboardStats(mentor.id),
        dbService.getMentorRecentActivity(mentor.id),
        dbService.getMentorProgressOverview(mentor.id),
      ])

      if (dashRes.error) throw dashRes.error
      setStats(dashRes)
      if (activityRes.error) throw activityRes.error
      setRecentActivity(activityRes.data || [])
      if (overviewRes.error) throw overviewRes.error
      setOverview(overviewRes.data || [])
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError(err.message || 'Could not load your dashboard.')
    }
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      await load()
      if (!cancelled) setLoading(false)
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [profile?.id, load])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // Students whose work needs a look right now — real signals only:
  // overdue/pending counts and the shared needs-review rule.
  const attentionRows = useMemo(
    () =>
      overview
        .filter((s) => s.needsReview || s.overdue > 0)
        .sort((a, b) => b.overdue - a.overdue || b.pending - a.pending)
        .slice(0, 5),
    [overview]
  )

  // Deadlines across all connected students, soonest first.
  const upcomingDeadlines = useMemo(
    () =>
      overview
        .filter((s) => s.nextDeadline)
        .map((s) => ({ student: s, deadline: s.nextDeadline }))
        .sort((a, b) => a.deadline.countdown.days - b.deadline.countdown.days)
        .slice(0, 5),
    [overview]
  )

  const statCards = [
    {
      name: 'My Students',
      value: stats?.assignedStudents ?? '—',
      sub: 'connected to you',
      icon: Users,
      tone: 'bg-[#E8F5E9] text-[#2E7D32]',
      href: '/mentor/students',
    },
    {
      name: 'Students Needing Review',
      value: stats?.needingReview ?? '—',
      sub: stats?.needingReview > 0 ? 'check in today' : 'all caught up',
      icon: AlertCircle,
      tone: 'bg-[#FFF4E0] text-[#B57A17]',
      href: '/mentor/students',
    },
    {
      name: 'Pending Tasks',
      value: stats?.pendingTasks ?? '—',
      sub: 'across your students',
      icon: ClipboardList,
      tone: 'bg-[#E3F2FD] text-[#1565C0]',
      href: '/mentor/tasks',
    },
    {
      name: 'Remarks Given',
      value: stats?.remarksGiven ?? '—',
      sub: 'feedback shared',
      icon: MessageSquare,
      tone: 'bg-[#EDE7F6] text-[#5E35B1]',
      href: '/mentor/remarks',
    },
  ]

  const overdueTasks = stats?.overdueTasks ?? 0

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name?.split(' ')[0] || 'Mentor'}
          </h1>
          <p className="text-gray-600 mt-1.5 text-sm md:text-base">
            Here's how your students are doing, and who needs your attention.
          </p>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-line rounded-full px-3 py-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            {today}
          </span>
          <button
            className="p-2.5 bg-white border border-line text-gray-500 rounded-full hover:bg-gray-50 hover:text-gray-700 transition-colors relative"
            title="Notifications"
            onClick={() => navigate('/mentor/students')}
          >
            <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            {attentionRows.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E57373] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {attentionRows.length}
              </span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-white border border-line text-gray-500 rounded-full hover:bg-gray-50 hover:text-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-[18px] h-[18px] ${loading || refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid — colorful overview row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="bg-white rounded-2xl border border-line shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {loading ? (
                  <div className="h-9 w-14 bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                )}
                <p className="mt-1 text-sm font-semibold text-gray-700">{stat.name}</p>
                {stat.sub && !loading && (
                  <p className="text-xs text-gray-400">{stat.sub}</p>
                )}
              </div>
              <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${stat.tone}`}>
                <stat.icon className="w-5 h-5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Overdue banner — only when there is real overdue work */}
      {overdueTasks > 0 && !loading && (
        <Link
          to="/mentor/tasks"
          className="mb-6 flex items-center justify-between gap-3 bg-[#FDEBEE] border border-[#F3C6CC] rounded-2xl px-5 py-3.5 hover:bg-[#FADDE1] transition-colors"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium text-[#A63D3D]">
            <AlertCircle className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
            {overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''} across your students
          </span>
          <span className="text-xs font-semibold text-[#A63D3D] whitespace-nowrap">Review tasks →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-6">
        {/* Students Needing Attention */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-line shadow-sm p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-900">Students Needing Attention</h2>
            <Link
              to="/mentor/students"
              className="text-sm font-medium text-primary-dark hover:text-primary whitespace-nowrap"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : attentionRows.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-[#2E7D32]" />
              </div>
              <p className="text-gray-700 font-medium">Everyone is on track</p>
              <p className="text-sm text-gray-400 mt-1">
                No overdue work or pending reviews right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {attentionRows.map((s) => {
                const status = reviewStatusMeta(s.needsReview)
                return (
                  <Link
                    key={s.studentId}
                    to={`/mentor/students/${s.studentId}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-2xl bg-gray-50 hover:bg-[#F3FBF5] border border-transparent hover:border-line transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-white border border-line rounded-full flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary-dark">
                          {s.name?.charAt(0)?.toUpperCase() || 'S'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {s.usn || 'Student'} · {s.overdue > 0 ? `${s.overdue} overdue` : `${s.pending} pending`}
                          {s.currentStreak > 0 ? ` · ${s.currentStreak}d streak` : ' · streak broken'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      {s.overdue > 0 && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full border text-xs font-medium bg-[#FDEBEE] text-[#A63D3D] border-[#F3C6CC]">
                          Overdue
                        </span>
                      )}
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-medium ${status.classes}`}
                      >
                        {status.label}
                      </span>
                      <ArrowRight className="hidden sm:block w-4 h-4 text-gray-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Right column: Quick Actions + Upcoming Deadlines */}
        <div className="space-y-6 min-w-0">
          <section className="bg-white rounded-3xl border border-line shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2.5">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => navigate(a.to)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/30 ${a.tone}`}
                >
                  <a.icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
                  {a.label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-line shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Upcoming Deadlines</h3>
            {loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">
                No upcoming deadlines for your students.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map(({ student, deadline }) => (
                  <Link
                    key={student.studentId}
                    to={`/mentor/students/${student.studentId}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#F3FBF5] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{deadline.title}</p>
                      <p className="text-xs text-gray-500 truncate">{student.name}</p>
                    </div>
                    <span
                      className={`shrink-0 inline-block px-2.5 py-1 rounded-full border text-xs font-medium ${
                        deadline.countdown.state === 'due_today' || deadline.countdown.state === 'due_soon'
                          ? 'bg-[#FFF4E0] text-[#B57A17] border-[#F2DDB0]'
                          : 'bg-[#E3F2FD] text-[#1565C0] border-[#C7E0F5]'
                      }`}
                    >
                      {deadline.countdown.label}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <Link
              to="/mentor/tasks"
              className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-primary-dark hover:text-primary"
            >
              <CalendarCheck className="w-4 h-4" />
              View Calendar
            </Link>
          </section>
        </div>
      </div>

      {/* Student Progress Overview */}
      <section className="bg-white rounded-3xl border border-line shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900">Student Progress</h2>
          <span className="text-xs text-gray-400 hidden sm:block">
            Consistency from real habit completions and task activity
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : overview.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Connect students to see their progress here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2.5 font-medium">Student</th>
                    <th className="pb-2.5 font-medium">Consistency</th>
                    <th className="pb-2.5 font-medium">Study Tasks</th>
                    <th className="pb-2.5 font-medium">Habits</th>
                    <th className="pb-2.5 font-medium">Upcoming Deadline</th>
                    <th className="pb-2.5 font-medium">Last Reviewed</th>
                    <th className="pb-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {overview.map((s) => {
                    const status = reviewStatusMeta(s.needsReview)
                    return (
                      <tr key={s.studentId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 pr-3">
                          <Link to={`/mentor/students/${s.studentId}`} className="flex items-center gap-2.5 group">
                            <div className="w-8 h-8 bg-primary-soft rounded-full flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary-dark">
                                {s.name?.charAt(0)?.toUpperCase() || 'S'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate group-hover:text-primary-dark transition-colors">
                                {s.name}
                              </p>
                              <p className="text-xs text-gray-400">{s.usn || 'Student'}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 pr-3">
                          <ConsistencyBar pct={s.overallPct} />
                        </td>
                        <td className="py-3 pr-3 text-gray-700">
                          <span className="font-medium text-green-700">{s.completed}</span>
                          <span className="text-gray-400"> / {s.total}</span>
                          {s.overdue > 0 && (
                            <span className="ml-1.5 text-xs text-[#A63D3D] font-medium">
                              {s.overdue} late
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-gray-700">
                          {s.habitPct === null ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <span>
                              <span className="font-medium text-primary-dark">{s.habitPct}%</span>
                              <span className="text-gray-400 text-xs ml-1">({s.habitCount})</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          {s.nextDeadline ? (
                            <div className="min-w-0">
                              <p className="text-gray-900 truncate max-w-[160px]">{s.nextDeadline.title}</p>
                              <p
                                className={`text-xs ${
                                  s.nextDeadline.countdown.days <= 1 ? 'text-[#B57A17] font-medium' : 'text-gray-400'
                                }`}
                              >
                                {s.nextDeadline.countdown.label}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-gray-600">{relativeTime(s.lastReviewedAt)}</td>
                        <td className="py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-medium ${status.classes}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {overview.map((s) => {
                const status = reviewStatusMeta(s.needsReview)
                return (
                  <Link
                    key={s.studentId}
                    to={`/mentor/students/${s.studentId}`}
                    className="block p-4 rounded-2xl bg-gray-50 hover:bg-[#F3FBF5] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 bg-white border border-line rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary-dark">
                            {s.name?.charAt(0)?.toUpperCase() || 'S'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.usn || 'Student'}</p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-block px-2.5 py-0.5 rounded-full border text-xs font-medium ${status.classes}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <MiniStat label="Consistency" value={`${s.overallPct}%`} />
                      <MiniStat label="Tasks" value={`${s.completed}/${s.total}`} />
                      <MiniStat label="Habits" value={s.habitPct === null ? '—' : `${s.habitPct}%`} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {s.currentStreak > 0 ? `${s.currentStreak}d streak` : 'No active streak'}
                      </span>
                      {s.nextDeadline && (
                        <span className="text-gray-500 truncate max-w-[55%]">
                          {s.nextDeadline.title} · {s.nextDeadline.countdown.label}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Recent Activity */}
      <section className="bg-white rounded-3xl border border-line shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent activity yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Activity appears as your students work on assignments and you add remarks.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentActivity.map((event) => {
              const meta = ACTIVITY_COLOR[event.type] || ACTIVITY_COLOR.created
              const Icon = ACTIVITY_ICON[event.type] || Clock
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.chip}`}>
                      <Icon className={`w-4 h-4 ${meta.icon}`} />
                    </div>
                    <p className="text-sm text-gray-800 truncate">{event.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {event.when}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function ConsistencyBar({ pct }) {
  const tone =
    pct >= 70 ? 'bg-primary' : pct >= 40 ? 'bg-[#F4B942]' : pct > 0 ? 'bg-[#E57373]' : 'bg-gray-200'
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[56px]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-9 text-right">{pct}%</span>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white border border-line rounded-lg px-2 py-1.5 text-center">
      <p className="font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  )
}
