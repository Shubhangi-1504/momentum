import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { dbService } from '../../services/dbService'
import {
  Search,
  Plus,
  StickyNote,
  ListTodo,
  Code2,
  FileText,
  Trash2,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'

// ============================================
// NotesPage — shared Notes feature for BOTH portals (Phase 1).
// A note belongs to its author only (RLS, migration 009): mentors never
// see student notes and vice versa. Search filters client-side on title
// and content; list shows type badge + preview + updated date.
// Editor is a simple full-page form (rich text / code editor = Phase 2).
// updated_at is maintained automatically by the DB trigger on every save.
// ============================================

const NOTE_TYPES = [
  { value: 'normal', label: 'Note', icon: FileText, badge: 'bg-gray-100 text-gray-600 border-line' },
  { value: 'checklist', label: 'Checklist', icon: ListTodo, badge: 'bg-primary-soft text-primary-dark border-[#c8e6c9]' },
  { value: 'code', label: 'Code', icon: Code2, badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
]

function typeMeta(value) {
  return NOTE_TYPES.find((t) => t.value === value) || NOTE_TYPES[0]
}

function updatedLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return `Today ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function preview(text, max = 120) {
  const flat = (text || '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

export default function NotesPage({ role }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Editor state: null = list view, else the note being edited/created.
  const [editing, setEditing] = useState(null) // { id, title, content, note_type, isNew }
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const flashTimer = useRef(null)

  const loadNotes = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    const { data, error: err } = await dbService.getNotes()
    if (err) {
      console.error('[notes]', err)
      setError(err.message || 'Could not load your notes.')
      setNotes([])
    } else {
      setNotes(data || [])
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => loadNotes(), 0)
    return () => window.clearTimeout(t)
  }, [loadNotes])

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    },
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q)
    )
  }, [notes, query])

  function openNew() {
    setEditing({ id: null, title: '', content: '', note_type: 'normal', isNew: true })
  }

  function openNote(n) {
    setEditing({ id: n.id, title: n.title || '', content: n.content || '', note_type: n.note_type || 'normal', isNew: false })
  }

  function showSaved() {
    setSavedFlash(true)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 2000)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!editing || saving) return
    if (!editing.title.trim()) {
      setError('Please give your note a title.')
      return
    }
    setError(null)
    setSaving(true)
    const payload = {
      title: editing.title.trim(),
      content: editing.content,
      note_type: editing.note_type,
    }
    const res = editing.isNew
      ? await dbService.createNote(payload)
      : await dbService.updateNote(editing.id, payload)
    setSaving(false)
    if (res.error) {
      console.error('[notes] save failed:', res.error)
      setError(res.error.message || 'Could not save the note.')
      return
    }
    const saved = res.data
    setNotes((prev) => {
      const rest = prev.filter((n) => n.id !== saved.id)
      return [saved, ...rest]
    })
    setEditing({ id: saved.id, title: saved.title || '', content: saved.content || '', note_type: saved.note_type || 'normal', isNew: false })
    showSaved()
  }

  async function handleDelete(note) {
    const label = note.title || 'Untitled note'
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    setDeleting(true)
    const { error: err } = await dbService.deleteNote(note.id)
    setDeleting(false)
    if (err) {
      console.error('[notes] delete failed:', err)
      setError(err.message || 'Could not delete the note.')
      return
    }
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    // If the deleted note was open in the editor, return to the list.
    setEditing((cur) => (cur && cur.id === note.id ? null : cur))
  }

  // ============================================
  // EDITOR VIEW
  // ============================================
  if (editing) {
    const typeInfo = typeMeta(editing.note_type)
    return (
      <div className="max-w-4xl mx-auto">
        {/* Editor header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(null)}
              className="p-2.5 bg-white border border-line text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              title="Back to notes"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {editing.isNew ? 'New Note' : 'Edit Note'}
              </h1>
              <p className="text-gray-600 mt-0.5 text-sm">
                Private to you — your notes are never shared.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            {savedFlash && (
              <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
            <button
              onClick={() => handleDelete({ id: editing.id, title: editing.title })}
              disabled={deleting || editing.isNew}
              className="p-2.5 bg-white border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={editing.isNew ? 'Nothing to delete yet' : 'Delete note'}
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors font-medium disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Editor card */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-line shadow-sm p-5 sm:p-6">
          <input
            type="text"
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            placeholder="Note title"
            autoFocus
            className="w-full text-xl md:text-2xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent mb-4"
          />

          {/* Type selector */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {NOTE_TYPES.map((t) => {
              const Icon = t.icon
              const active = editing.note_type === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setEditing({ ...editing, note_type: t.value })}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-primary-soft border-[#c8e6c9] text-primary-dark'
                      : 'bg-white border-line text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              )
            })}
            {editing.note_type === 'code' && (
              <span className="text-xs text-gray-400 italic">
                Plain text for now — code highlighting arrives in Phase 2.
              </span>
            )}
          </div>

          {/* Content */}
          <textarea
            value={editing.content}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            placeholder={
              editing.note_type === 'checklist'
                ? '- Revise DBMS chapter 3\n- Solve 5 DSA problems\n- …'
                : editing.note_type === 'code'
                  ? '// Paste or write your code snippet here'
                  : 'Write your note…'
            }
            rows={16}
            className={`w-full rounded-xl border border-input bg-[#FAFCFB] p-4 text-sm text-gray-900 placeholder-placeholder outline-none focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary transition-colors resize-y ${
              editing.note_type === 'code' ? 'font-mono leading-relaxed' : 'leading-relaxed'
            }`}
          />

          <p className="mt-3 text-xs text-gray-400">
            {typeInfo.label} · saves update the "last updated" time automatically
          </p>
        </form>
      </div>
    )
  }

  // ============================================
  // LIST VIEW
  // ============================================
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Notes</h1>
          <p className="text-gray-600 mt-1.5 text-sm md:text-base">
            Your private space for quick notes, checklists and code snippets.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => loadNotes({ silent: true })}
            className="p-2.5 bg-white border border-line text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            New Note
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your notes…"
          className="w-full pl-12 pr-4 py-3 bg-white border border-input rounded-xl text-sm text-gray-900 placeholder-placeholder outline-none focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary transition-colors"
        />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-line animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-line shadow-sm p-12 text-center">
          <StickyNote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          {query.trim() ? (
            <>
              <p className="text-gray-700 font-medium mb-1">No notes match your search.</p>
              <p className="text-gray-500 text-sm">Try a different keyword.</p>
            </>
          ) : (
            <>
              <p className="text-gray-700 font-medium mb-1">No notes yet.</p>
              <p className="text-gray-500 text-sm mb-5">
                Create your first note to keep study points, checklists and code handy.
              </p>
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                New Note
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n) => {
            const info = typeMeta(n.note_type)
            const Icon = info.icon
            return (
              <div
                key={n.id}
                onClick={() => openNote(n)}
                className="group bg-white rounded-2xl border border-line shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-[#c8e6c9] transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${info.badge}`}
                  >
                    <Icon className="w-3 h-3" />
                    {info.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(n)
                    }}
                    disabled={deleting}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:cursor-wait"
                    title="Delete note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                  {n.title || 'Untitled note'}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 min-h-[3rem]">
                  {preview(n.content) || 'No content yet.'}
                </p>
                <p className="text-[11px] text-gray-400 mt-3">{updatedLabel(n.updated_at)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
