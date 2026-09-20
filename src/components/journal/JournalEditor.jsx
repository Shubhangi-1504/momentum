import { useRef, useState, useCallback } from 'react'
import { Star, Lock, X, Trash2 } from 'lucide-react'
import JournalToolbar from './JournalToolbar'
import { paperBackgroundCss, JOURNAL_MOODS, JOURNAL_PAPERS } from './journalThemes'

// ============================================
// JournalEditor — the large paper sheet editor (Reference 1).
// Purely presentational + local draft state; persistence is owned by
// JournalPage via callbacks (saveNow, patchDraft).
// ============================================

const EMPTY_DRAFT = {
  title: '',
  content: '',
  mood: null,
  tags: [],
  is_starred: false,
  is_visible_to_mentor: false,
  journal_date: '',
}

export default function JournalEditor({
  entry, // the entry being edited (may be an unsaved draft)
  paperStyle = 'plain',
  background = 'botanical',
  savingState = 'idle',
  onDraftChange, // (patch) => void  — live edits for autosave
  onSave, // () => void — flush save now
  onCancel,
  onDelete,
}) {
  const [draft, setDraft] = useState(() =>
    buildInitialDraft(entry, background, paperStyle)
  )
  const [moodOpen, setMoodOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [writingFocused, setWritingFocused] = useState(false)
  const textareaRef = useRef(null)
  const toolbarRef = useRef(null)
  const isDraftEntry = !entry?.id

  // If the parent swaps to a different entry without changing the React key
  // (safety net — JournalPage keys the editor by entry id), re-seed here.
  const entryId = entry?.id
  const [lastSeedId, setLastSeedId] = useState(entryId)
  if (entryId !== lastSeedId) {
    setLastSeedId(entryId)
    setDraft(buildInitialDraft(entry, background, paperStyle))
  }

  const patch = useCallback(
    (p) => {
      setDraft((d) => {
        const next = { ...d, ...p }
        onDraftChange?.(next)
        return next
      })
    },
    [onDraftChange]
  )

  const wordCount = (draft.content || '').trim() ? draft.content.trim().split(/\s+/).length : 0

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

  const paperCss = paperBackgroundCss(paperStyle, JOURNAL_PAPERS.textured.swatch)
  const paperHeightClass = fullscreen
    ? 'h-[calc(100vh-2rem)]'
    : 'min-h-[calc(100vh-8.5rem)] lg:min-h-0 lg:flex-1'

  return (
    <div
      className="relative flex-1 min-w-0 p-3 sm:p-6 overflow-y-auto"
      style={{ background: backgroundChrome(background) }}
    >
      <div className={`mx-auto w-full max-w-3xl ${paperHeightClass} flex flex-col`}>
        {/* Customization strip */}
        <div className="flex items-center justify-end gap-2 mb-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#d8d2bd] bg-white/70
                       text-[#6f6754] hover:bg-white transition-colors"
          >
            ← Notebook
          </button>
        </div>

        {/* Paper sheet */}
        <div
          className="relative flex-1 flex flex-col rounded-lg shadow-[0_18px_45px_-18px_rgba(76,68,45,0.4)]
                     border border-[#e4dcc6] overflow-hidden"
          style={paperCss}
        >
          {/* Title row */}
          <div className="px-5 sm:px-8 pt-6 pb-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 pt-1.5 shrink-0">
                <button
                  onClick={() => patch({ is_starred: !draft.is_starred })}
                  className="p-1 rounded hover:bg-amber-50"
                  title={draft.is_starred ? 'Unstar' : 'Star this entry'}
                >
                  <Star
                    className={`w-5 h-5 ${draft.is_starred ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`}
                  />
                </button>
                <button
                  onClick={() => patch({ is_visible_to_mentor: !draft.is_visible_to_mentor })}
                  className="p-1 rounded hover:bg-emerald-50"
                  title={draft.is_visible_to_mentor ? 'Shared with mentor' : 'Private'}
                >
                  {draft.is_visible_to_mentor ? (
                    <Lock className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-300" />
                  )}
                </button>
              </div>
              <input
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Entry title…"
                className="flex-1 min-w-0 bg-transparent font-serif text-2xl sm:text-3xl text-[#3d4232]
                           placeholder-[#b9b29c] focus:outline-none border-none"
              />
              {confirmDelete ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setConfirmDelete(false)
                      onDelete?.()
                    }}
                    className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete?
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-2 py-1 rounded border border-[#d8d2bd] text-[#6f6754]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                !isDraftEntry && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              )}
            </div>
          </div>

          {/* Toolbar */}
          <JournalToolbar
            entry={draft}
            wordCount={wordCount}
            savingState={savingState}
            focused={writingFocused}
            onDateChange={(journal_date) => patch({ journal_date })}
            onOpenMood={() => setMoodOpen((v) => !v)}
            onOpenTags={() => setTagsOpen((v) => !v)}
            onToggleStar={() => patch({ is_starred: !draft.is_starred })}
            onToggleLock={() => patch({ is_visible_to_mentor: !draft.is_visible_to_mentor })}
            onWrapSelection={wrapSelection}
            onFullscreen={() => setFullscreen((v) => !v)}
            toolbarRef={toolbarRef}
          />

          {/* Mood picker */}
          {moodOpen && (
            <div className="px-5 sm:px-8 py-3 bg-[#f6f2e5]/80 border-b border-[#eee9da]">
              <p className="text-xs text-[#6f6754] mb-2">How are you feeling?</p>
              <div className="flex flex-wrap gap-2">
                {JOURNAL_MOODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      patch({ mood: draft.mood === m.id ? null : m.id })
                      setMoodOpen(false)
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      draft.mood === m.id ? m.classes + ' font-medium' : 'bg-white/70 text-gray-600 border-[#e6e2d3] hover:bg-white'
                    }`}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags editor */}
          {tagsOpen && (
            <TagsEditor tags={draft.tags} onChange={(tags) => patch({ tags })} onDone={() => setTagsOpen(false)} />
          )}

          {/* Writing area */}
          <textarea
            ref={textareaRef}
            value={draft.content}
            onChange={(e) => patch({ content: e.target.value })}
            onKeyDown={handleKeyDown}
            onFocus={() => setWritingFocused(true)}
            onBlur={() => setWritingFocused(false)}
            placeholder="Write your thoughts here..."
            spellCheck={false}
            className="flex-1 w-full resize-none bg-transparent px-5 sm:px-8 py-4 font-serif text-[15.5px] leading-8
                       text-[#42402f] placeholder-[#b9b29c] focus:outline-none border-none
                       bg-[length:28px_28px] bg-local"
            style={{ lineHeight: paperStyle === 'lined' ? '28px' : undefined }}
          />

          {/* Footer actions */}
          <div className="flex items-center justify-between px-5 sm:px-8 py-3 border-t border-[#eee9da] bg-[#fbf8f0]/70">
            <p className="text-[11px] text-[#8b8271] italic">
              {draft.is_visible_to_mentor
                ? 'Shared with your mentor — they can read this entry.'
                : 'Private — only you can read this entry.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg border border-[#d8d2bd] text-[#6f6754]
                           bg-white/70 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="px-5 py-2 text-sm rounded-lg bg-[#3f6b46] text-white font-medium
                           hover:bg-[#355c3c] shadow-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Tags ----------
function TagsEditor({ tags, onChange, onDone }) {
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)

  function add() {
    const t = input.trim().replace(/^#/, '')
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  return (
    <div className="px-5 sm:px-8 py-3 bg-[#f6f2e5]/80 border-b border-[#eee9da]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-[#6f6754]">Tags</p>
        {editing ? (
          <button
            onClick={() => {
              setEditing(false)
              onDone()
            }}
            className="text-xs text-[#3f6b46] font-medium"
          >
            Done
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-[#3f6b46] font-medium">
            Edit tags
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]
                       bg-[#eef2e6] text-[#3f6b46] border border-[#c9d4b4]"
          >
            #{t}
            {editing && (
              <button onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Add tag + Enter"
          className="text-xs bg-transparent border-none focus:outline-none w-32 placeholder-[#b9b29c]"
        />
      </div>
    </div>
  )
}

// ---------- helpers ----------
function buildInitialDraft(entry, background, paperStyle) {
  return {
    ...EMPTY_DRAFT,
    ...entry,
    tags: Array.isArray(entry?.tags) ? entry.tags : [],
    journal_date: entry?.journal_date || todayKey(),
    background: entry?.background || background,
    paper_style: entry?.paper_style || paperStyle,
  }
}
function backgroundChrome(key) {
  switch (key) {
    case 'lightWood':
      return 'linear-gradient(160deg, #f6ecda 0%, #eddcbd 45%, #e5d0ac 100%)'
    case 'cream':
      return 'linear-gradient(160deg, #faf7ee 0%, #f2edde 50%, #ebe4d0 100%)'
    case 'softSage':
      return 'linear-gradient(160deg, #f0f4e8 0%, #e2e9d3 50%, #d8e1c6 100%)'
    case 'warmPaper':
      return 'linear-gradient(160deg, #f7f1e3 0%, #efe6d0 50%, #eaddc4 100%)'
    case 'minimalBeige':
      return 'linear-gradient(160deg, #f7f2e9 0%, #efe7d6 50%, #e7ddc9 100%)'
    case 'botanical':
    default:
      return 'linear-gradient(160deg, #eef0e2 0%, #e4ead3 45%, #dde6c9 100%)'
  }
}

function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
