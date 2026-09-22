import { useState, useEffect, useRef, useCallback } from 'react'
import { dbService } from '../../services/dbService'
import { useAuth } from '../../context/AuthContext'
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

// ============================================
// ChatInterface — shared 1:1 Mentor <-> Student chat.
// Simple first version: conversation list (left) + thread (center).
// Realtime via subscribeToMessages; subscriptions are created per open
// conversation and always torn down on switch/unmount (no duplicates).
// The conversation row is created lazily from the EXISTING mentor-student
// connection via the get_or_create_conversation RPC (idempotent — the
// unique pair constraint makes duplicates impossible): automatically for
// students, on demand via "Start conversation" contacts for mentors.
// Identity, authorization and message visibility are enforced by RLS
// (migration 008) — this component only renders what Supabase returns.
// ============================================

function timeLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ', ' +
        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function ChatInterface({ role }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) // { message, fatal }
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  // MENTOR: connected students shown as contacts when no conversation exists.
  const [contacts, setContacts] = useState([])
  const [startingId, setStartingId] = useState(null) // contact being opened
  const bottomRef = useRef(null)
  const activeIdRef = useRef(null)
  const autoCreateRef = useRef(false) // student-side lazy create runs at most once
  const startingRef = useRef(false) // guards concurrent "start conversation" clicks

  // Keep a ref in sync inside an effect (never during render) so the
  // realtime callback always reads the currently open conversation.
  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  // ---- Initial load: conversation list ---------------------------------
  // get_my_conversations only LISTS existing conversation rows — it never
  // creates them. When the list is empty we bridge the gap from the
  // existing mentor-student connection (migration 006):
  //   student  -> has a connected mentor: create the conversation once, reload
  //   mentor   -> has connected students: offer them as contacts to start
  // Every creation goes through get_or_create_conversation (RPC, 008),
  // which resolves identity from auth.uid() and is idempotent.
  const loadConversations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dbService.getMyConversations()
      if (res.error) {
        setError({ message: res.error.message, fatal: true })
        setConversations([])
        setContacts([])
        return
      }
      let list = res.data || []
      setConversations(list)

      if (list.length > 0) {
        setContacts([])
      } else if (role === 'student' && !autoCreateRef.current) {
        // STUDENT: connected mentor exists -> create the conversation once.
        autoCreateRef.current = true
        const mentor = await dbService.getMyMentorInfo()
        if (mentor?.data?.connected) {
          const created = await dbService.getOrCreateConversation(null)
          if (created.error) {
            setError({ message: created.error.message, fatal: false })
          } else {
            const reload = await dbService.getMyConversations()
            if (reload.error) {
              setError({ message: reload.error.message, fatal: true })
              setConversations([])
            } else {
              list = reload.data || []
              setConversations(list)
            }
          }
        }
        // No connected mentor -> keep the existing empty state.
      } else if (role === 'mentor' && user?.id) {
        // MENTOR: list connected students as contacts to start a chat.
        const mentorRow = await dbService.getMentorByProfileId(user.id)
        if (mentorRow.error) {
          console.error('[chat] mentor lookup failed:', mentorRow.error)
        } else if (mentorRow.data?.id) {
          const rels = await dbService.getMentorStudents(mentorRow.data.id)
          if (rels.error) {
            console.error('[chat] relationship lookup failed:', rels.error)
          } else {
            setContacts(
              (rels.data || [])
                .filter((r) => r.status === 'active' && r.students?.id)
                .map((r) => ({
                  studentId: r.students.id,
                  name: r.students.profiles?.full_name || 'Student',
                  usn: r.students.usn || '',
                }))
            )
          }
        }
        // No connected students -> keep the existing empty state.
      }
    } finally {
      setLoading(false)
    }
  }, [role, user?.id])

  // MENTOR: start (or find) the conversation with a connected student.
  // The RPC is idempotent (unique student/mentor pair), so repeated or
  // concurrent clicks can never create duplicate conversations.
  async function startConversation(studentId) {
    if (startingRef.current) return
    startingRef.current = true
    setStartingId(studentId)
    const res = await dbService.getOrCreateConversation(studentId)
    startingRef.current = false
    setStartingId(null)
    if (res.error) {
      setError({ message: res.error.message, fatal: false })
      return
    }
    await loadConversations()
  }

  useEffect(() => {
    // Deferred to the next tick so the effect body stays free of
    // synchronous state updates (StrictMode-safe, mirrors StudentHome).
    const t = window.setTimeout(() => loadConversations(), 0)
    return () => window.clearTimeout(t)
  }, [loadConversations])

  // ---- Open one conversation: history + realtime subscription ----------
  useEffect(() => {
    if (!activeId) return undefined
    let cancelled = false
    let unsubscribe = null

    async function open() {
      setMessages([])
      const res = await dbService.getConversationMessages(activeId)
      if (cancelled) return
      if (res.error) {
        setError({ message: res.error.message, fatal: false })
        return
      }
      setMessages(res.data || [])
      // Mark the other side's messages as read (read receipts).
      dbService.markMessagesAsRead(activeId).then((r) => {
        if (!r.error) {
          setConversations((prev) =>
            prev.map((c) => (c.conversation_id === activeId ? { ...c, unread_count: 0 } : c))
          )
        }
      })
    }

    open()

    // Realtime: new INSERTs on messages of this conversation only.
    unsubscribe = dbService.subscribeToMessages(activeId, (row) => {
      // Ignore our own optimistic echo: the sent row is already in state.
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev
        return [...prev, row]
      })
      if (row.sender_id !== user?.id) {
        dbService.markMessagesAsRead(activeIdRef.current)
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === activeIdRef.current
              ? {
                  ...c,
                  last_message: row.message,
                  last_message_at: row.created_at,
                  unread_count: 0,
                }
              : c
          )
        )
      }
    })

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [activeId, user?.id])

  // Keep the thread scrolled to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    setDraft('')
    const { data: sent, error: sendErr } = await dbService.sendMessage(activeId, text)
    if (sendErr) {
      setError({ message: sendErr.message, fatal: false })
      setDraft(text) // restore what the user typed
    } else if (sent) {
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]))
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === activeId
            ? { ...c, last_message: sent.message, last_message_at: sent.created_at }
            : c
        )
      )
    }
    setSending(false)
  }

  const active = conversations.find((c) => c.conversation_id === activeId) || null

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Chat</h1>
          <p className="text-gray-600 mt-1.5 text-sm md:text-base">
            {role === 'mentor'
              ? 'Message your connected students.'
              : 'Message your mentor in real time.'}
          </p>
        </div>
        <button
          onClick={loadConversations}
          className="p-2.5 bg-white border border-line text-gray-600 rounded-lg hover:bg-gray-50 transition-colors self-start"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error?.fatal ? (
        <div className="bg-white rounded-2xl border border-line shadow-sm p-12 text-center">
          <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium mb-1">{error.message}</p>
          {role === 'student' && (
            <p className="text-gray-500 text-sm">Connect with a mentor to start chatting.</p>
          )}
          {role === 'mentor' && (
            <p className="text-gray-500 text-sm">No students connected yet.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
          <div className="flex h-[65vh] min-h-[420px]">
            {/* LEFT — conversation list */}
            <div
              className={`${
                mobileThreadOpen ? 'hidden' : 'flex'
              } w-full md:w-72 lg:w-80 flex-col border-r border-line shrink-0`}
            >
              {loading ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 && contacts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">
                    {role === 'mentor' ? 'No students connected yet.' : 'No conversations yet.'}
                  </p>
                </div>
              ) : conversations.length === 0 ? (
                // MENTOR: connected students, no conversation yet — offer
                // them as contacts (same row styling as conversations).
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  <p className="px-3 py-2 text-xs font-medium text-gray-500">
                    {contacts.length === 1
                      ? '1 student connected — start a conversation:'
                      : `${contacts.length} students connected — start a conversation:`}
                  </p>
                  {contacts.map((c) => (
                    <button
                      key={c.studentId}
                      onClick={() => startConversation(c.studentId)}
                      disabled={startingId !== null}
                      className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50 ${
                        startingId === c.studentId ? 'bg-primary-soft' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-white border border-line rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary-dark">
                            {c.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {c.name || 'User'}
                            {c.usn && (
                              <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                                {c.usn}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-primary">
                            {startingId === c.studentId ? 'Starting…' : 'Start conversation'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conversations.map((c) => (
                    <button
                      key={c.conversation_id}
                      onClick={() => {
                        setActiveId(c.conversation_id)
                        setMobileThreadOpen(true)
                      }}
                      className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
                        activeId === c.conversation_id
                          ? 'bg-primary-soft'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-white border border-line rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary-dark">
                            {c.counterpart_name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {c.counterpart_name || 'User'}
                              {c.counterpart_usn && (
                                <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                                  {c.counterpart_usn}
                                </span>
                              )}
                            </p>
                            {(c.unread_count || 0) > 0 && (
                              <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {c.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {c.last_message
                              ? c.last_message
                              : 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CENTER — thread */}
            <div
              className={`${
                mobileThreadOpen ? 'flex' : 'hidden md:flex'
              } flex-1 flex-col min-w-0`}
            >
              {!active ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">Select a conversation</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start a conversation with your {role === 'mentor' ? 'student' : 'mentor'}.
                  </p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
                    <button
                      onClick={() => setMobileThreadOpen(false)}
                      className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
                      title="Back to conversations"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="w-9 h-9 bg-primary-soft rounded-full flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary-dark">
                        {active.counterpart_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {active.counterpart_name || 'User'}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {role === 'mentor' ? 'Student' : 'Mentor'}
                        {active.counterpart_usn ? ` · ${active.counterpart_usn}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#FAFCFB]">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-gray-400 text-center">
                          Start a conversation with your{' '}
                          {role === 'mentor' ? 'student' : 'mentor'}.
                        </p>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const mine = m.sender_id === user?.id
                        return (
                          <div
                            key={m.id}
                            className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
                          >
                            {!mine && (
                              <div className="w-7 h-7 bg-primary-soft rounded-full flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                            )}
                            <div
                              className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                                mine
                                  ? 'bg-primary text-white rounded-br-md'
                                  : 'bg-white border border-line text-gray-900 rounded-bl-md'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                              <p
                                className={`text-[10px] mt-1 ${
                                  mine ? 'text-white/70' : 'text-gray-400'
                                }`}
                              >
                                {timeLabel(m.created_at)}
                                {mine && m.read_at ? ' · Read' : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={handleSend}
                    className="flex items-center gap-2 border-t border-line p-3 shrink-0"
                  >
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 px-4 py-2.5 bg-white border border-input rounded-full text-sm text-gray-900 placeholder-placeholder focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending}
                      className="p-2.5 bg-primary text-white rounded-full hover:bg-[#43A047] transition-colors disabled:bg-green-300 disabled:cursor-not-allowed shrink-0"
                      title="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Non-fatal inline error (e.g. send failed) */}
      {error && !error.fatal && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error.message}
        </div>
      )}
    </div>
  )
}
