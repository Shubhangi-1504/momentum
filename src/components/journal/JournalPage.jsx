import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import JournalNotebook from './JournalNotebook'
import JournalSidebar from './JournalSidebar'
import JournalEditor from './JournalEditor'
import JournalCustomizeModal from './JournalCustomizeModal'
import { Menu, AlertCircle } from 'lucide-react'
import '../../styles/neo-journal.css'

// ============================================
// JournalPage — orchestrates the two Journal states:
//   1) LANDING  (JournalNotebook — the physical notebook)
//   2) EDITOR   (JournalSidebar + JournalEditor)
// Owns persistence: loadEntries, create/update/delete, autosave,
// star/share/delete flows, customization, photo cleanup.
// ============================================

const SIDEBAR_PREF_KEY = 'momentum.journal.sidebarHidden'

function readSidebarPref() {
  try {
    return window.localStorage.getItem(SIDEBAR_PREF_KEY) === '1'
  } catch {
    return false
  }
}
function writeSidebarPref(hidden) {
  try {
    if (hidden) window.localStorage.setItem(SIDEBAR_PREF_KEY, '1')
    else window.localStorage.removeItem(SIDEBAR_PREF_KEY)
  } catch {
    // storage unavailable — preference just won't persist
  }
}

export default function JournalPage() {
  const { profile, user } = useAuth()

  const [view, setView] = useState('landing') // 'landing' | 'editor'
  const [studentId, setStudentId] = useState(null)
  const [entries, setEntries] = useState([])
  const [activeEntryId, setActiveEntryId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile drawer
  const [sidebarHidden, setSidebarHidden] = useState(readSidebarPref) // desktop pref
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const [savingState, setSavingState] = useState('idle') // idle | saving | saved | error
  const saveTimer = useRef(null)
  const toastTimer = useRef(null)
  const dirtyRef = useRef(false)

  // G1: stable editor key — the id at the moment the editor was opened.
  // Does NOT flip when a NEW draft receives its id during the first save.
  const [editorKey, setEditorKey] = useState('new-0')

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

  // Clean up timers on unmount
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

  // ---------- saved image paths bookkeeping (for storage cleanup) ----------
  const savedImagePathsRef = useRef(new Map()) // entryId -> [paths]
  useEffect(() => {
    for (const e of entries) {
      if (Array.isArray(e.images)) savedImagePathsRef.current.set(e.id, e.images.map((i) => i.path))
    }
  }, [entries])

  function cleanupRemovedImages(entryId, prevList, nextList) {
    const removed = prevList.filter((p) => !nextList.includes(p))
    if (removed.length) {
      dbService.deleteJournalImages(removed).catch(() => {
        // best-effort: ignore errors (entry may be mid-save)
      })
    }
    savedImagePathsRef.current.set(entryId, nextList)
  }

  // ---------- save pipeline ----------
  const persistRef = useRef(null)
  const createdIdRef = useRef(null)

  const persist = useCallback(
    async (draft, { isNew } = {}) => {
      setSavingState('saving')
      try {
        // photos: include `images` only when the draft has photos or the
        // loaded entry already carried an images property (pre-migration safe)
        const hasImagesColumn =
          (Array.isArray(draft.images) && draft.images.length > 0) ||
          (draft.id != null && 'images' in draft)
        const payload = {
          title: draft.title?.trim() || null,
          content: draft.content ?? '',
          mood: draft.mood || null,
          tags: Array.isArray(draft.tags) ? draft.tags : [],
          is_starred: !!draft.is_starred,
          is_visible_to_mentor: !!draft.is_visible_to_mentor,
          journal_date: draft.journal_date || null,
          ...(hasImagesColumn ? { images: Array.isArray(draft.images) ? draft.images : [] } : {}),
        }
        const prevImages = draft.id ? savedImagePathsRef.current.get(draft.id) || [] : []

        if (isNew || !draft.id) {
          const { data, error } = await dbService.createJournalEntry({
            ...payload,
            student_id: studentId,
            background: draft.background || journalBackground,
            paper_style: draft.paper_style || journalPaper,
          })
          if (error) throw error
          createdIdRef.current = data.id // captured for the G2 follow-up update
          setEntries((prev) => [data, ...prev])
          setActiveEntryId(data.id)
          setDraftNew(null)
          if (Array.isArray(data.images)) {
            savedImagePathsRef.current.set(data.id, data.images.map((i) => i.path))
          }
        } else {
          const { data, error } = await dbService.updateJournalEntry(draft.id, payload)
          if (error) throw error
          setEntries((prev) => prev.map((e) => (e.id === data.id ? data : e)))
          if (Array.isArray(data.images)) {
            cleanupRemovedImages(data.id, prevImages, data.images.map((i) => i.path))
          }
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
  useEffect(() => {
    persistRef.current = persist
  }, [persist])

  // G2: guard concurrent creates. While a create request is in flight,
  // remember the latest draft; when it finishes, UPDATE the new id with
  // that draft instead of creating again.
  const creatingRef = useRef(false)
  const latestDraftRef = useRef(null)

  const scheduleSave = useCallback((draft) => {
    dirtyRef.current = true
    setSavingState('saving')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => persistRef.current?.(draft, { isNew: !draft.id }), 900)
  }, [])

  const handleDraftChange = useCallback(
    (next) => {
      if (next.id) {
        setEntries((prev) => prev.map((e) => (e.id === next.id ? { ...e, ...next } : e)))
      } else {
        setDraftNew(next)
      }
      if (creatingRef.current) {
        // a create is in flight — remember the latest draft; the finished
        // create is immediately followed by an update with it (G2)
        latestDraftRef.current = next
        return
      }
      scheduleSave(next)
    },
    [scheduleSave]
  )

  // Wrap persist to install the G2 guard WITHOUT modifying its logic.
  const guardedPersist = useCallback(
    async (draft, opts = {}) => {
      if ((opts.isNew || !draft.id) && creatingRef.current) {
        return // the running create will be followed by an update
      }
      if (opts.isNew || !draft.id) {
        creatingRef.current = true
        try {
          const result = await persist(draft, opts)
          creatingRef.current = false
          // create finished — if the user typed during the request,
          // immediately update the new row with the latest draft (G2)
          const newId = createdIdRef.current
          const latest = latestDraftRef.current
          if (newId && latest && !latest.id) {
            latestDraftRef.current = null
            const merged = { ...latest, id: newId }
            await persistRef.current?.(merged, { isNew: false })
          }
          return result
        } catch (e) {
          creatingRef.current = false
          throw e
        }
      }
      return persist(draft, opts)
    },
    [persist]
  )
  const guardedPersistRef = useRef(guardedPersist)
  useEffect(() => {
    guardedPersistRef.current = guardedPersist
  }, [guardedPersist])

  function handleSaveNow() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    // reads the current render's draft directly (Save / Cmd+S)
    const draft = activeEntry || draftNew
    if (!draft) return
    guardedPersistRef.current?.(draft, { isNew: !draft.id })
  }

  // ---------- actions ----------
  function startNewEntry(initialContent) {
    setActiveEntryId(null)
    setDraftNew({
      title: '',
      content: initialContent ? initialContent + '\n\n' : '',
      mood: null,
      tags: [],
      images: [],
      is_starred: false,
      is_visible_to_mentor: false,
      journal_date: todayKey(),
    })
    setEditorKey(`new-${Date.now()}`)
    setSavingState('idle')
    setView('editor')
    setSidebarOpen(false)
  }

  function openEntry(entry) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    setActiveEntryId(entry.id)
    setDraftNew(null)
    setEditorKey(entry.id)
    setSavingState('idle')
    setView('editor')
    setSidebarOpen(false)
  }

  function backToNotebook() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    // flush pending edits so the notebook stats stay accurate
    const draft = activeEntry || draftNew
    if (dirtyRef.current && draft) guardedPersistRef.current?.(draft, { isNew: !draft.id })
    setView('landing')
  }

  async function handleToggleStar(entry) {
    const next = !entry.is_starred
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_starred: next } : e)))
    if (activeEntryId === entry.id) setSavingState('saving')
    const { error } = await dbService.updateJournalEntry(entry.id, { is_starred: next })
    if (error) {
      showToast(error.message || 'Failed to update bookmark')
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_starred: entry.is_starred } : e)))
    } else if (activeEntryId === entry.id) {
      setSavingState('saved')
      window.setTimeout(() => setSavingState((s) => (s === 'saved' ? 'idle' : s)), 1800)
    }
  }

  function handleNotebookPrivacy() {
    if (entries.length === 0) {
      showToast('Your journal is sealed. Toggle the wax seal inside an entry to share it.')
      return
    }
    setView('editor')
    setSidebarOpen(true)
    showToast('Open an entry and click its wax seal to change sharing')
  }

  function confirmDelete(entry) {
    if (window.confirm(`Delete “${entry.title || 'Untitled entry'}”? This cannot be undone.`)) {
      doDelete(entry)
    }
  }

  async function doDelete(entry) {
    const entryImages = Array.isArray(entry.images) ? entry.images.map((i) => i.path) : []
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
      savedImagePathsRef.current.delete(entry.id)
      if (entryImages.length) {
        dbService.deleteJournalImages(entryImages).catch(() => {
          // best-effort storage cleanup
        })
      }
      showToast('Entry deleted')
    }
  }

  // Customize: persists prefs on the most recent entry (journal-level default)
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
    setEntries((prev) => prev.map((e) => (e.id === anchor.id ? { ...e, ...updates } : e)))
    const { error } = await dbService.updateJournalEntry(anchor.id, updates)
    if (error) showToast(error.message || 'Failed to save customization')
    else showToast('Journal customized')
  }

  // ---------- hide-sidebar plumbing ----------
  function hideSidebar() {
    setSidebarHidden(true)
    writeSidebarPref(true)
  }
  function showSidebar() {
    setSidebarHidden(false)
    writeSidebarPref(false)
  }
  function openEntriesDrawer() {
    setSidebarOpen(true)
  }

  const starredCount = entries.filter((e) => e.is_starred).length
  const entryDates = useMemo(
    () => entries.map((e) => (e.journal_date || '').slice(0, 10)).filter(Boolean),
    [entries]
  )

  // ---------- render ----------

  if (loading && entries.length === 0 && !error) {
    return (
      <div className="nj-root nj-landing" style={{ background: '#ffd93d' }}>
        <div className="nj-landing-inner">
          <div className="nj-spinner" />
        </div>
      </div>
    )
  }

  if (view === 'landing') {
    return (
      <div className="nj-root nj-landing" data-sidebar={sidebarHidden ? 'hidden' : 'visible'}>
        <JournalNotebook
          firstName={firstName}
          entryCount={entries.length}
          starredCount={starredCount}
          background={journalBackground}
          isLockedDefault={!entries.some((e) => e.is_visible_to_mentor)}
          entryDates={entryDates}
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
        {toast && <div className="nj-toast">{toast}</div>}
      </div>
    )
  }

  const editorEntry = activeEntry || draftNew

  return (
    <div className="nj-root nj-editor" data-sidebar={sidebarHidden ? 'hidden' : 'visible'}>
      {/* Mobile top bar (compact — G5) */}
      <div className="nj-topbar">
        <button className="nj-iconbtn" onClick={() => setSidebarOpen(true)} aria-label="Open entries">
          <Menu width={16} height={16} />
        </button>
        <span className="nj-topbar-title">{firstName}&apos;s Journal</span>
        <button className="nj-iconbtn" onClick={backToNotebook} title="Back to notebook" aria-label="Back to notebook">
          <span style={{ fontSize: 10, fontWeight: 800 }}>NB</span>
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
        onNewEntry={() => startNewEntry()}
        onBackToNotebook={backToNotebook}
        onDeleteEntry={confirmDelete}
        onToggleStar={handleToggleStar}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        onHideSidebar={hideSidebar}
      />

      {error && !editorEntry ? (
        <div className="nj-editor-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffd93d' }}>
          <div className="nj-state-card">
            <AlertCircle />
            <p className="nj-error-text" style={{ margin: 0 }}>{error}</p>
            <button className="nj-btn nj-btn--yellow" onClick={() => loadEntries()}>
              Try again
            </button>
          </div>
        </div>
      ) : editorEntry ? (
        <JournalEditor
          key={editorKey}
          entry={editorEntry}
          paperStyle={editorEntry.paper_style || journalPaper}
          background={editorEntry.background || journalBackground}
          savingState={savingState}
          onDraftChange={handleDraftChange}
          onSave={handleSaveNow}
          onCancel={backToNotebook}
          onDelete={editorEntry.id ? () => confirmDelete(editorEntry) : null}
          onToast={showToast}
          sidebarHidden={sidebarHidden}
          onOpenEntries={openEntriesDrawer}
          onShowSidebar={showSidebar}
          authUser={user ? { id: user.id } : profile ? { id: profile.id } : null}
        />
      ) : (
        <div className="nj-editor-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffd93d' }}>
          <div className="nj-state-card">
            <p className="nj-plate-title" style={{ fontSize: 20, margin: 0 }}>Select an entry to read</p>
            <p style={{ margin: 0 }}>Or start a fresh page in your journal.</p>
            <button className="nj-btn nj-btn--black" onClick={() => startNewEntry()}>
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

      {toast && <div className="nj-toast">{toast}</div>}
    </div>
  )
}

function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
