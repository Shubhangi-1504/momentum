import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { formatDate } from '../../utils/mentorUtils'
import {
  MessageSquare,
  Plus,
  X,
  RefreshCw,
  Search,
  UserCheck,
} from 'lucide-react'

export default function MentorRemarks() {
  const { profile } = useAuth()
  const [remarks, setRemarks] = useState([])
  const [students, setStudents] = useState([]) // connected students for the modal
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: mentor, error: mentorErr } = await dbService.getMentorByProfileId(profile.id)
      if (mentorErr) throw mentorErr
      if (!mentor) throw new Error('Mentor record not found.')

      const statsRes = await dbService.getMentorStudentsWithStats(mentor.id)
      if (statsRes.error) throw statsRes.error
      setStudents(
        (statsRes.data || []).map((s) => ({ id: s.studentId, name: s.name, usn: s.usn }))
      )

      const remRes = await dbService.getMentorRemarks(mentor.id)
      if (remRes.error) throw remRes.error
      setRemarks(remRes.data || [])
    } catch (err) {
      console.error('Failed to load remarks:', err)
      setError(err.message || 'Could not load remarks.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (profile?.id) load()
  }, [profile?.id, load])

  const visible = useMemo(() => {
    if (!query.trim()) return remarks
    const q = query.trim().toLowerCase()
    return remarks.filter(
      (r) =>
        (r.students?.profiles?.full_name || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        (r.assignments?.title || '').toLowerCase().includes(q)
    )
  }, [remarks, query])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mentor Remarks</h1>
          <p className="text-gray-600 mt-1.5 text-sm md:text-base">
            Feedback for your students — visible to them on their Mentor page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            disabled={students.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add Remark
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search remarks, students or assignments..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="animate-pulse h-4 bg-gray-100 rounded w-1/4 mb-2" />
              <div className="animate-pulse h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Something went wrong</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students connected yet</h3>
          <p className="text-gray-500">Connect students first, then add remarks here.</p>
        </div>
      ) : remarks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No remarks yet</h3>
          <p className="text-gray-500">
            Add feedback on overall progress or a specific assignment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-primary-soft rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-dark">
                      {(r.students?.profiles?.full_name || 'S').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {r.students?.profiles?.full_name || 'Student'}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      {r.assignment_id && r.assignments?.title ? (
                        <span className="inline-flex items-center gap-1 text-primary-dark">
                          <UserCheck className="w-3 h-3" /> {r.assignments.title}
                        </span>
                      ) : (
                        'General progress'
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {formatDate(r.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-lg p-3">
                {r.content}
              </p>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-100 text-center">
              <p className="text-gray-500">No remarks match this search.</p>
            </div>
          )}
        </div>
      )}

      {/* Add remark modal */}
      {modalOpen && (
        <AddRemarkModal
          students={students}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

function AddRemarkModal({ students, onClose, onSaved }) {
  const { profile } = useAuth()
  const [mentorId, setMentorId] = useState(null)
  const [studentId, setStudentId] = useState(students[0]?.id || '')
  const [assignments, setAssignments] = useState([])
  const [assignmentId, setAssignmentId] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: mentor, error: mentorErr } = await dbService.getMentorByProfileId(profile.id)
      if (mentorErr || !mentor) {
        setError(mentorErr?.message || 'Mentor record not found.')
        return
      }
      setMentorId(mentor.id)
      if (!studentId) return
      const res = await dbService.getAssignmentsForStudents([studentId])
      if (!res.error) setAssignments(res.data || [])
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function handleStudentChange(e) {
    const sid = e.target.value
    setStudentId(sid)
    setAssignmentId('')
    setAssignments([])
    if (sid) {
      const res = await dbService.getAssignmentsForStudents([sid])
      if (!res.error) setAssignments(res.data || [])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() || !studentId) return
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Remark</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Student *</label>
            <select
              required
              value={studentId}
              onChange={handleStudentChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition cursor-pointer"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Remark *</label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. Please complete this before Friday. Focus particularly on recursion questions."
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
              disabled={saving || !mentorId}
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
