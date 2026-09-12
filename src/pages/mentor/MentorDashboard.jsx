import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { Users, ClipboardList, MessageSquare, Star, TrendingUp, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function MentorDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: mentor } = await dbService.getMentorByProfileId(profile.id)
        if (!mentor) return

        const [dashboardStats, activity] = await Promise.all([
          dbService.getMentorDashboardStats(mentor.id),
          dbService.getMentorRecentActivity(mentor.id),
        ])

        setStats(dashboardStats)
        setRecentActivity(activity.data || [])
      } catch (err) {
        console.error('Failed to load dashboard:', err)
        setError('Could not load your dashboard.')
      } finally {
        setLoading(false)
      }
    }

    if (profile?.id) fetchData()
  }, [profile?.id])

  const statCards = [
    { name: 'Assigned Students', value: stats?.assignedStudents ?? '—', icon: Users, color: 'bg-blue-500', href: '/mentor/students' },
    { name: 'Pending Tasks', value: stats?.pendingTasks ?? '—', icon: ClipboardList, color: 'bg-green-500', href: '/mentor/tasks' },
    { name: 'Remarks Given', value: stats?.remarksGiven ?? '—', icon: MessageSquare, color: 'bg-orange-500', href: '/mentor/remarks' },
    { name: 'Avg. Rating', value: stats?.avgRating ?? '—', icon: Star, color: 'bg-yellow-500', href: '/mentor/remarks' },
  ]

  const statusColor = {
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {profile?.full_name?.split(' ')[0] || 'Mentor'}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your students, track their progress, and provide guidance.
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
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                {loading ? (
                  <div className="mt-1 h-7 w-12 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                )}
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
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      {task.students?.profiles?.full_name || 'Student'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${statusColor[task.status] || 'bg-gray-100 text-gray-700'}`}>
                  {task.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
