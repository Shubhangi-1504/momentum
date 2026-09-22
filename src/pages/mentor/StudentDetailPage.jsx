import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { formatDate, relativeTime, assignmentStats } from '../../utils/mentorUtils'
import {
  dateKey,
  isoToKey,
  overallConsistency,
  dueCountdown,
  COUNTDOWN_META,
} from '../../utils/consistencyUtils'
import MonthCalendar from '../../components/consistency/MonthCalendar'
import {
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
  Clock,
  AlertCircle,
  ListTodo,
  MessageSquare,
  BadgeCheck,
  X,
  RefreshCw,
  CalendarDays,
  Flame,
  Trophy,
  CalendarCheck,
  Sprout,
} from 'lucide-react'

const STATUS_META = {
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', classes: 'bg-green-50 text-green-700 border-green-200' },
  overdue: { label: 'Overdue', classes: 'bg-red-50 text-red-700 border-red-200' },
}

const PRIORITY_META = {
  low: { label: 'Low', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'High', classes: 'bg-red-50 text-red-700 border-red-200' },
}

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const { profile } = useAuth()
  const [detail, setDetail] = useState(null)
  const [mentorId, setMentorId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const [remarkModalFor, setRemarkModalFor] = useState(null) // null | 'general' | assignment object

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: mentor, error: mentorErr } = await dbService.getMentorByProfileId(profile.id)
      if (mentorErr) throw mentorErr
      if (!mentor) throw new Error('Mentor record not found.')
      setMentorId(mentor.id)

      const res = await dbService.getMentorStudentConsistencyDetail(mentor.id, studentId)
      if (res.error) throw res.error
      setDetail(res.data)
    } catch (err) {
      console.error('Failed to load student:', err)
      setError(err.message || 'Could not load this student.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, studentId])

  useEffect(() => {
    if (profile?.id) load()
  }, [profile?.id, load])

  // ---- Consistency (real student records; mentors are read-only) ----
  // Hooks stay before any early return so hook order is stable.
  const { student, assignments, remarks, lastReview, habits, habitLogs } = detail || {}
  const stats = assignmentStats(assignments || [])

  const consistency = useMemo(() => {
    const today = dateKey()
    const habitDates = [...new Set((habitLogs || []).filter((l) => l.completed).map((l) => l.log_date))]
    const assignDates = (assignments || [])
      .filter((a) => a.status === 'completed' && a.completed_at)
      .map((a) => isoToKey(a.completed_at))
    const startKey = (student && student.tracking_start_date) || today
    return {
      ...overallConsistency(habitDates, assignDates, startKey, today),
      habitDates: new Set(habitDates),
      startKey,
      habitPct:
        (habits || []).length > 0
          ? Math.round(
              (habits || []).reduce((sum, h) => {
                const done = (habitLogs || []).filter((l) => l.habit_id === h.id && l.completed).length
                const created = h.created_at ? isoToKey(h.created_at) : today
                const age = Math.max(
                  1,
                  Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${created}T00:00:00Z`)) / 86400000) + 1
                )
                return sum + Math.min(100, Math.round((done / age) * 100))
              }, 0) / (habits || []).length
            )
          : null,
    }
  }, [assignments, habits, habitLogs, student])

  const upcoming = useMemo(() => {
    const today = dateKey()
    return (assignments || [])
      .filter((a) => a.status !== 'completed' && a.due_date)
      .map((a) => ({ a, cd: dueCountdown({ dueKey: isoToKey(a.due_date), completed: false, todayK: today }) }))
      .filter((x) => x.cd.state !== 'overdue' && x.cd.state !== 'none')
      .sort((x, z) => x.cd.days - z.cd.days)
      .slice(0, 3)
  }, [assignments])

  async function markReviewed() {
    if (!mentorId || !studentId) return
    setReviewing(true)
    try {
      const { error: revErr } = await dbService.createStudentReview(mentorId, studentId)
      if (revErr) throw revErr
      await load()
    } catch (err) {
      console.error('Failed to save review:', err)
      setError(err.message || 'Could not mark as reviewed.')
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-32 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse mb-6" />
        <div className="h-64 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="max-w-6xl mx-auto">
        <BackLink />
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center mt-4">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Could not load student</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const name = (student && student.profiles?.full_name) || 'Student'

  function calStatus(key) {
    const today = dateKey()
    if (key > today) return 'future'
    if (key < consistency.startKey) return 'none'
    return consistency.habitDates.has(key) ? 'done' : 'missed'
  }

  return (
    <div className="max-w-6xl mx-auto">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-soft rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-primary-dark">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            <p className="text-sm text-gray-500">
              Student{student.usn ? ` · ${student.usn}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setRemarkModalFor('general')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <MessageSquare className="w-4 h-4" />
            Add Remark
          </button>
          <button
            onClick={markReviewed}
            disabled={reviewing}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors font-medium disabled:bg-green-400"
          >
            <BadgeCheck className="w-4 h-4" />
            {reviewing ? 'Saving…' : 'Mark as Reviewed'}
          </button>
        </div>
      </div>

      {/* Consistency overview */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          Consistency
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div>
            <MonthCalendar compact statusForKey={calStatus} />
            <p className="text-[11px] text-gray-400 mt-3">
              Tracking since {consistency.startKey}. Green = active day (habit or task completed).
            </p>
          </div>
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <ConsistencyStat icon={Flame} label="Current Streak" value={`${consistency.currentStreak}d`} tone="text-orange-600 bg-orange-50" />
              <ConsistencyStat icon={Trophy} label="Longest Streak" value={`${consistency.longestStreak}d`} tone="text-amber-700 bg-amber-50" />
              <ConsistencyStat icon={CalendarCheck} label="Study Days" value={`${consistency.activeDays}/${consistency.totalDays}`} tone="text-blue-700 bg-blue-50" />
              <ConsistencyStat
                icon={Sprout}
                label="Habit Consistency"
                value={consistency.habitPct === null ? '—' : `${consistency.habitPct}%`}
                tone="text-green-700 bg-green-50"
              />
            </div>
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Upcoming deadlines</p>
                <div className="space-y-2">
                  {upcoming.map(({ a, cd }) => (
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
        </div>
      </div>

      {/* Study progress */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          Study Progress
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <ProgressStat icon={ListTodo} label="Total" value={stats.total} tone="text-gray-700 bg-gray-50" />
          <ProgressStat icon={CheckCircle2} label="Completed" value={stats.completed} tone="text-green-700 bg-green-50" />
          <ProgressStat icon={PlayCircle} label="In Progress" value={stats.in_progress} tone="text-blue-700 bg-blue-50" />
          <ProgressStat icon={Clock} label="Pending" value={stats.pending} tone="text-amber-700 bg-amber-50" />
          <ProgressStat icon={AlertCircle} label="Overdue" value={stats.overdue} tone="text-red-700 bg-red-50" />
          <div className="rounded-lg border border-gray-100 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Completion</p>
            <p className="text-xl font-bold text-primary-dark">{stats.completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Assignments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Assignments
          </h2>
          <Link
            to="/mentor/tasks"
            className="text-sm text-primary-dark hover:text-primary font-medium"
          >
            Manage in Study Tasks →
          </Link>
        </div>
        {assignments.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No assignments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 font-medium">Assignment</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Due date</th>
                  <th className="px-5 py-3 font-medium">Priority</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assignments.map((a) => {
                  const isOverdue =
                    a.status !== 'completed' && a.due_date && new Date(a.due_date) < new Date()
                  const meta = isOverdue ? STATUS_META.overdue : STATUS_META[a.status] || STATUS_META.pending
                  const prio = PRIORITY_META[a.priority] || PRIORITY_META.medium
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{a.title}</p>
                        {a.description && (
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{a.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{a.subject || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          <CalendarDays className="w-4 h-4 text-gray-400" />
                          {a.due_date ? formatDate(a.due_date) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full border text-xs font-medium ${prio.classes}`}>
                          {prio.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full border text-xs font-medium ${meta.classes}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setRemarkModalFor(a)}
                          className="p-2 text-gray-400 hover:text-primary-dark hover:bg-primary-soft rounded-lg transition-colors"
                          title="Add remark on this assignment"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mentor review + remarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Mentor Review
          </h2>
          <p className="text-sm text-gray-500">Last reviewed</p>
          <p className="text-lg font-semibold text-gray-900">
            {lastReview ? formatDate(lastReview.reviewed_at) : 'Never'}
          </p>
          {lastReview?.notes && (
            <p className="text-sm text-gray-500 mt-2 italic">"{lastReview.notes}"</p>
          )}
          <p className="text-xs text-gray-400 mt-3">
            {lastReview ? relativeTime(lastReview.reviewed_at) : 'Mark as reviewed after checking this student\'s progress.'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Recent Remarks
            </h2>
            <button
              onClick={() => setRemarkModalFor('general')}
              className="text-sm text-primary-dark hover:text-primary font-medium"
            >
              + Add Remark
            </button>
          </div>
          {remarks.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No remarks yet. Feedback you add appears here and on the student's Mentor page.
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {remarks.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-700">
                      {profile?.full_name || 'You'}
                      {r.assignment_id && r.assignments?.title && (
                        <span className="font-normal text-gray-400"> · {r.assignments.title}</span>
                      )}
                    </p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add remark modal */}
      {remarkModalFor && (
        <AddRemarkModal
          mentorId={mentorId}
          studentId={studentId}
          assignment={remarkModalFor === 'general' ? null : remarkModalFor}
          assignments={assignments}
          onClose={() => setRemarkModalFor(null)}
          onSaved={async () => {
            setRemarkModalFor(null)
            await load()
          }}
        />
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/mentor/students"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to My Students
    </Link>
  )
}

function ProgressStat({ icon: Icon, label, value, tone }) {
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

function ConsistencyStat({ icon: Icon, label, value, tone }) {
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

function AddRemarkModal({ mentorId, studentId, assignment, assignments, onClose, onSaved }) {
  const [content, setContent] = useState('')
  const [assignmentId, setAssignmentId] = useState(assignment?.id || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    setError(null)
    try {
      const { error: remErr } = await dbService.createRemark({
        mentor_id: mentorId,
        student_id: studentId,
        assignment_id: assignmentId || null,
        content: content.trim(),
        category: assignmentId ? 'academic' : 'general',
      })
      if (remErr) throw remErr
      await onSaved()
    } catch (err) {
      console.error('Failed to save remark:', err)
      setError(err.message || 'Could not save the remark.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {assignment ? `Remark · ${assignment.title}` : 'Add Remark'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!assignment && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Related assignment (optional)
              </label>
              <select
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition cursor-pointer"
              >
                <option value="">General progress</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Remark *</label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. Please complete this before Friday. Focus on recursion questions."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Remark'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
