import {
  Search, Plus, Star, Lock, LockOpen, Trash2, ArrowLeft, X,
  PanelLeftClose, Camera,
} from 'lucide-react'
import { moodMeta } from './journalThemes'

// ============================================
// JournalSidebar — 220px cream column beside the editor.
// Search + filter chips + mood-this-week + entry cards.
// On <1024px it becomes a fixed drawer (classes from neo-journal.css).
// NEW props: onHideSidebar (desktop collapse), photoCount via entry.images.
// ============================================

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function JournalSidebar({
  entries = [],
  filter = 'all', // 'all' | 'starred'
  onFilterChange,
  search,
  onSearchChange,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onBackToNotebook,
  onDeleteEntry,
  onToggleStar,
  mobileOpen,
  onCloseMobile,
  onHideSidebar,
}) {
  const query = search.trim().toLowerCase()
  const visible = entries.filter((e) => {
    if (filter === 'starred' && !e.is_starred) return false
    if (!query) return true
    const tags = Array.isArray(e.tags) ? e.tags.join(' ') : ''
    return (
      (e.title || '').toLowerCase().includes(query) ||
      (e.content || '').toLowerCase().includes(query) ||
      tags.toLowerCase().includes(query)
    )
  })
  const starredCount = entries.filter((e) => e.is_starred).length

  // last 7 local days: most recent entry with a mood per day
  const moodWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = dateKeyOf(d)
    const dayEntries = entries
      .filter((e) => (e.journal_date || '').slice(0, 10) === key && e.mood)
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    return { key, initial: WEEKDAY_INITIALS[d.getDay()], mood: dayEntries[0]?.mood || null }
  })

  return (
    <>
      {/* Drawer backdrop (mobile/tablet only — CSS hides it on desktop) */}
      {mobileOpen && <div className="nj-backdrop" onClick={onCloseMobile} />}

      <aside
        className={`nj-sidebar nj-drawer ${mobileOpen ? 'nj-open' : ''}`}
        aria-label="Journal entries"
      >
        {/* Header */}
        <div className="nj-side-head">
          <button type="button" className="nj-side-back" onClick={onBackToNotebook} title="Back to notebook">
            <ArrowLeft width={16} height={16} />
            Journal
          </button>
          {onHideSidebar && (
            <button type="button" className="nj-iconbtn nj-mobile-hidden" onClick={onHideSidebar} title="Hide entries">
              <PanelLeftClose width={15} height={15} />
            </button>
          )}
          <button type="button" className="nj-iconbtn nj-mobile-only" onClick={onCloseMobile} aria-label="Close entries">
            <X width={15} height={15} />
          </button>
        </div>

        {/* Search */}
        <div className="nj-side-search">
          <Search />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search journal..."
            aria-label="Search journal"
          />
        </div>

        {/* Filter chips */}
        <div className="nj-chips">
          <button
            type="button"
            className={`nj-chip ${filter === 'all' ? 'nj-chip--on' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`nj-chip ${filter === 'starred' ? 'nj-chip--on' : ''}`}
            onClick={() => onFilterChange('starred')}
          >
            <Star />&nbsp;{starredCount}
          </button>
        </div>

        {/* MOOD THIS WEEK */}
        <div className="nj-moodweek">
          <p className="nj-moodweek-label">MOOD THIS WEEK</p>
          <div className="nj-moodweek-row">
            {moodWeek.map((d) => {
              const meta = moodMeta(d.mood)
              const Icon = meta?.icon
              return (
                <div
                  key={d.key}
                  className="nj-mood-day"
                  style={meta ? { background: meta.hex } : undefined}
                  title={`${d.initial}${meta ? ` · ${meta.label}` : ''}`}
                >
                  {Icon && <Icon />}
                </div>
              )
            })}
          </div>
        </div>

        {/* New Entry */}
        <button type="button" className="nj-btn nj-side-new nj-btn--black" onClick={onNewEntry}>
          <Plus />
          New Entry
        </button>

        {/* Entry list */}
        <div className="nj-list nj-card--stagger">
          {visible.length === 0 ? (
            <p className="nj-list-empty">
              {query ? 'No entries match your search.' : 'Your journal is empty. Write your first page!'}
            </p>
          ) : (
            visible.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                active={entry.id === activeEntryId}
                onClick={() => {
                  onSelectEntry(entry)
                  onCloseMobile?.()
                }}
                onDelete={() => onDeleteEntry(entry)}
                onToggleStar={() => onToggleStar(entry)}
              />
            ))
          )}
        </div>
      </aside>
    </>
  )
}

// ---------- entry card ----------
function EntryCard({ entry, active, onClick, onDelete, onToggleStar }) {
  const meta = moodMeta(entry.mood)
  const MoodIcon = meta?.icon
  const photoCount = Array.isArray(entry.images) ? entry.images.length : 0

  return (
    <div
      role="button"
      tabIndex={0}
      className={`nj-card ${active ? 'nj-card--active' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* revealed row actions */}
      <div className="nj-card-actions">
        <button
          type="button"
          className="nj-cardact"
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar()
          }}
          title={entry.is_starred ? 'Remove bookmark' : 'Bookmark entry'}
          aria-label={entry.is_starred ? 'Remove bookmark' : 'Bookmark entry'}
        >
          <Star
            width={13}
            height={13}
            style={entry.is_starred ? { fill: '#ff6b6b' } : undefined}
          />
        </button>
        <button
          type="button"
          className="nj-cardact"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="Delete entry"
          aria-label="Delete entry"
        >
          <Trash2 width={13} height={13} />
        </button>
      </div>

      {entry.is_starred && <span className="nj-card-ribbon" />}

      <div className="nj-card-top">
        <span className="nj-card-date">{formatEntryDate(entry.journal_date || entry.created_at)}</span>
        <span className="nj-card-meta">
          {MoodIcon && <MoodIcon />}
          {entry.is_visible_to_mentor ? (
            <LockOpen style={{ color: '#0d8f81' }} title="Shared" />
          ) : (
            <Lock style={{ color: '#999999' }} title="Private" />
          )}
          {photoCount > 0 && (
            <span className="nj-card-photo">
              <Camera width={11} height={11} />
              {photoCount}
            </span>
          )}
        </span>
      </div>
      <p className="nj-card-title">{entry.title || 'Untitled entry'}</p>
    </div>
  )
}

function formatEntryDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function dateKeyOf(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
