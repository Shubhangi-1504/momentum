import { Search, Plus, List, Star, Lock, Unlock, Trash2, ArrowLeft, BookOpen, X } from 'lucide-react'
import { moodMeta } from './journalThemes'

// ============================================
// JournalSidebar — secondary journal navigation (Reference 1, left column).
// Search + actions + chronological/starred entry list.
// ============================================

export default function JournalSidebar({
  firstName = 'Student',
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

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 shrink-0 bg-white border-r border-[#e6e2d3]
                    transform transition-transform duration-200 lg:translate-x-0 flex flex-col
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#eee9da]">
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToNotebook}
              className="flex items-center gap-1.5 text-sm font-medium text-[#5f7a4f] hover:text-[#3f6b46] transition-colors"
              title="Back to notebook"
            >
              <ArrowLeft className="w-4 h-4" />
              {firstName}&apos;s Journal
            </button>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded hover:bg-[#f4f0e2] text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search journal..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[#e6e2d3]
                         bg-[#fbf9f2] placeholder-gray-400 text-gray-700
                         focus:outline-none focus:ring-2 focus:ring-[#a8b48c]/40 focus:border-[#a8b48c]"
            />
          </div>

          {/* Primary actions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onNewEntry}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                         bg-[#3f6b46] text-white text-sm font-medium hover:bg-[#355c3c] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </button>
            <button
              onClick={() => onFilterChange('all')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#eef2e6] text-[#3f6b46] border border-[#c9d4b4]'
                  : 'text-gray-600 border border-[#e6e2d3] hover:bg-[#f4f0e2]'
              }`}
            >
              <List className="w-4 h-4" />
              All Entries
            </button>
          </div>
          <button
            onClick={() => onFilterChange(filter === 'starred' ? 'all' : 'starred')}
            className={`mt-2 w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'starred'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'text-gray-600 border border-[#e6e2d3] hover:bg-[#f4f0e2]'
            }`}
          >
            <Star className={`w-4 h-4 ${filter === 'starred' ? 'fill-amber-400 text-amber-500' : ''}`} />
            Starred Entries
          </button>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-[#c9c2ad] mb-3" strokeWidth={1.5} />
              <p className="text-sm text-gray-500">
                {query ? 'No entries found.' : 'Your journal is empty.'}
              </p>
              {!query && (
                <p className="text-xs text-gray-400 mt-1">
                  Click “New Entry” to write your first page.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-[#f0ebdd]">
              {visible.map((entry) => (
                <li key={entry.id}>
                  <EntryRow
                    entry={entry}
                    active={entry.id === activeEntryId}
                    onClick={() => onSelectEntry(entry)}
                    onDelete={() => onDeleteEntry(entry)}
                    onToggleStar={() => onToggleStar(entry)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

function EntryRow({ entry, active, onClick, onDelete, onToggleStar }) {
  const mood = moodMeta(entry.mood)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`group relative px-4 py-3 cursor-pointer transition-colors ${
        active ? 'bg-[#eef2e6] border-l-2 border-[#3f6b46]' : 'hover:bg-[#f7f4ea] border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className={`text-sm font-medium truncate ${active ? 'text-[#2f4a33]' : 'text-gray-800'}`}>
            {entry.title || 'Untitled entry'}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-500">{formatEntryDate(entry.journal_date || entry.created_at)}</span>
            {entry.is_visible_to_mentor ? (
              <Unlock className="w-3 h-3 text-emerald-600" title="Shared with mentor" />
            ) : (
              <Lock className="w-3 h-3 text-gray-400" title="Private" />
            )}
            {mood && <span className="text-[10px]">{mood.emoji}</span>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar()
            }}
            className="p-1 rounded hover:bg-amber-100"
            title={entry.is_starred ? 'Unstar' : 'Star'}
          >
            <Star
              className={`w-3.5 h-3.5 ${entry.is_starred ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
            title="Delete entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {entry.is_starred && (
        <Star className="absolute top-2 right-2 w-3 h-3 fill-amber-400 text-amber-500 group-hover:opacity-0 transition-opacity" />
      )}
    </div>
  )
}

function formatEntryDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
