import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { dueCountdown, dateKey, isoToKey } from '../../utils/consistencyUtils'
import { fireConfetti } from '../../utils/confetti'
import MomentumTrack from '../../components/study/MomentumTrack'
import '../../styles/neo-study.css'
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
  Rocket,
} from 'lucide-react'

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed']
const PRIORITY_OPTIONS = ['low', 'medium', 'high']
const FILTERS = ['all', 'pending', 'in_progress', 'completed', 'overdue']

const STATUS_META = {
  pending: { label: 'Pending', icon: Clock, tone: 'nt-st-pending' },
  in_progress: { label: 'In Progress', icon: PlayCircle, tone: 'nt-st-in_progress' },
  completed: { label: 'Completed', icon: CheckCircle2, tone: 'nt-st-completed' },
  overdue: { label: 'Overdue', icon: AlertCircle, tone: 'nt-st-overdue' },
}

const PRIORITY_META = {
  low: { label: 'Low', tone: 'nt-prio--low' },
  medium: { label: 'Medium', tone: 'nt-prio--medium' },
  high: { label: 'High', tone: 'nt-prio--high' },
}

// COUNTDOWN_META (consistencyUtils) mapped to nt- classes by cd.state —
// presentation only; consistencyUtils.js stays untouched.
const NT_CD_TONE = {
  overdue: 'nt-cd--overdue',
  due_today: 'nt-cd--due-today',
  due_soon: 'nt-cd--due-soon',
  upcoming: 'nt-cd--upcoming',
  completed: 'nt-cd--plain',
  none: 'nt-cd--plain',
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
      if (!editingId) fireConfetti(window.innerWidth / 2, window.innerHeight * 0.4)
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
    <div className="nt-page max-w-6xl mx-auto">
      {/* Header */}
      <div className="nt-head">
        <div>
          <h1 className="nt-title">
            Study <span className="nt-title-hl">Tracker</span>
          </h1>
          <p className="nt-subtitle">Keep track of your assignments and stay ahead.</p>
        </div>
        <div className="nt-head-actions">
          <button
            onClick={loadAssignments}
            className="nt-btn nt-btn--icon"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="nt-btn nt-btn--yellow">
            <Plus className="w-4 h-4" />
            Add Assignment
          </button>
        </div>
      </div>

      {/* Momentum Track */}
      {!loading && !error && (
        <MomentumTrack
          total={counts.total}
          completed={counts.completed}
          overdue={counts.overdue}
        />
      )}

      {/* Summary cards */}
      <div className="nt-stats">
        <SummaryCard label="Total" value={counts.total} icon={ListTodo} variant="total" />
        <SummaryCard label="Pending" value={counts.pending} icon={Clock} variant="pending" />
        <SummaryCard label="In Progress" value={counts.in_progress} icon={PlayCircle} variant="progress" />
        <SummaryCard label="Completed" value={counts.completed} icon={CheckCircle2} variant="completed" />
        <SummaryCard label="Overdue" value={counts.overdue} icon={AlertCircle} variant="overdue" />
      </div>

      {/* Deadline awareness: mini calendar + next-up list */}
      <div className="nt-duo">
        <DeadlineCalendar assignments={assignments} />
        <UpcomingDeadlines assignments={assignments} isOverdue={isOverdue} />
      </div>

      {/* Filters + sort */}
      <div className="nt-toolbar">
        <div className="nt-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`nt-chip ${filter === f ? 'nt-chip--active' : ''}`}
            >
              {f === 'all' ? 'All' : STATUS_META[f].label}
              {f !== 'all' && counts[f] > 0 && <span className="nt-chip-count">{counts[f]}</span>}
            </button>
          ))}
        </div>
        <div className="nt-sort">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="nt-select"
          >
            <option value="due_asc">Due date ↑</option>
            <option value="due_desc">Due date ↓</option>
          </select>
          <ChevronDown className="nt-select-chevron" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList />
      ) : error ? (
        <div className="nt-state">
          <div className="nt-state-iconbox nt-state-iconbox--coral">
            <AlertCircle />
          </div>
          <h3 className="nt-state-title">Something went wrong</h3>
          <p className="nt-state-text">{error}</p>
          <button onClick={loadAssignments} className="nt-btn nt-btn--yellow">
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="nt-state">
          <div className="nt-state-iconbox nt-state-iconbox--green">
            <BookOpen />
          </div>
          <h3 className="nt-state-title">No assignments yet</h3>
          <p className="nt-state-text">Start by adding your first assignment</p>
          <button onClick={openCreate} className="nt-btn nt-btn--yellow">
            <Plus className="w-4 h-4" />
            Add Assignment
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="nt-nomatch">No assignments match this filter.</div>
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
        <div className="nt-toast fixed bottom-6 right-6 z-50 flex items-center gap-2">
          <Check className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, variant }) {
  const shake = variant === 'overdue' && value > 0
  return (
    <div className={`nt-stat nt-stat--${variant}`}>
      <Icon className={`nt-stat-icon ${shake ? 'nt-shake' : ''}`} />
      <p className={`nt-stat-value ${shake ? 'nt-shake' : ''}`}>{value}</p>
      <p className="nt-stat-label">{label}</p>
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="nt-skel-list">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="nt-skel">
          <div className="nt-skel-inner">
            <div className="nt-skel-block nt-skel-ico" />
            <div className="nt-skel-lines">
              <div className="nt-skel-block nt-skel-line1" />
              <div className="nt-skel-block nt-skel-line2" />
            </div>
            <div className="nt-skel-block nt-skel-pill1" />
            <div className="nt-skel-block nt-skel-pill2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AssignmentTable({ rows, isOverdue, onEdit, onDelete, onStatusChange, deletingId }) {
  return (
    <>
      {/* Desktop: ARIA grid table (>=768px, shown/hidden via CSS) */}
      <div className="nt-desk" role="table" aria-label="Assignments">
        <div role="rowgroup">
          <div role="row" className="nt-thead-row">
            <div role="columnheader">Assignment</div>
            <div role="columnheader">Subject</div>
            <div role="columnheader">Due date</div>
            <div role="columnheader">Priority</div>
            <div role="columnheader">Status</div>
            <div role="columnheader">Actions</div>
          </div>
        </div>
        <div role="rowgroup">
          {rows.map((a, i) => {
            const overdue = isOverdue(a)
            const prio = PRIORITY_META[a.priority] || PRIORITY_META.medium
            return (
              <div
                key={a.id}
                role="row"
                className={`nt-row ${a.status === 'completed' ? 'nt-row--done' : ''}`}
                style={{ '--i': Math.min(i, 10) }}
              >
                <div role="cell">
                  <p className="nt-row-title">{a.title}</p>
                  {a.description && <p className="nt-row-desc">{a.description}</p>}
                </div>
                <div role="cell" className="nt-row-subject">{a.subject || '—'}</div>
                <div role="cell" className={`nt-date ${overdue ? 'nt-date--overdue' : ''}`}>
                  <span className="nt-date-top">
                    <CalendarDays />
                    {a.due_date ? formatDate(a.due_date) : '—'}
                  </span>
                  <DueCountdownBadge a={a} />
                </div>
                <div role="cell">
                  <span className={`nt-prio ${prio.tone}`}>{prio.label}</span>
                </div>
                <div role="cell">
                  <StatusSelect a={a} onChange={onStatusChange} />
                </div>
                <div role="cell">
                  <div className="nt-acts">
                    <button
                      onClick={() => onEdit(a)}
                      className="nt-act nt-act--edit"
                      title="Edit"
                      aria-label={`Edit ${a.title}`}
                    >
                      <Pencil />
                    </button>
                    <button
                      onClick={() => onDelete(a)}
                      disabled={deletingId === a.id}
                      className="nt-act nt-act--delete"
                      title="Delete"
                      aria-label={`Delete ${a.title}`}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile cards (<768px, shown/hidden via CSS) */}
      <div className="nt-mob">
        {rows.map((a) => {
          const prio = PRIORITY_META[a.priority] || PRIORITY_META.medium
          return (
            <div key={a.id} className="nt-mcard">
              <div className="nt-mcard-top">
                <div className="nt-mcard-main">
                  <p className="nt-row-title">{a.title}</p>
                  <p className="nt-mcard-meta">
                    {a.subject || 'No subject'} · Due {a.due_date ? formatDate(a.due_date) : '—'}
                  </p>
                  <div className="nt-mcard-cd">
                    <DueCountdownBadge a={a} />
                  </div>
                </div>
                <span className={`nt-prio ${prio.tone}`}>{prio.label}</span>
              </div>
              {a.description && <p className="nt-row-desc nt-mcard-desc">{a.description}</p>}
              <div className="nt-mcard-foot">
                <StatusSelect a={a} onChange={onStatusChange} />
                <div className="nt-acts">
                  <button
                    onClick={() => onEdit(a)}
                    className="nt-act nt-act--edit"
                    title="Edit"
                    aria-label={`Edit ${a.title}`}
                  >
                    <Pencil />
                  </button>
                  <button
                    onClick={() => onDelete(a)}
                    disabled={deletingId === a.id}
                    className="nt-act nt-act--delete"
                    title="Delete"
                    aria-label={`Delete ${a.title}`}
                  >
                    <Trash2 />
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

function StatusSelect({ a, onChange }) {
  const meta = STATUS_META[a.status] || STATUS_META.pending
  const Icon = meta.icon
  const selectRef = useRef(null)

  function handleChange(e) {
    const value = e.target.value
    if (value === 'completed' && a.status !== 'completed') {
      const rect = selectRef.current?.getBoundingClientRect()
      if (rect) fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }
    onChange(a, value)
  }

  return (
    <div className={`nt-statuswrap ${meta.tone}`}>
      <select
        ref={selectRef}
        value={a.status}
        onChange={handleChange}
        className="nt-status"
        aria-label={`Status of ${a.title}`}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
      <Icon className="nt-status-icon" />
      <ChevronDown className="nt-status-chev" />
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
    <span className={`nt-cd ${NT_CD_TONE[cd.state] || 'nt-cd--plain'}`}>
      <Clock className="nt-cd-icon" />
      {cd.label}
    </span>
  )
}

function AssignmentModal({ form, setForm, onClose, onSubmit, saving, editing }) {
  const today = new Date().toISOString().slice(0, 10)
  const [titleError, setTitleError] = useState(false)
  const titleRef = useRef(null)

  function handleFormSubmit(e) {
    if (!form.title.trim()) {
      e.preventDefault()
      setTitleError(true)
      titleRef.current?.focus()
      return
    }
    onSubmit(e)
  }

  const previewCd = dueCountdown({
    dueKey: form.due_date || null,
    completed: form.status === 'completed',
  })
  const prioBg =
    { low: 'nt-pri-bg-low', medium: 'nt-pri-bg-medium', high: 'nt-pri-bg-high' }[form.priority] ||
    'nt-pri-bg-medium'

  return (
    <div className="nt-overlay" role="dialog" aria-modal="true">
      <div className="nt-overlay-bg" onClick={onClose} />
      <div className="nt-modal">
        <div className="nt-peek">
          <PeekMascot />
        </div>
        <div className="nt-modal-head">
          <h2 className="nt-modal-title">
            {editing ? 'Edit ' : 'Add '}
            <span className="nt-hl-green">Assignment</span>
          </h2>
          <button onClick={onClose} className="nt-modal-x" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="nt-modal-sub">
          {editing ? 'Tweak the details and save.' : 'Drop it in now. Future you will say thanks.'}
        </p>

        <div className="nt-preview" key={form.priority}>
          <span className="nt-preview-badge">LIVE PREVIEW</span>
          <span className={`nt-preview-icon ${prioBg}`}>
            <BookOpen />
          </span>
          <span className="nt-preview-body">
            <span className="nt-preview-title">{form.title || 'Your next assignment'}</span>
            <span className="nt-preview-sub">
              {form.subject || 'Subject'} · {form.due_date ? formatDate(form.due_date) : 'No due date'}
            </span>
          </span>
          {previewCd.state !== 'none' && previewCd.state !== 'completed' && (
            <span className={`nt-cd ${NT_CD_TONE[previewCd.state] || 'nt-cd--plain'}`}>
              <Clock className="nt-cd-icon" />
              {previewCd.label}
            </span>
          )}
        </div>

        <form onSubmit={handleFormSubmit} noValidate className="nt-form">
          <div>
            <div className="nt-label-row">
              <label htmlFor="nt-title" className="nt-label">Title *</label>
              {titleError && (
                <span className="nt-title-err" role="alert">Give it a title first</span>
              )}
            </div>
            <input
              id="nt-title"
              ref={titleRef}
              type="text"
              required
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value })
                if (titleError) setTitleError(false)
              }}
              placeholder="e.g. DS Lab Report 3"
              className={`nt-input ${titleError ? 'nt-input--error' : ''}`}
            />
          </div>
          <div className="nt-grid2">
            <div>
              <label htmlFor="nt-subject" className="nt-label">Subject</label>
              <input
                id="nt-subject"
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Data Structures"
                className="nt-input"
              />
            </div>
            <div>
              <label htmlFor="nt-due" className="nt-label">Due date</label>
              <input
                id="nt-due"
                type="date"
                min={editing ? undefined : today}
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="nt-input"
              />
            </div>
            <div className="nt-span2">
              <label htmlFor="nt-start" className="nt-label">Start date</label>
              <input
                id="nt-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="nt-input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="nt-desc" className="nt-label">Description</label>
            <textarea
              id="nt-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details…"
              className="nt-input nt-input--area"
            />
          </div>
          <div className="nt-grid2">
            <div>
              <span id="nt-priority-label" className="nt-label">Priority</span>
              <div role="radiogroup" aria-labelledby="nt-priority-label" className="nt-tg">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={form.priority === p}
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`nt-tg-btn nt-tg-${p} ${form.priority === p ? 'nt-tg-btn--sel' : ''}`}
                  >
                    {PRIORITY_META[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span id="nt-status-label" className="nt-label">Status</span>
              <div role="radiogroup" aria-labelledby="nt-status-label" className="nt-tg">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={form.status === s}
                    onClick={() => setForm({ ...form, status: s })}
                    className={`nt-tg-btn nt-tg-${s} ${form.status === s ? 'nt-tg-btn--sel' : ''}`}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="nt-modal-foot">
            <button type="button" onClick={onClose} className="nt-cancel">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nt-btn nt-btn--yellow nt-btn--submit"
            >
              <Rocket className={`nt-rocket ${saving ? 'nt-rocket--fly' : ''}`} />
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PeekMascot() {
  return (
    <svg viewBox="0 0 56 40" width="56" height="40" aria-hidden="true">
      <rect
        x="4" y="12" width="48" height="40" rx="12"
        fill="#fff" stroke="#111" strokeWidth="3" strokeLinejoin="round"
      />
      <g className="nt-peek-eyes">
        <circle cx="19" cy="28" r="3" fill="#111" />
        <circle cx="37" cy="28" r="3" fill="#111" />
      </g>
      <path d="M23 34 Q28 38 33 34" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 10 L12 16 Q28 22 44 16 L44 10Z" fill="#111" />
      <polygon points="28,0 56,8 28,16 0,8" fill="#111" />
    </svg>
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
    <div className="nt-card">
      <div className="nt-card-head">
        <CalendarDays className="nt-card-icon" />
        <span>{CAL_MONTHS[m]} {y}</span>
      </div>
      <div className="nt-cal-grid">
        {CAL_WEEKDAYS.map((w) => (
          <div key={w} className="nt-cal-wd">{w}</div>
        ))}
        {weeks.flat().map((day, i) => {
          if (!day) return <div key={`p${i}`} className="nt-cal-day nt-cal-day--pad" aria-hidden="true" />
          const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const mark = dueByDay[day]
          const isToday = k === today
          const todayCls = isToday ? `nt-cal-day--today ${mark ? '' : 'nt-cal-day--today-plain'}` : ''
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
              className={`nt-cal-day ${
                mark === 'overdue'
                  ? 'nt-cal-day--overdue'
                  : mark === 'due'
                    ? 'nt-cal-day--due'
                    : ''
              } ${todayCls}`}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="nt-cal-legend">
        <span className="nt-legend-item"><span className="nt-legend-swatch nt-legend-swatch--due" /> Due</span>
        <span className="nt-legend-item"><span className="nt-legend-swatch nt-legend-swatch--overdue" /> Overdue</span>
        <span className="nt-legend-item"><span className="nt-legend-swatch nt-legend-swatch--today" /> Today</span>
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
    <div className="nt-card">
      <div className="nt-card-head">
        <Clock className="nt-card-icon" />
        <span>Upcoming deadlines</span>
      </div>
      {upcoming.length === 0 ? (
        <p className="nt-up-empty">Nothing due — you're all caught up.</p>
      ) : (
        <div className="nt-up-rows">
          {upcoming.map(({ a, cd }) => (
            <div key={a.id} className="nt-up-row">
              <div className="nt-up-info">
                <p className="nt-up-title">{a.title}</p>
                <p className="nt-up-date">{a.due_date ? formatDate(a.due_date) : ''}</p>
              </div>
              <span className={`nt-cd ${NT_CD_TONE[cd.state] || 'nt-cd--plain'}`}>
                {cd.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
