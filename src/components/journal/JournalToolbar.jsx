import {
  Star, Lock, Unlock, Calendar, MoreHorizontal, Lightbulb, Hourglass, Tag,
  Image as ImageIcon, Bold, Italic, Underline, Link2, Maximize2,
} from 'lucide-react'
import { JOURNAL_MOODS } from './journalThemes'

// ============================================
// JournalToolbar — icon strip inside the editor header (Reference 1).
// Formatting actions apply to the current textarea selection.
// ============================================

export default function JournalToolbar({
  entry,
  wordCount,
  savingState, // 'idle' | 'saving' | 'saved' | 'error'
  onDateChange,
  onOpenMood,
  onOpenTags,
  onToggleStar,
  onToggleLock,
  onWrapSelection,
  onFullscreen,
  toolbarRef,
}) {
  const starred = !!entry?.is_starred
  const shared = !!entry?.is_visible_to_mentor
  const mood = JOURNAL_MOODS.find((m) => m.id === entry?.mood)

  return (
    <div
      ref={toolbarRef}
      className="flex items-center justify-between gap-2 px-4 py-2 border-b border-[#eee9da] bg-[#fbf8f0]/60"
    >
      {/* Left: date + words */}
      <div className="flex items-center gap-2 min-w-0">
        <label
          className="hidden sm:flex items-center gap-1.5 text-xs text-[#6f6754] whitespace-nowrap cursor-pointer"
          title="Entry date"
        >
          <Calendar className="w-3.5 h-3.5" />
          <input
            type="date"
            value={dateInputValue(entry?.journal_date || entry?.created_at)}
            onChange={(e) => onDateChange?.(e.target.value)}
            className="bg-transparent text-xs text-[#6f6754] focus:outline-none cursor-pointer
                       [color-scheme:light] w-[7.5rem]"
          />
        </label>
        <span className="w-px h-4 bg-[#e6e2d3]" />
        <span className="text-xs text-[#6f6754] whitespace-nowrap">{wordCount} words</span>
        {savingState === 'saving' && (
          <span className="flex items-center gap-1 text-xs text-[#8a9b74] italic whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8a9b74] animate-pulse" />
            Saving…
          </span>
        )}
        {savingState === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-[#3f6b46] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3f6b46]" />
            Saved
          </span>
        )}
        {savingState === 'error' && (
          <span className="text-xs text-red-600 whitespace-nowrap">Save failed</span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5 text-[#6f6754]">
        <ToolbarButton title="Mood / reflection" icon={Lightbulb} onClick={onOpenMood} active={!!mood}>
          {mood && <span className="text-[11px] ml-0.5">{mood.emoji}</span>}
        </ToolbarButton>
        <ToolbarButton title="Reminder (coming soon)" icon={Hourglass} disabled />
        <ToolbarButton title="Tags" icon={Tag} onClick={onOpenTags} />
        <ToolbarButton title="Attach image (coming soon)" icon={ImageIcon} disabled />
        <span className="w-px h-4 bg-[#e6e2d3] mx-1" />
        <ToolbarButton title="Bold" icon={Bold} onClick={() => onWrapSelection('**')} />
        <ToolbarButton title="Italic" icon={Italic} onClick={() => onWrapSelection('*')} />
        <ToolbarButton title="Underline" icon={Underline} onClick={() => onWrapSelection('_')} />
        <ToolbarButton
          title="Insert link"
          icon={Link2}
          onClick={() => {
            const url = window.prompt('Link URL:')
            if (url) onWrapSelection('', '', `[link](${url})`)
          }}
        />
        <span className="w-px h-4 bg-[#e6e2d3] mx-1" />
        <ToolbarButton
          title={starred ? 'Unstar entry' : 'Star entry'}
          onClick={onToggleStar}
          active={starred}
        >
          <Star className={`w-4 h-4 ${starred ? 'fill-amber-400 text-amber-500' : ''}`} />
        </ToolbarButton>
        <ToolbarButton
          title={shared ? 'Shared with mentor — click to make private' : 'Private — click to share with mentor'}
          onClick={onToggleLock}
          active={shared}
        >
          {shared ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4" />}
        </ToolbarButton>
        <ToolbarButton title="Fullscreen" onClick={onFullscreen}>
          <Maximize2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="More options (coming soon)" icon={MoreHorizontal} disabled />
      </div>
    </div>
  )
}

function ToolbarButton({ icon: Icon, title, onClick, active, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-md transition-colors focus:outline-none
        ${active ? 'bg-[#eef2e6] text-[#3f6b46]' : 'hover:bg-[#f0ecdd]'}
        ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children || (Icon ? <Icon className="w-4 h-4" /> : null)}
    </button>
  )
}

function dateInputValue(value) {
  if (!value) return todayKey()
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return todayKey()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
