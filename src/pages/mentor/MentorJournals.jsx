import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { formatDate } from '../../utils/mentorUtils'
import { BookOpen, Eye, RefreshCw, Lock } from 'lucide-react'

export default function MentorJournals() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const { data: mentor, error: mentorErr } = await dbService.getMentorByProfileId(profile.id)
        if (mentorErr) throw mentorErr
        if (!mentor) throw new Error('Mentor record not found.')

        const idsRes = await dbService.getMentorStudentIds(mentor.id)
        if (idsRes.error) throw idsRes.error

        if (!idsRes.data || idsRes.data.length === 0) {
          setEntries([])
          return
        }
        // Only is_visible_to_mentor = TRUE rows are returned (also enforced by RLS).
        const res = await dbService.getSharedJournals(idsRes.data)
        if (res.error) throw res.error
        setEntries(res.data || [])
      } catch (err) {
        console.error('Failed to load shared journals:', err)
        setError(err.message || 'Could not load shared journals.')
      } finally {
        setLoading(false)
      }
    }
    if (profile?.id) fetchData()
  }, [profile?.id])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shared Journals</h1>
          <p className="text-gray-600 mt-1">Journal entries your students chose to share with you.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors self-start"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Eye className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">
          You can only see journal entries that students have explicitly chosen to share with you.
          Private entries stay private.
        </p>
      </div>

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
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Something went wrong</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shared journals yet</h3>
          <p className="text-gray-500">
            When a student shares an entry from their Journal, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-primary-soft rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-dark">
                      {(e.students?.profiles?.full_name || 'S').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {e.title || 'Untitled entry'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {e.students?.profiles?.full_name || 'Student'} ·{' '}
                      {formatDate(e.journal_date || e.created_at)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                  <Lock className="w-3 h-3" />
                  Shared
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap line-clamp-6">
                {e.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
