import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { isOverdueAssignment, formatDate } from '../../utils/mentorUtils'
import {
  ClipboardList,
  Plus,
  Pencil,
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
  RefreshCw,
  Search,
  UserCheck,
} from 'lucide-react'

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed']
const PRIORITY_OPTIONS = ['low', 'medium', 'high']
const FILTERS = ['all', 'pending', 'in_progress', 'completed', 'overdue']

const STATUS_META = {
  pending: { label: 'Pending', icon: Clock, classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Progress', icon: PlayCircle, classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle2, classes: 'bg-green-50 text-green-700 border-green-200' },
  overdue: { label: 'Overdue', icon: AlertCircle, classes: 'bg-red-50 text-red-700 border-red-200' },
}

const PRIORITY_META = {
  low: { label: 'Low', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'High', classes: 'bg-red-50 text-red-700 border-red-200' },
}

const EMPTY_FORM = {
  student_id: '',
  title: '',
  subject: '',
  description: '',
  due_date: '',
  priority: 'medium',
  status: 'pending',
}

export default function AssignedTasks() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([]) // connected students {studentId, name}
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: mentor, error: mentorErr } = await dbService.getMentorByProfileId(profile.id)
      if (mentorErr) throw mentorErr
      if (!mentor) throw new Error('Mentor record not found.')

      const res = await dbService.getMentorStudentsWithStats(mentor.id)
      if (res.error) throw res.error
      const connected = (res.data || []).map((s) => ({ id: s.studentId, name: s.name }))
      setStudents(connected)

      if (connected.length === 0) {
        setAssignments([])
        return
      }
      const asgRes = await dbService.getAssignmentsForStudents(connected.map((c) => c.id))
      if (asgRes.error) throw asgRes.error
      setAssignments(asgRes.data || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setError(err.message || 'Could not load study tasks.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (profile?.id) load()
  }, [profile?.id, load])

  const visible = useMemo(() => {
    let list = assignments
    if (filter !== 'all') {
      list = list.filter((a) => (filter === 'overdue' ? isOverdueAssignment(a) : a.status === filter))
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.students?.profiles?.full_name || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [assignments, filter, query])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, student_id: students[0]?.id || '' })
    setModalOpen(true)
  }

  function openEdit(a) {
    setEditingId(a.id)
    setForm({
      student_id: a.student_id,
      title: a.title || '',
      subject: a.subject || '',
      description: a.description || '',
      due_date: a.due_date ? a.due_date.slice(0, 10) : '',
      priority: a.priority || 'medium',
      status: STATUS_OPTIONS.includes(a.status) ? a.status : 'pending',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.student_id) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        subject: form.subject.trim() || null,
        description: form.description.trim() || null,
        due_date: form.due_date ? new Date(`${form.due_date}T12:00:00`).toISOString() : null,
        priority: form.priority,
        status: form.status,
      }
      const { error: dbErr } = editingId
        ? await dbService.updateAssignment(editingId, payload)
        : await dbService.createAssignment({
            ...payload,
            student_id: form.student_id,
            created_by_role: 'mentor',
          })
      if (dbErr) throw dbErr
      showToast(editingId ? 'Assignment updated' : 'Assignment created — visible in the student\'s Study Tracker')
      closeModal()
      await load()
    } catch (err) {
      console.error('Failed to save assignment:', err)
      showToast(err.message || 'Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(a, status) {
    const prev = assignments
    setAssignments((list) => list.map((x) => (x.id === a.id ? { ...x, status } : x)))
    const { error: dbErr } = await dbService.updateAssignment(a.id, { status })
    if (dbErr) {
      setAssignments(prev)
      showToast(dbErr.message || 'Failed to update status')
      return
    }
    showToast(`Marked as ${STATUS_META[status]?.label || status}`)
  }

  const studentName = (a) => a.students?.profiles?.full_name || 'Student'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Study Tasks</h1>
          <p className="text-gray-600 mt-1">
            Assignments for your connected students — the same tasks they see in their Study Tracker.
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
            onClick={openCreate}
            disabled={students.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Assign Task
          </button>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                filter === f
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_META[f].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks or students..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="animate-pulse h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="animate-pulse h-3 bg-gray-100 rounded w-1/4" />
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
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students connected</h3>
          <p className="text-gray-500 mb-4">
            Share your mentor code from My Students — then you can assign tasks here.
          </p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-500">Assign the first task to one of your students.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">No tasks match this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 font-medium">Assignment</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Due date</th>
                  <th className="px-5 py-3 font-medium">Priority</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((a) => {
                  const overdue = isOverdueAssignment(a)
                  const meta = overdue ? STATUS_META.overdue : STATUS_META[a.status] || STATUS_META.pending
                  const prio = PRIORITY_META[a.priority] || PRIORITY_META.medium
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {a.created_by_role === 'mentor' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-primary-dark">
                              <UserCheck className="w-3 h-3" /> Created by Mentor
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Created by Student</span>
                          )}
                          {a.subject && (
                            <span className="text-xs text-gray-400">· {a.subject}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{studentName(a)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {a.due_date ? formatDate(a.due_date) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full border text-xs font-medium ${prio.classes}`}>
                          {prio.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusSelect a={a} meta={meta} onChange={handleStatusChange} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openEdit(a)}
                          className="p-2 text-gray-400 hover:text-primary-dark hover:bg-primary-soft rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/edit modal */}
      {modalOpen && (
        <TaskModal
          form={form}
          setForm={setForm}
          students={students}
          onClose={closeModal}
          onSubmit={handleSubmit}
          saving={saving}
          editing={!!editingId}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  )
}

function StatusSelect({ a, meta, onChange }) {
  const Icon = meta.icon
  return (
    <div className="relative inline-block">
      <select
        value={STATUS_OPTIONS.includes(a.status) ? a.status : 'pending'}
        onChange={(e) => onChange(a, e.target.value)}
        className={`appearance-none pl-8 pr-7 py-1.5 rounded-full border text-xs font-medium bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 ${meta.classes}`}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
      <Icon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}

function TaskModal({ form, setForm, students, onClose, onSubmit, saving, editing }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Edit Task' : 'Assign Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Student *</label>
            <select
              required
              disabled={editing}
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition cursor-pointer disabled:bg-gray-50 disabled:text-gray-500"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. DSA Assignment — Recursion"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Data Structures"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Due date</label>
              <input
                type="date"
                min={editing ? undefined : today}
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details…"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition cursor-pointer"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
