import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { relativeTime } from '../../utils/mentorUtils'
import {
  UserRound,
  Link2,
  MessageSquare,
  BadgeCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

export default function StudentRemarks() {
  const { profile } = useAuth()
  const [mentorInfo, setMentorInfo] = useState(null) // RPC result or null while loading
  const [remarks, setRemarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const infoRes = await dbService.getMyMentorInfo()
      if (infoRes.error) throw infoRes.error
      setMentorInfo(infoRes.data || { connected: false })

      if (infoRes.data?.connected) {
        const { data: student, error: stErr } = await dbService.getStudentByProfileId(profile.id)
        if (stErr) throw stErr
        if (student) {
          const remRes = await dbService.getRemarks(student.id)
          if (remRes.error) throw remRes.error
          setRemarks(remRes.data || [])
        }
      } else {
        setRemarks([])
      }
    } catch (err) {
      console.error('Failed to load mentor info:', err)
      setError(err.message || 'Could not load your mentor info.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (profile?.id) load()
  }, [profile?.id, load])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Mentor</h1>
        <p className="text-gray-600 mt-1">Your mentor connection and feedback.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse" />
          <div className="h-24 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-500">{error}</p>
        </div>
      ) : mentorInfo?.connected ? (
        <ConnectedView info={mentorInfo} remarks={remarks} onRefresh={load} />
      ) : (
        <ConnectView onConnected={load} />
      )}
    </div>
  )
}

function ConnectedView({ info, remarks, onRefresh }) {
  return (
    <>
      {/* Mentor card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-soft rounded-full flex items-center justify-center">
              <UserRound className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Connected Mentor</p>
              <h2 className="text-xl font-bold text-gray-900">{info.mentor_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Status: {info.status === 'active' ? 'Active' : info.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Last reviewed</p>
              <p className="text-sm font-semibold text-gray-800">
                {relativeTime(info.last_reviewed_at)}
              </p>
            </div>
            <button
              onClick={onRefresh}
              className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {info.latest_remark && (
          <div className="mt-5 bg-primary-softer border border-[#c8e6c9] rounded-lg p-4">
            <p className="text-xs font-semibold text-primary-dark mb-1">Latest mentor feedback</p>
            <p className="text-sm text-gray-700 italic">"{info.latest_remark}"</p>
            <p className="text-xs text-gray-400 mt-1.5">{relativeTime(info.latest_remark_at)}</p>
          </div>
        )}
      </div>

      {/* Remark history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Mentor Feedback</h2>
        </div>
        {remarks.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500">No remarks yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Feedback from your mentor will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {remarks.map((r) => (
              <div key={r.id} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {r.mentors?.profile_id ? 'Mentor' : 'Mentor'}
                  </p>
                  <span className="text-xs text-gray-400">{relativeTime(r.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1.5">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ConnectView({ onConnected }) {
  const [code, setCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success'|'error', message }

  async function handleConnect(e) {
    e.preventDefault()
    if (!code.trim()) return
    setConnecting(true)
    setFeedback(null)
    try {
      const { data, error } = await dbService.connectToMentorByCode(code)
      if (error) throw error
      if (!data?.ok) {
        setFeedback({ type: 'error', message: data?.error || 'Could not connect.' })
        return
      }
      setFeedback({ type: 'success', message: `Connected with ${data.mentor_name}!` })
      await onConnected()
    } catch (err) {
      console.error('Failed to connect:', err)
      setFeedback({ type: 'error', message: err.message || 'Could not connect.' })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
        <Link2 className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">You're not connected to a mentor yet</h2>
      <p className="text-sm text-gray-500 mb-6">
        Ask your mentor for their mentor code and enter it below to connect.
      </p>
      <form onSubmit={handleConnect} className="flex flex-col gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. MOM-7K42P"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center font-mono tracking-widest uppercase focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none"
        />
        <button
          type="submit"
          disabled={connecting || !code.trim()}
          className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors font-medium disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
      </form>
      {feedback?.type === 'success' && (
        <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {feedback.message}
        </p>
      )}
      {feedback?.type === 'error' && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {feedback.message}
        </p>
      )}
    </div>
  )
}
