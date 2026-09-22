import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { relativeTime, reviewStatusMeta } from '../../utils/mentorUtils'
import {
  Users,
  Search,
  Copy,
  Check,
  Eye,
  RefreshCw,
  AlertCircle,
  UserPlus,
  ClipboardList,
} from 'lucide-react'

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'on_track', label: 'On Track' },
  { value: 'needs_review', label: 'Needs Review' },
]

export default function StudentDetails() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [connectionCode, setConnectionCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const { data: mentor, error: mentorErr } = await dbService.getMentorByProfileId(profile.id)
        if (mentorErr) throw mentorErr
        if (!mentor) throw new Error('Mentor record not found.')
        setConnectionCode(mentor.connection_code || null)

        const res = await dbService.getMentorStudentsWithStats(mentor.id)
        if (res.error) throw res.error
        setStudents(res.data || [])
      } catch (err) {
        console.error('Failed to load students:', err)
        setError(err.message || 'Could not load your students.')
      } finally {
        setLoading(false)
      }
    }
    if (profile?.id) fetchData()
  }, [profile?.id])

  const visible = useMemo(() => {
    let list = students
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.usn || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'on_track') list = list.filter((s) => !s.needsReview)
    if (statusFilter === 'needs_review') list = list.filter((s) => s.needsReview)
    return list
  }, [students, query, statusFilter])

  async function copyCode() {
    if (!connectionCode) return
    try {
      await navigator.clipboard.writeText(connectionCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (e.g. insecure context) — code stays visible
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Students</h1>
          <p className="text-gray-600 mt-1.5 text-sm md:text-base">
            Students connected to you via your mentor code.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors self-start"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Mentor code card */}
      <div className="bg-white rounded-2xl border border-line shadow-sm p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-soft rounded-xl flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Your mentor code</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Share this with a student so they can connect with you from their Mentor page.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="h-9 w-32 bg-gray-100 rounded-lg animate-pulse" />
        ) : connectionCode ? (
          <div className="flex items-center gap-2">
            <code className="px-4 py-2 rounded-lg bg-primary-soft text-primary-dark font-bold tracking-widest text-lg select-all">
              {connectionCode}
            </code>
            <button
              onClick={copyCode}
              className="p-2 text-gray-400 hover:text-primary-dark hover:bg-primary-soft rounded-lg transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Code unavailable</span>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or USN..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-2 text-sm rounded-full border transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Something went wrong</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students connected yet</h3>
          <p className="text-gray-500">
            Share your mentor code above — students connect from their Mentor page.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">No students match this search or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <StudentRow key={s.studentId} s={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function StudentRow({ s }) {
  const status = reviewStatusMeta(s.needsReview)
  return (
    <div className="bg-white rounded-2xl border border-line shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Identity */}
        <div className="flex items-center gap-3 md:w-56 shrink-0">
          <div className="w-10 h-10 bg-primary-soft rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-dark">
              {s.name?.charAt(0)?.toUpperCase() || 'S'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{s.name}</p>
            <p className="text-xs text-gray-500">Student{s.usn ? ` · ${s.usn}` : ''}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <Stat icon={ClipboardList} label="Assignments" value={s.total} />
          <Stat icon={Check} label="Completed" value={s.completed} tone="text-green-600" />
          <Stat icon={RefreshCw} label="Pending" value={s.pending} tone="text-amber-600" />
          <Stat
            icon={AlertCircle}
            label="Overdue"
            value={s.overdue}
            tone={s.overdue > 0 ? 'text-red-600' : 'text-gray-500'}
          />
        </div>

        {/* Status + action */}
        <div className="flex items-center justify-between md:justify-end gap-4 md:w-56 shrink-0">
          <div>
            <p className="text-xs text-gray-400">Last reviewed</p>
            <p className="text-sm font-medium text-gray-700">{relativeTime(s.lastReviewedAt)}</p>
            <span
              className={`inline-block mt-1 px-2.5 py-0.5 rounded-full border text-xs font-medium ${status.classes}`}
            >
              {status.label}
            </span>
          </div>
          <Link
            to={`/mentor/students/${s.studentId}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors text-sm font-medium shrink-0"
          >
            <Eye className="w-4 h-4" />
            View Student
          </Link>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, tone = 'text-gray-700' }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
      <Icon className={`w-4 h-4 ${tone}`} />
      <div className="min-w-0">
        <span className={`font-semibold ${tone}`}>{value}</span>
        <span className="text-gray-400 text-xs ml-1">{label}</span>
      </div>
    </div>
  )
}
