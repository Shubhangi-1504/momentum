import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { BookOpen, Target, PenTool, MessageSquare, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

const quickLinks = [
  { name: 'Study Tracker', href: '/student/study', icon: BookOpen, color: 'bg-blue-500' },
  { name: 'Habit Tracker', href: '/student/habits', icon: Target, color: 'bg-green-500' },
  { name: 'Journal', href: '/student/journal', icon: PenTool, color: 'bg-purple-500' },
  { name: 'Remarks', href: '/student/remarks', icon: MessageSquare, color: 'bg-orange-500' },
  { name: 'Progress', href: '/student/progress', icon: BarChart3, color: 'bg-pink-500' },
]

export default function StudentHome() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: student } = await dbService.getStudentByProfileId(profile.id)
        if (!student) return

        const dashboardStats = await dbService.getStudentDashboardStats(student.id)
        setStats(dashboardStats)
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
        setError('Could not load your stats.')
      } finally {
        setLoading(false)
      }
    }

    if (profile?.id) fetchStats()
  }, [profile?.id])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Track your studies, build habits, and monitor your progress.
        </p>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.name}
            to={link.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <link.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">{link.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Click to open</p>
          </Link>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Assignments Due"
          value={stats?.pendingAssignments ?? '—'}
          loading={loading}
          error={error}
        />
        <StatCard
          label="Habits Today"
          value={stats?.habitsToday ?? '—'}
          loading={loading}
          error={error}
        />
        <StatCard
          label="Journal Entries"
          value={stats?.journalCount ?? '—'}
          loading={loading}
          error={error}
        />
        <StatCard
          label="Study Hours (7d)"
          value={stats?.studyHours ?? '—'}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, loading, error }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-16 bg-gray-100 rounded animate-pulse" />
      ) : error ? (
        <p className="text-2xl font-bold text-red-400 mt-1">—</p>
      ) : (
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      )}
    </div>
  )
}
