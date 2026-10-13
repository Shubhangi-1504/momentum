import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import WelcomeCard from '../../components/home/WelcomeCard'
import StatsCards from '../../components/home/StatsCards'
import TodaysFocus from '../../components/home/TodaysFocus'
import { getGreeting, dateKey, startOfWeek } from '../../components/home/homeUtils'

// ============================================
// StudentHome — the dashboard. All metrics come from live Supabase
// data via the existing dbService (no new tables, no fake numbers):
//   Study Sessions   → assignments due today
//   Habits Completed → habit_logs completed today / total habits
//   Journal Entries  → entries created this week
//   Overall Progress → completed assignments + today's habit completion
// ============================================

export default function StudentHome() {
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [habits, setHabits] = useState([])
  const [logsToday, setLogsToday] = useState([])
  const [journals, setJournals] = useState([])
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    if (!profile?.id) return undefined
    let cancelled = false

    // Deferred to the next tick so the effect body stays free of
    // synchronous state updates (StrictMode-safe, mirrors StudyTracker).
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: student, error: studentErr } = await dbService.getStudentByProfileId(profile.id)
        if (studentErr) throw studentErr
        if (!student) throw new Error('Student record not found.')

        const today = dateKey()
        const [aRes, hRes, lRes, jRes] = await Promise.all([
          dbService.getAssignments(student.id),
          dbService.getHabits(student.id),
          dbService.getStudentHabitLogs(student.id, { startDate: today, endDate: today }),
          dbService.getJournalEntries(student.id),
        ])
        if (aRes.error) throw aRes.error
        if (hRes.error) throw hRes.error
        if (lRes.error) throw lRes.error
        if (jRes.error) throw jRes.error

        if (!cancelled) {
          setAssignments(aRes.data || [])
          setHabits(hRes.data || [])
          setLogsToday(lRes.data || [])
          setJournals(jRes.data || [])
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        if (!cancelled) setError(err.message || 'Could not load your dashboard.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [profile?.id])

  // Live metrics derived from the fetched data — recomputed automatically
  // when a task status is cycled below.
  const stats = useMemo(() => {
    const today = dateKey()
    const weekStart = startOfWeek()

    const dueToday = assignments.filter(
      (a) => a.due_date && dateKey(new Date(a.due_date)) === today
    ).length

    const completedToday = logsToday.filter((l) => l.completed).length
    const totalHabits = habits.length

    const journalThisWeek = journals.filter(
      (j) => new Date(j.created_at) >= weekStart
    ).length

    const doneAssignments = assignments.filter((a) => a.status === 'completed').length
    const aPart = assignments.length ? doneAssignments / assignments.length : null
    const hPart = totalHabits ? completedToday / totalHabits : null
    let overall = 0
    if (aPart !== null && hPart !== null) overall = (aPart + hPart) / 2
    else if (aPart !== null) overall = aPart
    else if (hPart !== null) overall = hPart

    return {
      studySessions: dueToday,
      habitsCompleted: totalHabits ? `${completedToday}/${totalHabits}` : '0',
      journalThisWeek,
      overallProgress: Math.round(overall * 100),
    }
  }, [assignments, habits, logsToday, journals])

  // Today's Focus: assignments due today, unfinished first, then by time.
  const focusTasks = useMemo(() => {
    const today = dateKey()
    return assignments
      .filter((a) => a.due_date && dateKey(new Date(a.due_date)) === today)
      .sort((a, b) => {
        const aDone = a.status === 'completed'
        const bDone = b.status === 'completed'
        if (aDone !== bDone) return aDone ? 1 : -1
        return new Date(a.due_date) - new Date(b.due_date)
      })
  }, [assignments])

  // Cycle status like Study Tracker: pending → in_progress → completed.
  async function handleCycleStatus(task) {
    const next =
      task.status === 'pending'
        ? 'in_progress'
        : task.status === 'in_progress'
          ? 'completed'
          : 'pending'

    setAssignments((prev) => prev.map((a) => (a.id === task.id ? { ...a, status: next } : a)))
    const { error: updErr } = await dbService.updateAssignment(task.id, { status: next })
    if (updErr) {
      console.error('Failed to update status:', updErr)
      setAssignments((prev) => prev.map((a) => (a.id === task.id ? { ...a, status: task.status } : a)))
      showToast('Could not update the task status.')
    } else {
      showToast(next === 'completed' ? 'Task completed 🎉' : `Marked ${next.replace('_', ' ')}`)
    }
  }

  const greeting = getGreeting()
  const firstName = (profile?.full_name || 'Student').trim().split(/\s+/)[0]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <WelcomeCard greeting={greeting} firstName={firstName} />

      <StatsCards stats={stats} loading={loading} error={error} />

      <TodaysFocus
        tasks={focusTasks}
        loading={loading}
        error={error}
        onCycleStatus={handleCycleStatus}
      />

      {/* transient status toast (same pattern as Study Tracker) */}
      {toast && (
        <div
          role="status"
          className="nh-toast fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
