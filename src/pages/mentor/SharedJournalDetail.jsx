import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { dbService } from '../../services/dbService'
import { formatDate } from '../../utils/mentorUtils'
import { Eye, Lock, RefreshCw, AlertCircle, BookOpen } from 'lucide-react'

// ============================================
// SharedJournalDetail — read-only view of ONE shared journal entry.
// Route: /mentor/journals/:entryId (dedicated route, matching the flat
// route style of /mentor/students/:studentId).
//
// Security: the fetch is scoped (.eq('is_visible_to_mentor', true)) and
// journal_entries RLS (migration 003) only returns the row when the
// current mentor is assigned to that student. An unauthorized, private,
// or deleted entry resolves to null → handled below. The mentor can only
// READ — no edit, delete, or share-state change is rendered or wired.
// ============================================

export default function SharedJournalDetail() {
  const { entryId } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchEntry() {
      setLoading(true)
      setError(null)
      setEntry(null)
      try {
        const { data, error: err } = await dbService.getSharedJournalEntry(entryId)
        if (err) throw err
        if (!cancelled) setEntry(data)
      } catch (e) {
        console.error('[SharedJournalDetail] failed to load entry:', e)
        if (!cancelled) setError(e.message || 'Could not load this journal entry.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (entryId) fetchEntry()
    return () => {
      cancelled = true
    }
  }, [entryId])

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back to Shared Journals */}
      <button
        onClick={() => navigate('/mentor/journals')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        ← Back to Shared Journals
      </button>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="animate-pulse h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="animate-pulse h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* network/database error */
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Something went wrong</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => navigate(0)}
            className="px-4 py-2 text-sm rounded-lg bg-[#3f6b46] text-white hover:bg-[#355c3c] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : !entry ? (
        /* not found / no longer shared / unauthorized — deliberately the same
           neutral message: RLS hides the difference, so we don't leak whether
           the entry exists. */
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Journal entry not available</h3>
          <p className="text-gray-500 mb-4">
            This entry may no longer be shared, or you may not have access to it.
          </p>
          <Link
            to="/mentor/journals"
            className="inline-block px-4 py-2 text-sm rounded-lg bg-[#3f6b46] text-white hover:bg-[#355c3c] transition-colors"
          >
            Back to Shared Journals
          </Link>
        </div>
      ) : (
        /* read-only detail — same paper/serif presentation as the student editor */
        <article className="rounded-lg shadow-[0_18px_45px_-18px_rgba(76,68,45,0.4)] border border-[#e4dcc6] overflow-hidden">
          {/* Header: student, title, date, shared status */}
          <div
            className="px-5 sm:px-8 py-6 border-b border-[#eee9da]"
            style={{ background: 'linear-gradient(160deg, #faf7ee 0%, #f2edde 100%)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-primary-soft rounded-full flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-dark">
                    {(entry.students?.profiles?.full_name || 'S').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#3d4232] truncate">
                    {entry.students?.profiles?.full_name || 'Student'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(entry.journal_date || entry.created_at)}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                <Lock className="w-3 h-3" />
                Shared
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#3d4232] mt-4">
              {entry.title || 'Untitled entry'}
            </h1>
          </div>

          {/* Complete content — read only */}
          <div
            className="px-5 sm:px-8 py-6"
            style={{ background: 'linear-gradient(180deg, #fdfbf5 0%, #f8f4e8 100%)' }}
          >
            <div className="font-serif text-[15.5px] leading-8 text-[#42402f] whitespace-pre-wrap break-words">
              {entry.content || 'This entry has no content.'}
            </div>
          </div>

          {/* Footer — explicitly read-only, no edit/delete/share controls */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-3 border-t border-[#eee9da] bg-[#fbf8f0]/70">
            <p className="text-[11px] text-[#8b8271] italic inline-flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Read-only — shared by the student. Only they can edit or unshare it.
            </p>
            <button
              onClick={() => navigate('/mentor/journals')}
              className="px-4 py-2 text-sm rounded-lg border border-[#d8d2bd] text-[#6f6754] bg-white/70 hover:bg-white transition-colors shrink-0"
            >
              Back to Shared Journals
            </button>
          </div>
        </article>
      )}
    </div>
  )
}
