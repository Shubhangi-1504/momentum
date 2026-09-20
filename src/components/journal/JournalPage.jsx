import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import JournalNotebook from './JournalNotebook'
import JournalSidebar from './JournalSidebar'
import JournalEditor from './JournalEditor'
import JournalCustomizeModal from './JournalCustomizeModal'
import { Menu, RefreshCw, AlertCircle } from 'lucide-react'

// ============================================
// JournalPage — orchestrates the two Journal states:
//   1) LANDING  (JournalNotebook — the physical notebook, Reference 2)
//   2) EDITOR   (JournalSidebar + JournalEditor, Reference 1)
// Owns persistence: loads entries for the logged-in student, creates,
// updates (with debounce autosave), stars, shares, deletes.
// ============================================

export default function JournalPage() {
  const { profile } = useAuth()

  const [view, setView] = useState('landing') // 'landing' | 'editor'
  const [studentId, setStudentId] = useState(null)
  const [entries, setEntries] = useState([])
  const [activeEntryId, setActiveEntryId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const [savingState, setSavingState] = useState('idle') // idle | saving | saved | error
  const saveTimer = useRef(null)
  const toastTimer = useRef(null)
  const dirtyRef = useRef(false)

  const showToast = useCallback((msg) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  // ---------- load ----------
  const loadEntries = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      setError(null)
      try {
        if (!profile?.id) {
          setEntries([])
          return
        }
        const { data: student, error: e1 } = await dbService.getStudentByProfileId(profile.id)
        if (e1) throw e1
        if (!student) throw new Error('Student record not found. Please contact your mentor.')
        setStudentId(student.id)

        const { data, error: e2 } = await dbService.getJournalEntries(student.id)
        if (e2) throw e2
        setEntries(data || [])
      } catch (e) {
        console.error('Failed to load journal:', e)
        setError(e.message || 'Could not load your journal.')
      } finally {
        setLoading(false)
      }
    },
    [profile]
  )

  useEffect(() => {
    const t = window.setTimeout(() => loadEntries(), 0)
    return () => window.clearTimeout(t)
  }, [loadEntries])

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const firstName = useMemo(() => {
    const name = profile?.full_name?.trim()
    return name ? name.split(/\s+/)[0] : 'My'
  }, [profile])

  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeEntryId) || null,
    [entries, activeEntryId]
  )

  // unsaved draft for a brand-new entry (no id yet)
  const [draftNew, setDraftNew] = useState(null)

  // Journal-level preferences (background + paper). Per-entry overrides win.
  const journalBackground = entries[0]?.background || 'botanical'
  const journalPaper = entries[0]?.paper_style || 'plain'

  // ---------- save pipeline ----------
  const persist = useCallback(
    async (draft, { isNew } = {}) => {
      setSavingState('saving')
      try {
        const payload = {
          title: draft.title?.trim() || null,
          content: draft.content ?? '',
          mood: draft.mood || null,
          tags: Array.isArray(draft.tags) ? draft.tags : [],
          is_starred: !!draft.is_starred,
          is_visible_to_mentor: !!draft.is_visible_to_mentor,
          journal_date: draft.journal_date || null,
        }
        if (isNew || !draft.id) {
          const { data, error } = await dbService.createJournalEntry({
            ...payload,
            student_id: studentId,
            background: draft.background || journalBackground,
            paper_style: draft.paper_style || journalPaper,
          })
          if (error) throw error
          setEntries((prev) => [data, ...prev])
          setActiveEntryId(data.id)
          setDraftNew(null)
        } else {
          const { data, error } = await dbService.updateJournalEntry(draft.id, payload)
          if (error) throw error
          setEntries((prev) => prev.map((e) => (e.id === data.id ? data : e)))
        }
        dirtyRef.current = false
        setSavingState('saved')
        window.setTimeout(() => setSavingState((s) => (s === 'saved' ? 'idle' : s)), 1800)
      } catch (e) {
        console.error('Failed to save entry:', e)
        setSavingState('error')
        showToast(e.message || 'Failed to save entry')
      }
    },
    [studentId, journalBackground, journalPaper, showToast]
  )

  const scheduleSave = useCallback(
    (draft) => {
      dirtyRef.current = true
      setSavingState('saving')
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => persist(draft, { isNew: !draft.id }), 900)
    },
    [persist]
  )

  const handleDraftChange = useCallback(
    (next) => {
      if (next.id) {
        setEntries((prev) => prev.map((e) => (e.id === next.id ? { ...e, ...next } : e)))
      } else {
        setDraftNew(next)
      }
      scheduleSave(next)
    },
    [scheduleSave]
  )

  const handleSaveNow = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    const draft = activeEntry || draftNew
    if (!draft) return
    persist(draft, { isNew: !draft.id })
  }, [activeEntry, draftNew, persist])

  // ---------- actions ----------
  function startNewEntry() {
    setActiveEntryId(null)
    setDraftNew({
      title: '',
      content: '',
      mood: null,
      tags: [],
      is_starred: false,
      is_visible_to_mentor: false,
      journal_date: todayKey(),
    })
    setSavingState('idle')
    setView('editor')
    setSidebarOpen(false)
  }

  function openEntry(entry) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    setActiveEntryId(entry.id)
    setDraftNew(null)
    setSavingState('idle')
    setView('editor')
    setSidebarOpen(false)
  }

  function backToNotebook() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    // flush pending edits so the notebook stats stay accurate
    const draft = activeEntry || draftNew
    if (dirtyRef.current && draft) persist(draft, { isNew: !draft.id })
    setView('landing')
  }

  async function handleToggleStar(entry) {
    const next = !entry.is_starred
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_starred: next } : e)))
    if (activeEntryId === entry.id) setSavingState('saving')
    const { error } = await dbService.updateJournalEntry(entry.id, { is_starred: next })
    if (error) {
      showToast(error.message || 'Failed to update star')
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_starred: entry.is_starred } : e)))
    } else if (activeEntryId === entry.id) {
      setSavingState('saved')
      window.setTimeout(() => setSavingState((s) => (s === 'saved' ? 'idle' : s)), 1800)
    }
  }

  function handleNotebookPrivacy() {
    if (entries.length === 0) {
      showToast('Your entries are private by default. Toggle the lock inside an entry to share it.')
      return
    }
    setView('editor')
    setSidebarOpen(true)
    showToast('Open an entry and click its lock icon to change sharing')
  }

  function confirmDelete(entry) {
    if (window.confirm(`Delete “${entry.title || 'Untitled entry'}”? This cannot be undone.`)) {
      doDelete(entry)
    }
  }

  async function doDelete(entry) {
    // optimistic removal
    const prevEntries = entries
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    if (activeEntryId === entry.id) {
      setActiveEntryId(null)
      setDraftNew(null)
    }
    const { error } = await dbService.deleteJournalEntry(entry.id)
    if (error) {
      setEntries(prevEntries)
      showToast(error.message || 'Failed to delete entry')
    } else {
      showToast('Entry deleted')
    }
  }

  // Customize: persists prefs on the most recent entry (journal-level default)
  // so the whole notebook picks them up next load.
  async function applyCustomization({ background, paperStyle }) {
    setCustomizeOpen(false)
    const anchor = activeEntry || entries[0]
    if (!anchor || !anchor.id) {
      showToast('Customization will apply to your first entry')
      return
    }
    const updates = {}
    if (background) updates.background = background
    if (paperStyle) updates.paper_style = paperStyle
    // optimistic
    setEntries((prev) =>
      prev.map((e) => (e.id === anchor.id ? { ...e, ...updates } : e))
    )
    const { error } = await dbService.updateJournalEntry(anchor.id, updates)
    if (error) showToast(error.message || 'Failed to save customization')
    else showToast('Journal customized')
  }

  const starredCount = entries.filter((e) => e.is_starred).length

  // ---------- render ----------
  if (loading && entries.length === 0 && !error) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-[#8a9b74]" />
      </div>
    )
  }

  if (view === 'landing') {
    return (
      <div className="-m-6">
        <JournalNotebook
          firstName={firstName}
          entryCount={entries.length}
          starredCount={starredCount}
          background={journalBackground}
          isLockedDefault={!entries.some((e) => e.is_visible_to_mentor)}
          onNewEntry={startNewEntry}
          onViewEntries={() => {
            setView('editor')
            setSidebarOpen(true)
          }}
          onCustomize={() => setCustomizeOpen(true)}
          onToggleLock={handleNotebookPrivacy}
        />
        <JournalCustomizeModal
          open={customizeOpen}
          background={journalBackground}
          paperStyle={journalPaper}
          onApply={applyCustomization}
          onClose={() => setCustomizeOpen(false)}
        />
      </div>
    )
  }

  const editorEntry = activeEntry || draftNew

  return (
    <div className="-m-6 flex flex-col lg:flex-row h-[calc(100vh-0px)] lg:h-screen overflow-hidden">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#e6e2d3]">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-[#f4f0e2]">
          <Menu className="w-5 h-5 text-[#6f6754]" />
        </button>
        <span className="text-sm font-medium text-[#3d4232]">{firstName}&apos;s Journal</span>
        <button onClick={backToNotebook} className="p-1.5 rounded-lg hover:bg-[#f4f0e2]">
          <span className="text-xs text-[#5f7a4f] font-medium">Notebook</span>
        </button>
      </div>

      <JournalSidebar
        firstName={firstName}
        entries={entries}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        activeEntryId={activeEntryId}
        onSelectEntry={openEntry}
        onNewEntry={startNewEntry}
        onBackToNotebook={backToNotebook}
        onDeleteEntry={confirmDelete}
        onToggleStar={handleToggleStar}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {error && !editorEntry ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={() => loadEntries()}
              className="mt-3 px-4 py-2 text-sm rounded-lg bg-[#3f6b46] text-white hover:bg-[#355c3c]"
            >
              Try again
            </button>
          </div>
        </div>
      ) : editorEntry ? (
        <JournalEditor
          key={editorEntry.id || 'new'}
          entry={editorEntry}
          paperStyle={editorEntry.paper_style || journalPaper}
          background={editorEntry.background || journalBackground}
          savingState={savingState}
          onDraftChange={handleDraftChange}
          onSave={handleSaveNow}
          onCancel={backToNotebook}
          onDelete={() => confirmDelete(editorEntry)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #eef0e2 0%, #dde6c9 100%)' }}>
          <div className="text-center px-6">
            <p className="font-serif text-xl text-[#3d4232] mb-2">Select an entry to read</p>
            <p className="text-sm text-[#6f6754] mb-5">Or start a fresh page in your journal.</p>
            <button
              onClick={startNewEntry}
              className="px-5 py-2.5 rounded-xl bg-[#3f6b46] text-white text-sm font-medium hover:bg-[#355c3c] transition-colors"
            >
              + New Entry
            </button>
          </div>
        </div>
      )}

      <JournalCustomizeModal
        open={customizeOpen}
        background={journalBackground}
        paperStyle={journalPaper}
        onApply={applyCustomization}
        onClose={() => setCustomizeOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#3d4232] text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
