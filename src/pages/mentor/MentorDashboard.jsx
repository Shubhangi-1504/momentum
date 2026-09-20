import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import {
  Users,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const ACTIVITY_ICON = {
  completed: CheckCircle2,
  assigned: UserPlus,
  created: ClipboardList,
  overdue: AlertCircle,
  remark: MessageSquare,
}

const ACTIVITY_COLOR = {
  completed: 'text-green-600',
  assigned: 'text-primary',
  created: 'text-gray-400',
  overdue: 'text-red-500',
  remark: 'text-blue-500',
}

export default function MentorDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: mentor, error: mentorErr } = await dbService.getMentorByProfileId(profile.id)
        if (mentorErr) throw mentorErr
        if (!mentor) return

        const [dashRes, activityRes] = await Promise.all([
          dbService.getMentorDashboardStats(mentor.id),
          dbService.getMentorRecentActivity(mentor.id),
        ])

        if (dashRes.error) throw dashRes.error
        setStats(dashRes)
        if (activityRes.error) throw activityRes.error
        setRecentActivity(activityRes.data || [])
      } catch (err) {
        console.error('Failed to load dashboard:', err)
        setError(err.message || 'Could not load your dashboard.')
      } finally {
        setLoading(false)
      }
    }

    if (profile?.id) fetchData()
  }, [profile?.id])

  const statCards = [
    {
      name: 'My Students',
      value: stats?.assignedStudents ?? '—',
      icon: Users,
      tone: 'bg-primary-soft text-primary-dark',
      href: '/mentor/students',
    },
    {
      name: 'Pending Tasks',
      value: stats?.pendingTasks ?? '—',
      sub: stats?.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : null,
      icon: ClipboardList,
      tone: 'bg-blue-50 text-blue-700',
      href: '/mentor/tasks',
    },
    {
      name: 'Remarks Given',
      value: stats?.remarksGiven ?? '—',
      icon: MessageSquare,
      tone: 'bg-purple-50 text-purple-700',
      href: '/mentor/remarks',
    },
    {
      name: 'Students Needing Review',
      value: stats?.needingReview ?? '—',
      icon: AlertCircle,
      tone: 'bg-amber-50 text-amber-700',
      href: '/mentor/students',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {profile?.full_name?.split(' ')[0] || 'Mentor'}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Here's how your students are doing, and who needs your attention.
        </p>
        {error && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-gray-500">{stat.name}</p>
                {loading ? (
                  <div className="mt-2 h-7 w-12 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
                )}
                {stat.sub && !loading && (
                  <p className="text-xs text-red-500 font-medium mt-1">{stat.sub}</p>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.tone}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent activity to show</p>
            <p className="text-sm text-gray-400 mt-1">
              Activity appears as your students work on assignments and you add remarks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((event) => {
              const Icon = ACTIVITY_ICON[event.type] || Clock
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${ACTIVITY_COLOR[event.type] || 'text-gray-400'}`} />
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
      </div>
    </div>
  )
}
