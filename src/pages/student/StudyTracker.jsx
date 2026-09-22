import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { dueCountdown, COUNTDOWN_META, dateKey, isoToKey } from '../../utils/consistencyUtils'
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  ChevronDown,
  X,
  RefreshCw,
  Check,
  CalendarDays,
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
  title: '',
  subject: '',
  description: '',
  start_date: '',
  due_date: '',
  priority: 'medium',
  status: 'pending',
}

export default function StudyTracker() {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [filter, setFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('due_asc')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const studentIdRef = useRef(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  const loadAssignments = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      if (!profile?.id) {
        setAssignments([])
        return
      }
      const { data: student, error: studentErr } = await dbService.getStudentByProfileId(profile.id)
      if (studentErr) throw studentErr
      if (!student) {
        setError('Student record not found. Please contact your mentor.')
        setAssignments([])
        return
      }
      studentIdRef.current = student.id
      const { data, error: dbErr } = await dbService.getAssignments(student.id)
      if (dbErr) throw dbErr
      setAssignments(data || [])
    } catch (err) {
      console.error('Failed to load assignments:', err)
      setError(err.message || 'Could not load your assignments.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    // Defer the initial fetch to the next tick so the effect body itself
    // stays free of synchronous state updates (and StrictMode-safe).
    const t = window.setTimeout(() => {
      loadAssignments()
    }, 0)
    return () => window.clearTimeout(t)
  }, [loadAssignments])

  const isOverdue = useCallback(
    (a) => a.status !== 'completed' && a.due_date && new Date(a.due_date) < new Date(),
    []
  )

  const counts = useMemo(() => {
    const c = { total: assignments.length, pending: 0, in_progress: 0, completed: 0, overdue: 0 }
    for (const a of assignments) {
      if (isOverdue(a)) c.overdue++
      else c[a.status] = (c[a.status] || 0) + 1
    }
    return c
  }, [assignments, isOverdue])

  const visible = useMemo(() => {
    let list = [...assignments]
    if (filter !== 'all') {
      list = list.filter((a) => (filter === 'overdue' ? isOverdue(a) : a.status === filter))
    }
    list.sort((a, b) => {
      if (sortOrder === 'due_asc') {
        return new Date(a.due_date || '2999-12-31') - new Date(b.due_date || '2999-12-31')
      }
      if (sortOrder === 'due_desc') {
        return new Date(b.due_date || 0) - new Date(a.due_date || 0)
      }
      return 0
    })
    return list
  }, [assignments, filter, sortOrder, isOverdue])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(a) {
    setEditingId(a.id)
    setForm({
      title: a.title || '',
      subject: a.subject || '',
      description: a.description || '',
      start_date: a.start_date || '',
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
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        subject: form.subject.trim() || null,
        description: form.description.trim() || null,
        start_date: form.start_date || null,
        due_date: form.due_date ? new Date(`${form.due_date}T12:00:00`).toISOString() : null,
        priority: form.priority,
        status: form.status,
      }
      const { error: dbErr } = editingId
        ? await dbService.updateAssignment(editingId, payload)
        : await dbService.createAssignment({ ...payload, student_id: studentIdRef.current })
      if (dbErr) throw dbErr
      showToast(editingId ? 'Assignment updated' : 'Assignment added')
      closeModal()
      await loadAssignments()
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

  async function handleDelete(a) {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    setDeletingId(a.id)
    const { error: dbErr } = await dbService.deleteAssignment(a.id)
    setDeletingId(null)
    if (dbErr) {
      showToast(dbErr.message || 'Failed to delete assignment')
      return
    }
    setAssignments((list) => list.filter((x) => x.id !== a.id))
    showToast('Assignment deleted')
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Study Tracker</h1>
          <p className="text-gray-600 mt-1">Keep track of your assignments and stay ahead.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAssignments}
            className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Assignment
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <SummaryCard label="Total" value={counts.total} icon={ListTodo} tone="text-gray-700 bg-gray-50" />
        <SummaryCard label="Pending" value={counts.pending} icon={Clock} tone="text-amber-700 bg-amber-50" />
        <SummaryCard label="In Progress" value={counts.in_progress} icon={PlayCircle} tone="text-blue-700 bg-blue-50" />
        <SummaryCard label="Completed" value={counts.completed} icon={CheckCircle2} tone="text-green-700 bg-green-50" />
        <SummaryCard label="Overdue" value={counts.overdue} icon={AlertCircle} tone="text-red-700 bg-red-50" />
      </div>

      {/* Deadline awareness: mini calendar + next-up list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <DeadlineCalendar assignments={assignments} />
        <UpcomingDeadlines assignments={assignments} isOverdue={isOverdue} />
      </div>

      {/* Filters + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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
              {f !== 'all' && counts[f] > 0 && (
                <span className={`ml-1.5 ${filter === f ? 'text-green-100' : 'text-gray-400'}`}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative self-start sm:self-auto">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-9 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
          >
            <option value="due_asc">Due date ↑</option>
            <option value="due_desc">Due date ↓</option>
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList />
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Something went wrong</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadAssignments}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
          <p className="text-gray-500 mb-5">Start by adding your first assignment</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Assignment
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">No assignments match this filter.</p>
        </div>
      ) : (
        <AssignmentTable
          rows={visible}
          isOverdue={isOverdue}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          deletingId={deletingId}
        />
      )}

      {/* Modal */}
      {modalOpen && (
        <AssignmentModal
          form={form}
          setForm={setForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
          saving={saving}
          editing={!!editingId}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          <Check className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, tone }) {
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

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-5 w-5 bg-gray-100 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/5" />
            </div>
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
            <div className="h-6 w-16 bg-gray-100 rounded-full hidden sm:block" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AssignmentTable({ rows, isOverdue, onEdit, onDelete, onStatusChange, deletingId }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 font-medium">Assignment</th>
              <th className="px-5 py-3 font-medium">Subject</th>
              <th className="px-5 py-3 font-medium">Due date</th>
              <th className="px-5 py-3 font-medium">Priority</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((a) => {
              const overdue = isOverdue(a)
              const meta = STATUS_META[a.status] || STATUS_META.pending
              const prio = PRIORITY_META[a.priority] || PRIORITY_META.medium
              return (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{a.title}</p>
                    {a.description && (
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{a.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-600">{a.subject || '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1.5 ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        {a.due_date ? formatDate(a.due_date) : '—'}
                      </span>
                      <DueCountdownBadge a={a} />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full border text-xs font-medium ${prio.classes}`}>
                      {prio.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusSelect a={a} meta={meta} onChange={onStatusChange} />
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onEdit(a)}
                      className="p-2 text-gray-400 hover:text-primary-dark hover:bg-primary-soft rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(a)}
                      disabled={deletingId === a.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((a) => {
          const meta = STATUS_META[a.status] || STATUS_META.pending
          const prio = PRIORITY_META[a.priority] || PRIORITY_META.medium
          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.subject || 'No subject'} · Due {a.due_date ? formatDate(a.due_date) : '—'}
                  </p>
                  <div className="mt-1.5">
                    <DueCountdownBadge a={a} />
                  </div>
                </div>
                <span className={`shrink-0 inline-block px-2.5 py-1 rounded-full border text-xs font-medium ${prio.classes}`}>
                  {prio.label}
                </span>
              </div>
              {a.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{a.description}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <StatusSelect a={a} meta={meta} onChange={onStatusChange} />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(a)}
                    className="p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(a)}
                    disabled={deletingId === a.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function StatusSelect({ a, meta, onChange }) {
  const Icon = meta.icon
  return (
    <div className="relative inline-block">
      <select
        value={a.status}
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

/**
 * Live countdown chip: "3 days left", "Due today", "Overdue by 2 days".
 * Calendar-date math — no negative or confusing labels. Renders nothing
 * when there's no due date or the task is completed.
 */
function DueCountdownBadge({ a }) {
  const cd = dueCountdown({
    dueKey: isoToKey(a.due_date),
    completed: a.status === 'completed',
  })
  if (cd.state === 'none' || cd.state === 'completed') return null
  return (
    <span className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full border text-[11px] font-medium ${COUNTDOWN_META[cd.state]}`}>
      <Clock className="w-3 h-3" />
      {cd.label}
    </span>
  )
}

function AssignmentModal({ form, setForm, onClose, onSubmit, saving, editing }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Edit Assignment' : 'Add Assignment'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. DS Lab Report 3"
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ============================================
// Mini deadline calendar — current month only, marks days with a
// pending/overdue due date (amber) or overdue (red) and today (ring).
// Deadline awareness, not a calendar app.
// ============================================
const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CAL_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function DeadlineCalendar({ assignments }) {
  const today = dateKey()
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const dueByDay = useMemo(() => {
    const map = {} // day-of-month -> 'overdue' | 'due'
    for (const a of assignments || []) {
      if (a.status === 'completed' || !a.due_date) continue
      const k = isoToKey(a.due_date)
      if (!k || !k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}-`)) continue
      const day = parseInt(k.slice(8), 10)
      const isOd = k < today
      if (map[day] !== 'overdue') map[day] = isOd ? 'overdue' : 'due'
    }
    return map
  }, [assignments, today, y, m])

  const weeks = useMemo(() => {
    const lead = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < lead; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const out = []
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
    return out
  }, [y, m])

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-semibold text-gray-900">{CAL_MONTHS[m]} {y}</p>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {CAL_WEEKDAYS.map((w) => (
          <div key={w} className="h-6 flex items-center justify-center text-[9px] text-gray-400 font-medium">{w}</div>
        ))}
        {weeks.flat().map((day, i) => {
          if (!day) return <div key={`p${i}`} className="h-7" />
          const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const mark = dueByDay[day]
          const isToday = k === today
          return (
            <div
              key={k}
              title={
                mark === 'overdue'
                  ? 'Overdue work due this day'
                  : mark === 'due'
                    ? 'Task due this day'
                    : isToday
                      ? 'Today'
                      : undefined
              }
              className={`h-7 rounded-md border flex items-center justify-center text-[11px] font-medium ${
                mark === 'overdue'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : mark === 'due'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-white text-gray-500 border-gray-100'
              } ${isToday ? 'ring-2 ring-primary/40' : ''}`}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200" /> Due</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200" /> Overdue</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-primary/60" /> Today</span>
      </div>
    </div>
  )
}

// Next-up deadlines: the 4 nearest unfinished due dates with countdowns.
function UpcomingDeadlines({ assignments }) {
  const today = dateKey()
  const upcoming = useMemo(() => {
    return (assignments || [])
      .filter((a) => a.status !== 'completed' && a.due_date)
      .map((a) => ({ a, cd: dueCountdown({ dueKey: isoToKey(a.due_date), completed: false, todayK: today }) }))
      .sort((x, z) => x.cd.days - z.cd.days)
      .slice(0, 4)
  }, [assignments, today])

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 lg:col-span-2">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-semibold text-gray-900">Upcoming deadlines</p>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Nothing due — you're all caught up.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map(({ a, cd }) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                <p className="text-xs text-gray-400">{a.due_date ? formatDate(a.due_date) : ''}</p>
              </div>
              <span className={`shrink-0 inline-block px-2.5 py-1 rounded-full border text-xs font-medium ${COUNTDOWN_META[cd.state]}`}>
                {cd.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
