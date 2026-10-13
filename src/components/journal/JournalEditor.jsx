import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Lock, LockOpen, X, Save, Trash2 } from 'lucide-react'
import JournalToolbar from './JournalToolbar'
import JournalCompanion from './JournalCompanion'
import JournalPhotos from './JournalPhotos'
import { JOURNAL_MOODS, JOURNAL_BACKGROUNDS } from './journalThemes'
import { prepareImage } from '../../utils/imageUtils'
import { dbService } from '../../services/dbService'

// ============================================
// JournalEditor — the paper sheet editor.
// Purely presentational + local draft state; persistence is owned by
// JournalPage via callbacks (onDraftChange patch, onSave, onCancel).
//
// Props: entry, paperStyle, background, savingState, onDraftChange,
// onSave, onCancel, onDelete, onToast, onOpenEntries, onShowSidebar,
// sidebarHidden, authUser (for photo upload folder).
// ============================================

const EMPTY_DRAFT = {
  title: '',
  content: '',
  mood: null,
  tags: [],
  images: [],
  is_starred: false,
  is_visible_to_mentor: false,
  journal_date: '',
}

const MOOD_MESSAGES = {
  great: 'That is a good one. Keep it.',
  good: 'Nice. Worth remembering.',
  neutral: 'Steady days count too.',
  bad: 'Rough patch. Get it out, I am listening.',
  terrible: 'That is heavy. Write what you need to. Take your time.',
}

export default function JournalEditor({
  entry,
  paperStyle = 'plain',
  background = 'botanical',
  savingState = 'idle',
  onDraftChange,
  onSave,
  onCancel,
  onDelete,
  onToast,
  onOpenEntries,
  onShowSidebar,
  sidebarHidden,
  authUser,
}) {
  const [draft, setDraft] = useState(() => buildInitialDraft(entry, background, paperStyle))
  const draftRef = useRef(draft)
  const [moodOpen, setMoodOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const textareaRef = useRef(null)

  // ----- companion -----
  const [catMode, setCatMode] = useState('idle') // 'idle' | 'typing' | 'sleep'
  const [catMessage, setCatMessage] = useState('')
  const msgTimer = useRef(null)
  const idleTimer = useRef(null)
  const prevSavingRef = useRef(null)

  function say(message, ms = 3000) {
    setCatMessage(message)
    if (msgTimer.current) window.clearTimeout(msgTimer.current)
    msgTimer.current = ms ? window.setTimeout(() => setCatMessage(''), ms) : null
  }
  useEffect(
    () => () => {
      if (msgTimer.current) window.clearTimeout(msgTimer.current)
    },
    []
  )

  // default/idle companion messages (pure side effect, run once per entry)
  useEffect(() => {
    setCatMode('idle')
    say(entry?.id ? 'Welcome back to this page.' : 'What is on your mind?', 4000)
    idleTimer.current = window.setTimeout(() => setCatMode('sleep'), 9000)
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current)
    }
  }, [entry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // typing state via a content-version counter (no render-phase writes)
  const [typingTick, setTypingTick] = useState(0)
  useEffect(() => {
    if (typingTick === 0) return
    setCatMode('typing')
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setCatMode('sleep'), 9000)
  }, [typingTick])

  // mode-derived idle lines, in an effect (not during render)
  useEffect(() => {
    if (catMode === 'typing') say('I am listening.', 0)
    if (catMode === 'sleep') say('Take your time. I am here.', 6000)
  }, [catMode])

  // saved / star / seal reactions
  useEffect(() => {
    if (prevSavingRef.current === savingState) return
    const was = prevSavingRef.current
    prevSavingRef.current = savingState
    if (savingState === 'saved' && was !== 'saved' && catMode !== 'sleep') {
      say(
        draftRef.current.is_visible_to_mentor
          ? 'Saved. Your mentor can read this one.'
          : 'Saved. Safe with me.',
        2600
      )
    }
  }, [savingState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- G8: patch without state-update-in-updater ----------
  const patch = useCallback(
    (p) => {
      const next = { ...draftRef.current, ...p }
      draftRef.current = next
      setDraft(next)
      onDraftChange?.(next)
      return next
    },
    [onDraftChange]
  )

  // ---------- re-seed on REAL entry switch only (G1 part 2) ----------
  const entryId = entry?.id
  const lastSeedId = useRef(entryId)
  if (entryId !== lastSeedId.current) {
    if (lastSeedId.current && entryId) {
      // real id -> different real id: full re-seed (page turn)
      lastSeedId.current = entryId
      const fresh = buildInitialDraft(entry, background, paperStyle)
      draftRef.current = fresh
      setDraft(fresh)
    } else if (!lastSeedId.current && entryId) {
      // unsaved draft got its id: merge it in, KEEP typed content (G1)
      lastSeedId.current = entryId
      const merged = { ...draftRef.current, id: entryId }
      draftRef.current = merged
      setDraft(merged)
    }
  }

  const wordCount = (draft.content || '').trim()
    ? draft.content.trim().split(/\s+/).length
    : 0

  // ---------- wrap selection ----------
  function wrapSelection(before, after = before, replacement = null) {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const selected = replacement !== null ? replacement : value.slice(s, e)
    const next = value.slice(0, s) + before + selected + after + value.slice(e)
    patch({ content: next })
    requestAnimationFrame(() => {
      el.focus()
      const pos = s + before.length + selected.length + after.length
      el.setSelectionRange(pos, pos)
    })
    setTypingTick((t) => t + 1)
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      onSave?.()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      wrapSelection('**')
    }
  }

  // ---------- AUTO-GROW textarea ----------
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 280)}px`
  }, [draft.content, paperStyle, fullscreen])

  // keep the caret line visible while typing at the bottom
  function handleContentChange(e) {
    patch({ content: e.target.value })
    setTypingTick((t) => t + 1)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      const column = el.closest('.nj-editor-col')
      const caretY = el.offsetTop + el.scrollHeight + 40
      if (column && caretY > column.scrollTop + column.clientHeight) {
        column.scrollTop = caretY - column.clientHeight
      }
    })
  }

  // ---------- photos: signed URLs ----------
  const photos = Array.isArray(draft.images) ? draft.images : []
  const photoPathsKey = photos.map((p) => p.path).join('|')
  const [photoUrls, setPhotoUrls] = useState({})
  const fetchedRef = useRef({})

  useLayoutEffect(() => {
    let cancelled = false
    async function fetchUrls() {
      const missing = photos.filter((p) => p.path && !fetchedRef.current[p.path]).map((p) => p.path)
      if (missing.length === 0) return
      const { data, error } = await dbService.getJournalImageUrls(missing)
      if (cancelled) return
      const map = {}
      missing.forEach((p) => {
        map[p] = (!error && data?.[p]) || null
      })
      Object.assign(fetchedRef.current, map)
      setPhotoUrls((prev) => ({ ...prev, ...map }))
    }
    if (photos.length) fetchUrls()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoPathsKey])

  function handleImageError(path) {
    // refetch this URL once, then give up (stale signed URL)
    if (fetchedRef.current[`err_${path}`]) return
    fetchedRef.current[`err_${path}`] = true
    delete fetchedRef.current[path]
    ;(async () => {
      const { data, error } = await dbService.getJournalImageUrls([path])
      const url = (!error && data?.[path]) || null
      if (url) {
        fetchedRef.current[path] = url
        setPhotoUrls((prev) => ({ ...prev, [path]: url }))
      }
    })()
  }

  // ---------- add photos ----------
  const [uploading, setUploading] = useState([])
  const fileInputRef = useRef(null)

  async function handleFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    let room = 6 - (Array.isArray(draftRef.current.images) ? draftRef.current.images.length : 0)
    if (room <= 0) {
      onToast?.('Up to 6 photos per entry.')
      return
    }
    for (const file of files) {
      if (room <= 0) {
        onToast?.('Up to 6 photos per entry.')
        break
      }
      const key = `up-${Date.now()}-${Math.random().toString(36).slice(2)}`
      try {
        setUploading((u) => [...u, { key, name: file.name }])
        const prepared = await prepareImage(file)
        const { data, error } = await dbService.uploadJournalImage(
          authUser?.id || entry?.student_id,
          prepared.file
        )
        const path = data?.path
        if (error || !path) {
          console.error('Photo upload failed:', error)
          const msg = error?.message || ''
          onToast?.(
            /relation .* does not exist|schema cache|bucket|not found/i.test(msg)
              ? 'Photos need a one-time database update. Ask me to run the Journal photos SQL.'
              : msg || 'Could not upload that photo.'
          )
          continue
        }
        const cur = Array.isArray(draftRef.current.images) ? draftRef.current.images : []
        patch({
          images: [
            ...cur,
            {
              path,
              name: prepared.name,
              size: prepared.file.size,
              w: prepared.width,
              h: prepared.height,
            },
          ],
        })
        room -= 1
      } catch (err) {
        onToast?.(err?.message || 'Could not add that photo.')
      } finally {
        setUploading((u) => u.filter((x) => x.key !== key))
      }
    }
  }

  function removePhoto(path) {
    const cur = Array.isArray(draftRef.current.images) ? draftRef.current.images : []
    patch({ images: cur.filter((im) => im.path !== path) })
  }

  // ---------- drag & drop on the paper ----------
  const [dragOver, setDragOver] = useState(false)
  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer?.files
    if (files?.length) handleFiles(files)
  }

  // ---------- mood / star / seal ----------
  function pickMood(m) {
    const picking = draftRef.current.mood !== m.id
    patch({ mood: picking ? m.id : null })
    if (picking) say(MOOD_MESSAGES[m.id], 5000)
  }
  function toggleStar() {
    const next = !draftRef.current.is_starred
    patch({ is_starred: next })
    say(next ? 'Bookmarked. Easy to find later.' : 'Bookmark removed.', 3000)
  }
  function toggleSeal() {
    const next = !draftRef.current.is_visible_to_mentor
    patch({ is_visible_to_mentor: next })
    say(next ? 'Opened. Your mentor can read this one.' : 'Sealed. Just between us.', 4000)
  }

  const bgDef = JOURNAL_BACKGROUNDS[background] || JOURNAL_BACKGROUNDS.botanical
  const shared = !!draft.is_visible_to_mentor

  return (
    <div
      className="nj-editor-col"
      style={{ background: bgDef.chrome }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="nj-editor-inner">
        {/* ------- top strip ------- */}
        <div className="nj-topstrip">
          {sidebarHidden && (
            <button type="button" className="nj-strip-btn nj-strip-drawer" onClick={onOpenEntries}>
              <PanelIcon /> Entries
            </button>
          )}
          {sidebarHidden && onShowSidebar && (
            <button type="button" className="nj-strip-btn nj-strip-show" onClick={onShowSidebar}>
              <PanelIcon /> Show entries
            </button>
          )}
          {onDelete && (
            <button type="button" className="nj-iconbtn" onClick={onDelete} title="Delete entry" aria-label="Delete entry">
              <Trash2 width={15} height={15} />
            </button>
          )}
          <button type="button" className="nj-strip-btn" onClick={onCancel}>
            ← Notebook
          </button>
        </div>

        {/* ------- companion above the paper (>=720px) ------- */}
        <div className="nj-catdesk">
          <div className="nj-catdesk-inner">
            {catMessage && <div className="nj-cat-bubble">{catMessage}</div>}
            <JournalCompanion
              size={72}
              mood={draft.mood}
              mode={catMode}
              writing={catMode === 'typing'}
              sparkle={savingState === 'saved'}
            />
          </div>
        </div>

        {/* ------- paper sheet ------- */}
        <div
          className={`nj-paperwrap ${dragOver ? 'nj-paperwrap--dragover' : ''}`}
          style={{ backgroundColor: bgDef.paper }}
        >
          <span className="nj-marginline" />
          <span className="nj-hole nj-hole--1" style={{ background: bgDef.chrome }} />
          <span className="nj-hole nj-hole--2" style={{ background: bgDef.chrome }} />
          <span className="nj-hole nj-hole--3" style={{ background: bgDef.chrome }} />

          {/* ribbon bookmark = the star control */}
          <button
            type="button"
            className={`nj-ribbon nj-paper-ribbon ${draft.is_starred ? 'nj-ribbon--on' : ''}`}
            aria-pressed={!!draft.is_starred}
            title={draft.is_starred ? 'Remove bookmark' : 'Bookmark this entry'}
            onClick={toggleStar}
            style={{ right: 22 }}
          >
            <span className="nj-ribbon-outer" />
            <span className="nj-ribbon-inner" />
          </button>

          {/* header + toolbar */}
          <JournalToolbar
            entry={draft}
            wordCount={wordCount}
            savingState={savingState}
            onDateChange={(journal_date) => patch({ journal_date })}
            onTitleChange={(title) => patch({ title })}
            onOpenMood={() => setMoodOpen((v) => !v)}
            onOpenTags={() => setTagsOpen((v) => !v)}
            onWrapSelection={wrapSelection}
            onFullscreen={() => setFullscreen((v) => !v)}
          />

          {/* mood picker */}
          {moodOpen && (
            <div className="nj-moodrow">
              {JOURNAL_MOODS.map((m) => {
                const Icon = m.icon
                const on = draft.mood === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`nj-moodpill ${on ? 'nj-moodpill--on' : ''}`}
                    style={on ? { '--mood-bg': m.hex } : undefined}
                    onClick={() => pickMood(m)}
                  >
                    <Icon />
                    {m.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* tags editor */}
          {tagsOpen && (
            <TagsEditor tags={draft.tags} onChange={(tags) => patch({ tags })} onDone={() => setTagsOpen(false)} />
          )}

          {/* writing area (lined/dotted painted here — G6) */}
          <textarea
            ref={textareaRef}
            value={draft.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Write your thoughts here..."
            spellCheck={false}
            className={`nj-write ${paperStyle === 'lined' ? 'nj-write--lined' : ''} ${
              paperStyle === 'dotted' ? 'nj-write--dotted' : ''
            }`}
          />

          {/* photos */}
          <JournalPhotos
            images={photos}
            urls={photoUrls}
            uploading={uploading}
            onAdd={() => fileInputRef.current?.click()}
            onRemove={removePhoto}
            onImageError={handleImageError}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="nj-file-hidden"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />

          {/* footer: seal + save */}
          <div className="nj-foot">
            <div className="nj-foot-left">
              <button
                type="button"
                className={`nj-seal nj-foot-seal ${shared ? 'nj-seal--open' : ''}`}
                onClick={toggleSeal}
                aria-pressed={shared}
                title={
                  shared
                    ? 'Open: shared with mentor. Click to seal.'
                    : 'Sealed: private. Click to share with mentor.'
                }
              >
                {shared ? <LockOpen /> : <Lock />}
              </button>
              <p className="nj-foot-note">
                {shared
                  ? 'Open. Your mentor can read this entry.'
                  : 'Sealed. Only you can read this entry.'}
                {shared && photos.length > 0 && ' Photos are shared too.'}
              </p>
            </div>
            <button type="button" className="nj-btn nj-save-btn nj-btn--yellow" onClick={onSave}>
              <Save />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- tags ----------
function TagsEditor({ tags, onChange, onDone }) {
  const [input, setInput] = useState('')

  function add() {
    const t = input.trim().replace(/^#/, '')
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  return (
    <div className="nj-tagsrow">
      {tags.map((t) => (
        <span key={t} className="nj-tag">
          #{t}
          <button
            type="button"
            aria-label={`Remove tag ${t}`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
          >
            <X />
          </button>
        </span>
      ))}
      <input
        className="nj-tag-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        placeholder="Add tag + Enter"
        aria-label="Add tag"
      />
      <button type="button" className="nj-tags-done" onClick={onDone}>
        Done
      </button>
    </div>
  )
}

// ---------- helpers ----------
function buildInitialDraft(entry, background, paperStyle) {
  return {
    ...EMPTY_DRAFT,
    ...entry,
    tags: Array.isArray(entry?.tags) ? entry.tags : [],
    images: Array.isArray(entry?.images) ? entry.images : [],
    journal_date: entry?.journal_date || todayKey(),
    background: entry?.background || background,
    paper_style: entry?.paper_style || paperStyle,
  }
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x={3} y={3} width={18} height={18} rx={2.5} />
      <path d="M9 3v18" />
      <path d="M14 9l3 3-3 3" />
    </svg>
  )
}

function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
