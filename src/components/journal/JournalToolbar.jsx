import {
  Calendar, CloudCheck, Pencil, Check, Smile, Tag, ImagePlus,
  Bold, Italic, Underline, Link2, Maximize2, Trash2,
} from 'lucide-react'
import { JOURNAL_MOODS } from './journalThemes'

// ============================================
// JournalToolbar — the neo toolbar row + date/title header.
// Formatting buttons apply to the textarea selection. The old
// "coming soon" buttons and the star/lock buttons (now ribbon
// and seal) are gone.
// ============================================

export default function JournalToolbar({
  entry,
  wordCount,
  savingState, // 'idle' | 'saving' | 'saved' | 'error'
  onDateChange,
  onTitleChange,
  onOpenMood,
  onOpenTags,
  onWrapSelection,
  onFullscreen,
  onPhoto,
  onDelete,
  toolbarRef,
}) {
  const mood = JOURNAL_MOODS.find((m) => m.id === entry?.mood)
  const MoodIcon = mood?.icon || Smile

  return (
    <>
      {/* date line */}
      <label className="nj-date-label" title="Entry date">
        <Calendar />
        <span className="nj-date-line">{friendlyDate(entry?.journal_date || entry?.created_at)}</span>
        <input
          type="date"
          className="nj-date-input"
          aria-label="Entry date"
          value={dateInputValue(entry?.journal_date || entry?.created_at)}
          onChange={(e) => onDateChange?.(e.target.value)}
          onClick={(e) => {
            try {
              e.target.showPicker?.()
            } catch {
              e.target.focus?.()
            }
          }}
        />
      </label>

      {/* title */}
      <input
        className="nj-title-input"
        value={entry?.title || ''}
        onChange={(e) => onTitleChange?.(e.target.value)}
        placeholder="Entry title…"
        aria-label="Entry title"
      />

      {/* feather divider */}
      <div className="nj-feather">
        <span className="nj-feather-line" />
        <Feather />
        <span className="nj-feather-line" />
      </div>

      {/* toolbar row */}
      <div className="nj-toolbar" ref={toolbarRef}>
        <span className="nj-pill nj-pill-saving-state">
          {savingState === 'saving' && (
            <>
              <Pencil /> Saving…
            </>
          )}
          {savingState === 'saved' && (
            <>
              <Check /> Saved
            </>
          )}
          {savingState === 'error' && <>Save failed</>}
          {savingState === 'idle' && (
            <>
              <CloudCheck /> Autosave on
            </>
          )}
        </span>
        <span className="nj-pill">{wordCount} words</span>
        <span className="nj-toolbar-spacer" />

        <ToolbarButton title="Mood" onClick={onOpenMood} active={!!mood}>
          <MoodIcon />
        </ToolbarButton>
        <ToolbarButton title="Tags" onClick={onOpenTags}>
          <Tag />
        </ToolbarButton>
        <ToolbarButton title="Photo" onClick={onPhoto}>
          <ImagePlus />
        </ToolbarButton>
        <span className="nj-toolbar-sep" />
        <ToolbarButton title="Bold" onClick={() => onWrapSelection('**')}>
          <Bold />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => onWrapSelection('*')}>
          <Italic />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => onWrapSelection('_')}>
          <Underline />
        </ToolbarButton>
        <ToolbarButton
          title="Link"
          onClick={() => {
            const url = window.prompt('Link URL:')
            if (url) onWrapSelection('', '', `[link](${url})`)
          }}
        >
          <Link2 />
        </ToolbarButton>
        <ToolbarButton title="Fullscreen" onClick={onFullscreen}>
          <Maximize2 />
        </ToolbarButton>
        {onDelete && (
          <ToolbarButton title="Delete entry" onClick={onDelete}>
            <Trash2 />
          </ToolbarButton>
        )}
      </div>
    </>
  )
}

// --- inline Feather component (local icon box) ---
function Feather() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <path d="M16 8 2 22" />
      <path d="M17.5 15H9" />
    </svg>
  )
}

function ToolbarButton({ title, onClick, active, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`nj-iconbtn ${active ? 'nj-iconbtn--active' : ''}`}
    >
      {children}
    </button>
  )
}

function friendlyDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function dateInputValue(value) {
  if (!value) return todayKey()
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return todayKey()
  return keyOf(d)
}

function keyOf(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function todayKey() {
  return keyOf(new Date())
}
