import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
import { fireConfetti } from '../../utils/confetti'
import CelebrationPopup from '../../components/habits/CelebrationPopup'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  AlertCircle,
  Sprout,
  Flame,
  Trophy,
  Leaf,
  Check,
  Calendar,
  LayoutGrid,
  ChevronDown,
  CheckCircle2,
  Dumbbell,
  Footprints,
  BookOpen,
  Droplets,
  Flower2,
  Apple,
  GraduationCap,
  Target,
  Brain,
  Moon,
  Sun,
  PenLine,
  Music,
  Rocket,
  Star,
  Lightbulb,
  Rainbow,
  Gift,
  Coffee,
  Clapperboard,
  Salad,
  Pill,
  Wallet,
  Heart,
} from 'lucide-react'
import '../../styles/neo-habits.css'

// ============================================
// Icon palette (lucide icon ids persisted on habits.icon)
// ============================================
const HABIT_ICONS = [
  { id: 'dumbbell', icon: Dumbbell },
  { id: 'footprints', icon: Footprints },
  { id: 'book-open', icon: BookOpen },
  { id: 'droplets', icon: Droplets },
  { id: 'flower', icon: Flower2 },
  { id: 'apple', icon: Apple },
  { id: 'study', icon: GraduationCap },
  { id: 'target', icon: Target },
  { id: 'brain', icon: Brain },
  { id: 'sleep', icon: Moon },
  { id: 'sun', icon: Sun },
  { id: 'plant', icon: Sprout },
  { id: 'journal', icon: PenLine },
  { id: 'music', icon: Music },
  { id: 'trophy', icon: Trophy },
  { id: 'rocket', icon: Rocket },
  { id: 'star', icon: Star },
  { id: 'fire', icon: Flame },
  { id: 'bulb', icon: Lightbulb },
  { id: 'rainbow', icon: Rainbow },
  { id: 'gift', icon: Gift },
  { id: 'coffee', icon: Coffee },
  { id: 'movie', icon: Clapperboard },
  { id: 'salad', icon: Salad },
  { id: 'vitamins', icon: Pill },
  { id: 'wallet', icon: Wallet },
  { id: 'heart', icon: Heart },
  { id: 'leaf', icon: Leaf },
]

// ============================================
// Colour palette (keys persisted on habits.color).
// hex drives every fill via the --hc CSS variable.
// ============================================
const HABIT_COLORS = {
  green: { label: 'Green', hex: '#6bcb77' },
  mint: { label: 'Mint', hex: '#3ed6bd' },
  blue: { label: 'Blue', hex: '#6cb6ff' },
  yellow: { label: 'Yellow', hex: '#ffd93d' },
  orange: { label: 'Orange', hex: '#ff9f43' },
  coral: { label: 'Coral', hex: '#ff6b6b' },
  pink: { label: 'Pink', hex: '#ff8fc7' },
  purple: { label: 'Purple', hex: '#a78bfa' },
}

const CATEGORIES = ['Study', 'Health', 'Fitness', 'Mindfulness', 'Personal', 'Other']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CELL = 11
const GAP = 3
const COL = CELL + GAP

const EMPTY_FORM = {
  name: '',
  icon: 'leaf',
  color: 'green',
  category: 'Other',
  target: 7,
  notes: '',
}

// ============================================
// Local-date helpers (timezone-safe, no UTC off-by-one)
// ============================================
function dateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetweenKeys(fromKey, toKey) {
  // Both keys are date-only; parse as UTC so the diff is exact.
  return Math.round((new Date(`${toKey}T00:00:00Z`) - new Date(`${fromKey}T00:00:00Z`)) / 86400000)
}

function buildHeatmapWeeks() {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(end.getDate() - 364)
  start.setDate(start.getDate() - start.getDay()) // align to Sunday
  const weeks = []
  const cursor = new Date(start)
  const todayKey = dateKey(end)
  while (cursor <= end) {
    const week = []
    for (let i = 0; i < 7; i++) {
      if (cursor > end) break
      const k = dateKey(cursor)
      week.push({ key: k, label: k, day: cursor.getDate(), month: cursor.getMonth(), isToday: k === todayKey })
      cursor.setDate(cursor.getDate() + 1)
    }
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

// ============================================
// Statistics from real habit_logs
// ============================================
// Today's local date key — every strict-completion decision uses this.
const todayKey = dateKey(new Date())

function computeStats(habit, logsMap) {
  const today = dateKey(new Date())

  // Current streak: consecutive days ending today (or yesterday if today not yet done)
  let current = 0
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (!logsMap[dateKey(d)]) d.setDate(d.getDate() - 1)
  while (logsMap[dateKey(d)]) {
    current++
    d.setDate(d.getDate() - 1)
  }

  // Best streak: longest consecutive run in all logs
  const keys = Object.keys(logsMap).sort()
  let best = 0
  let run = 0
  let prev = null
  for (const k of keys) {
    run = prev && daysBetweenKeys(prev, k) === 1 ? run + 1 : 1
    if (run > best) best = run
    prev = k
  }

  // Done days in last 7 and last 28
  let last7 = 0
  let last28 = 0
  const d2 = new Date()
  d2.setHours(0, 0, 0, 0)
  for (let i = 0; i < 28; i++) {
    if (logsMap[dateKey(d2)]) {
      last28++
      if (i < 7) last7++
    }
    d2.setDate(d2.getDate() - 1)
  }

  const target = Math.max(1, habit.target_count || 1)
  const pct = Math.min(100, Math.round((last28 / (target * 4)) * 100))
  return { current, best, last7, last28, pct, target, todayDone: !!logsMap[today] }
}

export default function HabitTracker() {
  const { profile } = useAuth()
  const [habits, setHabits] = useState([])
  const [logsByHabit, setLogsByHabit] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deletingHabit, setDeletingHabit] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // UI-only additions: celebration popup, side-panel filter, expanded More panels
  const [celebration, setCelebration] = useState(null)
  const [selectedHabitId, setSelectedHabitId] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())

  const studentIdRef = useRef(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  const loadAll = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      if (!profile?.id) {
        setHabits([])
        return
      }
      const { data: student, error: e1 } = await dbService.getStudentByProfileId(profile.id)
      if (e1) throw e1
      if (!student) throw new Error('Student record not found. Please contact your mentor.')
      studentIdRef.current = student.id

      const { data: habitRows, error: e2 } = await dbService.getHabits(student.id)
      if (e2) throw e2
      const list = habitRows || []

      // Load ~13 months of logs per habit so the heatmap and streaks are real
      const start = new Date()
      start.setDate(start.getDate() - 400)
      const startKey = dateKey(start)
      const results = await Promise.all(list.map((h) => dbService.getHabitLogs(h.id, startKey, null)))
      const firstErr = results.find((r) => r.error)?.error
      if (firstErr) throw firstErr

      const map = {}
      list.forEach((h, i) => {
        const m = {}
        for (const log of results[i].data || []) m[log.log_date] = log
        map[h.id] = m
      })
      setHabits(list)
      setLogsByHabit(map)
    } catch (e) {
      console.error('Failed to load habits:', e)
      setError(e.message || 'Could not load your habits.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadAll()
    }, 0)
    return () => window.clearTimeout(t)
  }, [loadAll])

  const weeks = useMemo(() => buildHeatmapWeeks(), [])

  // ---- summary classification from real logs ----
  const summary = useMemo(() => {
    let onTrack = 0
    let attention = 0
    let behind = 0
    for (const h of habits) {
      const stats = computeStats(h, logsByHabit[h.id] || {})
      // Fair expectation for young habits: scale target by habit age
      const created = h.created_at ? dateKey(new Date(h.created_at)) : dateKey(new Date())
      const age = Math.max(1, daysBetweenKeys(created, dateKey(new Date())) + 1)
      const expected = Math.max(1, Math.ceil((stats.target * Math.min(7, age)) / 7))
      if (stats.last7 >= expected) onTrack++
      else if (stats.last7 > 0) attention++
      else behind++
    }
    return { total: habits.length, onTrack, attention, behind }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, logsByHabit])

  function openCreate() {
    setEditingHabit(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(h) {
    setEditingHabit(h)
    setForm({
      name: h.name || '',
      icon: HABIT_ICONS.some((i) => i.id === h.icon) ? h.icon : 'leaf',
      color: HABIT_COLORS[h.color] ? h.color : 'green',
      category: CATEGORIES.includes(h.category) ? h.category : 'Other',
      target: Math.min(7, Math.max(1, h.target_count || 7)),
      notes: h.description || '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingHabit(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.notes.trim() || null,
        frequency: 'daily',
        target_count: form.target,
        icon: form.icon,
        color: form.color,
        category: form.category,
      }
      const { error: dbErr } = editingHabit
        ? await dbService.updateHabit(editingHabit.id, payload)
        : await dbService.createHabit({ ...payload, student_id: studentIdRef.current })
      if (dbErr) throw dbErr
      closeModal()
      showToast(editingHabit ? 'Habit updated' : 'Habit created')
      if (!editingHabit) {
        setCelebration({ title: 'Habit planted.', line: 'Day one starts today. Tap it when you finish.', tone: 'green', flame: 28 })
        fireConfetti(window.innerWidth / 2, window.innerHeight * 0.4)
      }
      await loadAll()
    } catch (err) {
      console.error('Failed to save habit:', err)
      showToast(err.message || 'Failed to save habit')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingHabit) return
    setDeleting(true)
    try {
      const { error: dbErr } = await dbService.deleteHabit(deletingHabit.id)
      if (dbErr) throw dbErr
      setHabits((list) => list.filter((h) => h.id !== deletingHabit.id))
      setLogsByHabit((prev) => {
        const copy = { ...prev }
        delete copy[deletingHabit.id]
        return copy
      })
      // UI-only fallback: if the side panel was filtered to the deleted habit, reset
      setSelectedHabitId((sel) => (sel === deletingHabit.id ? null : sel))
      setDeletingHabit(null)
      showToast('Habit deleted')
    } catch (err) {
      showToast(err.message || 'Failed to delete habit')
    } finally {
      setDeleting(false)
    }
  }

  // STRICT: only today is writable. Past days are history — the database
  // trigger (migration 007) also rejects any non-today write, so both
  // layers agree. Today's cell cycles: not-done → done → not-done.
  async function handleToggleDay(habit, day) {
    if (day.key !== todayKey) {
      showToast('Habits can only be marked for today. Missed days stay missed.')
      return
    }
    const existing = logsByHabit[habit.id]?.[day.key]
    const snapshot = logsByHabit[habit.id]?.[day.key]

    if (existing) {
      // Un-complete today (a mistake fix, still today only)
      setLogsByHabit((prev) => {
        const m = { ...(prev[habit.id] || {}) }
        delete m[day.key]
        return { ...prev, [habit.id]: m }
      })
      try {
        if (existing.id) {
          const { error: dbErr } = await dbService.deleteHabitLog(existing.id)
          if (dbErr) throw dbErr
        }
      } catch (err) {
        setLogsByHabit((prev) => {
          const m = { ...(prev[habit.id] || {}) }
          if (snapshot) m[day.key] = snapshot
          return { ...prev, [habit.id]: m }
        })
        showToast(err.message || 'Failed to update habit log')
      }
      return
    }

    // Mark today complete (1× — simple daily completion, count kept for
    // backward compatibility with existing data)
    setLogsByHabit((prev) => {
      const m = { ...(prev[habit.id] || {}) }
      m[day.key] = { id: existing?.id, count: 1, completed: true }
      return { ...prev, [habit.id]: m }
    })
    try {
      const { data, error: dbErr } = await dbService.createOrUpdateHabitLog({
        habit_id: habit.id,
        log_date: day.key,
        count: 1,
        completed: true,
      })
      if (dbErr) throw dbErr
      setLogsByHabit((prev) => {
        const m = { ...(prev[habit.id] || {}) }
        m[day.key] = { id: data?.id ?? existing?.id, count: 1, completed: true }
        return { ...prev, [habit.id]: m }
      })
    } catch (err) {
      setLogsByHabit((prev) => {
        const m = { ...(prev[habit.id] || {}) }
        if (snapshot) m[day.key] = snapshot
        else delete m[day.key]
        return { ...prev, [habit.id]: m }
      })
      showToast(err.message || 'Failed to update habit log')
    }
  }

  // UI-only wrapper around handleToggleDay (which stays UNCHANGED).
  // Adds the undo toast + one celebration popup for today's completions.
  function handleToggleWithCelebration(habit, day, event) {
    // Read BEFORE toggling
    const stats = computeStats(habit, logsByHabit[habit.id] || {})
    const wasDone = !!logsByHabit[habit.id]?.[day.key]
    const isToday = day.key === todayKey

    handleToggleDay(habit, day)

    if (!isToday) return // the existing toast handles past days
    if (wasDone) {
      showToast('Undone. Fix mistakes, keep going.')
      return
    }

    // New completion: fire confetti at the pointer (or element centre for keyboard)
    let x = event?.clientX || 0
    let y = event?.clientY || 0
    if (!x && !y && event?.currentTarget?.getBoundingClientRect) {
      const rect = event.currentTarget.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top + rect.height / 2
    }
    fireConfetti(x, y)

    // Predicted values: today was not done, so stats.current counts through yesterday
    const newStreak = stats.current + 1
    const newLast7 = stats.last7 + 1
    const allDone = habits.length > 0 && habits.every((h) => h.id === habit.id || logsByHabit[h.id]?.[todayKey])

    // Pick ONE celebration — first match wins
    let chosen
    if (allDone) {
      chosen = { title: 'Clean sweep!', line: `All ${habits.length} habits done. Go enjoy your day.`, tone: 'green', flame: 40 }
    } else if (newStreak === 3) {
      chosen = { title: '3 day streak!', line: 'Momentum is real. Keep it rolling.', tone: 'yellow', flame: 28 + 3 * 2 }
    } else if (newStreak === 7) {
      chosen = { title: 'A full week!', line: 'Seven days. A real habit is forming.', tone: 'yellow', flame: 28 + 7 * 2 }
    } else if (newStreak === 14) {
      chosen = { title: 'Two weeks!', line: 'Unstoppable. Seriously.', tone: 'yellow', flame: 28 + 14 * 2 }
    } else if (newStreak === 21) {
      chosen = { title: '21 days!', line: 'This is who you are now.', tone: 'yellow', flame: 28 + 21 * 2 }
    } else if (newStreak === 30) {
      chosen = { title: '30 days!', line: 'Legend status.', tone: 'yellow', flame: 28 + 30 * 2 }
    } else if (stats.last7 < stats.target && newLast7 >= stats.target) {
      chosen = { title: 'Weekly goal hit!', line: `${newLast7} of ${stats.target} days. The rest is a bonus.`, tone: 'blue', flame: 34 }
    } else if (newStreak > stats.best && newStreak > 1) {
      chosen = { title: 'New personal best!', line: `${newStreak} days in a row on ${habit.name}.`, tone: 'yellow', flame: 30 }
    } else if (newStreak === 1) {
      chosen = { title: 'Day one.', line: 'The hardest part is starting. Done.', tone: 'yellow', flame: 28 }
    } else {
      chosen = { title: `${newStreak} day streak!`, line: "Don't break the chain.", tone: 'yellow', flame: 30 }
    }
    setCelebration(chosen)
  }

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const doneToday = habits.filter((h) => logsByHabit[h.id]?.[todayKey]).length

  return (
    <div className="nh-page max-w-6xl mx-auto">
      {/* Header */}
      <div className="nh-head">
        <div>
          <h1 className="nh-title">
            <span className="nh-title-hl">Habit Tracker</span>
          </h1>
          <p className="nh-subtitle">Build better habits, one day at a time.</p>
        </div>
        <div className="nh-head-actions">
          <button
            type="button"
            onClick={loadAll}
            className="nh-btn nh-btn--refresh"
            title="Refresh"
            aria-label="Refresh habits"
          >
            <RefreshCw className={`nh-btn-icon ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={openCreate} className="nh-btn nh-btn--yellow nh-btn--add">
            <Plus className="nh-btn-icon" />
            Add Habit
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="nh-skel">
              <div className="nh-skel-inner">
                <div className="nh-skel-block nh-skel-ico" />
                <div className="nh-skel-lines">
                  <div className="nh-skel-block nh-skel-line1" />
                  <div className="nh-skel-block nh-skel-line2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="nh-state">
          <div className="nh-state-iconbox nh-state-iconbox--coral">
            <AlertCircle />
          </div>
          <h3 className="nh-state-title">Something went wrong</h3>
          <p className="nh-state-text">{error}</p>
          <button type="button" onClick={loadAll} className="nh-btn nh-btn--yellow nh-state-btn">
            <RefreshCw className="nh-btn-icon" />
            Try again
          </button>
        </div>
      ) : habits.length === 0 ? (
        <div className="nh-state">
          <div className="nh-state-iconbox nh-state-iconbox--green">
            <Sprout />
          </div>
          <h3 className="nh-state-title">No habits yet</h3>
          <p className="nh-state-text">Start with one small habit and build from there.</p>
          <button type="button" onClick={openCreate} className="nh-btn nh-btn--yellow nh-state-btn">
            <Plus className="nh-btn-icon" />
            Create your first habit
          </button>
        </div>
      ) : (
        <div className="nh-main">
          {/* LEFT: Today banner + habit list */}
          <div className="min-w-0">
            {/* Today banner */}
            <div className="nh-banner">
              <div className="nh-banner-dial">{doneToday}/{habits.length}</div>
              <div className="nh-banner-text">
                <p className="nh-banner-msg">
                  {doneToday === habits.length
                    ? 'Clean sweep. Go enjoy your day.'
                    : doneToday === 0
                      ? 'Fresh day. Tap one to start.'
                      : `${habits.length - doneToday} to go. You've got this.`}
                </p>
                <p className="nh-banner-sub">
                  {summary.onTrack} on track · {summary.attention} need attention · {summary.behind} fell behind
                </p>
              </div>
              <div className="nh-banner-chips">
                {habits.map((h) => {
                  const IconComp = (HABIT_ICONS.find((i) => i.id === h.icon) || HABIT_ICONS[HABIT_ICONS.length - 1]).icon
                  const done = !!logsByHabit[h.id]?.[todayKey]
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={(e) => handleToggleWithCelebration(h, { key: todayKey }, e)}
                      className={`nh-chip-btn ${done ? 'nh-chip-btn--done' : ''}`}
                      style={{ '--hc': (HABIT_COLORS[h.color] || HABIT_COLORS.green).hex }}
                      aria-label={done ? `Undo ${h.name} for today` : `Mark ${h.name} done today`}
                      title={h.name}
                    >
                      {done ? <Check /> : <IconComp />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Habit cards */}
            {habits.map((h, index) => (
              <HabitCard
                key={h.id}
                habit={h}
                logs={logsByHabit[h.id] || {}}
                weeks={weeks}
                index={index}
                expanded={expandedIds.has(h.id)}
                onToggleExpanded={() => toggleExpanded(h.id)}
                onToggleDay={handleToggleDay}
                onToggleWithCelebration={handleToggleWithCelebration}
                onEdit={() => openEdit(h)}
                onDelete={() => setDeletingHabit(h)}
              />
            ))}
          </div>

          {/* RIGHT: side column */}
          <HabitSidePanel
            habits={habits}
            logsByHabit={logsByHabit}
            todayKey={todayKey}
            selectedHabitId={selectedHabitId}
            onSelect={setSelectedHabitId}
          />
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <HabitModal
          form={form}
          setForm={setForm}
          editing={!!editingHabit}
          saving={saving}
          onClose={closeModal}
          onSubmit={handleSave}
        />
      )}

      {/* Delete confirmation */}
      {deletingHabit && (
        <DeleteConfirm
          habit={deletingHabit}
          deleting={deleting}
          onCancel={() => setDeletingHabit(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Celebration popup */}
      <CelebrationPopup celebration={celebration} onClose={() => setCelebration(null)} />

      {/* Toast */}
      {toast && (
        <div className="nh-toast">
          <Check />
          {toast}
        </div>
      )}
    </div>
  )
}

// Build the last 7 days (oldest -> today) for the week strip
function buildLast7Days() {
  const days = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - 6)
  for (let i = 0; i < 7; i++) {
    days.push({ key: dateKey(d), weekday: d.toLocaleDateString('en-US', { weekday: 'short' }) })
    d.setDate(d.getDate() + 1)
  }
  return days
}

const LAST7 = buildLast7Days()

function streakFlameClass(streak) {
  if (streak >= 7) return 'nh-flame--hot'
  if (streak >= 3) return 'nh-flame--mid'
  if (streak >= 1) return 'nh-flame--low'
  return 'nh-flame--0'
}

function HabitCard({ habit, logs, weeks, index, expanded, onToggleExpanded, onToggleDay, onToggleWithCelebration, onEdit, onDelete }) {
  const hex = (HABIT_COLORS[habit.color] || HABIT_COLORS.green).hex
  const IconComp = (HABIT_ICONS.find((i) => i.id === habit.icon) || HABIT_ICONS[HABIT_ICONS.length - 1]).icon
  const stats = computeStats(habit, logs)
  const todayDone = !!logs[todayKey]

  // Month labels aligned to week columns
  const monthLabels = useMemo(() => {
    const out = []
    let last = -1
    weeks.forEach((week, i) => {
      const first = week.find(Boolean)
      if (!first) return
      if (first.month !== last) {
        out.push({ name: MONTHS[first.month], col: i, span: 0 })
        last = first.month
      }
    })
    out.forEach((m, j) => {
      m.span = (out[j + 1]?.col ?? weeks.length) - m.col
    })
    return out
  }, [weeks])

  return (
    <div className="nh-card" style={{ '--i': index, '--hc': hex }}>
      {/* Top row */}
      <div className="nh-card-top">
        <div className="nh-card-icon">
          <IconComp />
        </div>
        <div className="nh-card-id">
          <h3 className="nh-card-name">{habit.name}</h3>
          <p className="nh-card-meta">
            {habit.category || 'Other'} · {stats.last7}/{stats.target} this week
          </p>
        </div>
        <span className="nh-card-streak">
          <Flame
            className={`nh-flame ${streakFlameClass(stats.current)}`}
            fill="currentColor"
          />
          {stats.current}
        </span>
        <button
          type="button"
          onClick={(e) => onToggleWithCelebration(habit, { key: todayKey }, e)}
          aria-pressed={todayDone}
          className={`nh-btn nh-btn--sm nh-card-done-btn ${todayDone ? 'nh-card-done-btn--done' : ''}`}
          title={todayDone ? 'Undo today' : 'Mark this habit as completed for today'}
        >
          {todayDone ? <Check className="nh-btn-icon" /> : <CheckCircle2 className="nh-btn-icon" />}
          {todayDone ? 'Done' : 'Mark done'}
        </button>
        <button
          type="button"
          onClick={onToggleExpanded}
          className={`nh-card-more-btn ${expanded ? 'nh-card-more-btn--open' : ''}`}
          aria-expanded={expanded}
          aria-label="More details"
        >
          <ChevronDown />
        </button>
      </div>

      {/* Week strip: last 7 days, oldest -> today */}
      <div className="nh-strip">
        {LAST7.map((d) => {
          const done = !!logs[d.key]
          const isToday = d.key === todayKey
          const isPast = !isToday
          const dt = new Date(`${d.key}T00:00:00`)
          const label = isToday ? 'today' : d.weekday.charAt(0)
          const ariaDate = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onToggleDay(habit, { key: d.key })}
              className={`nh-strip-day ${done ? 'nh-strip-day--done' : ''} ${isToday ? 'nh-strip-day--today' : ''} ${isPast && !done ? 'nh-strip-day--past' : ''}`}
              aria-disabled={isPast && !done ? 'true' : undefined}
              aria-label={`${ariaDate}, ${done ? 'done' : 'not done'}`}
            >
              <span className="nh-strip-cell">
                {done ? (
                  <Check />
                ) : isToday ? (
                  <Plus />
                ) : (
                  <X />
                )}
              </span>
              <span className={`nh-strip-label ${isToday ? 'nh-strip-label--today' : ''}`}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* More panel */}
      {expanded && (
        <div className="nh-more">
          {/* Facts */}
          <div className="nh-facts">
            <div>
              <p className="nh-fact-label">Best streak</p>
              <p className="nh-fact-value">{stats.best} days</p>
            </div>
            <div>
              <p className="nh-fact-label">Target</p>
              <p className="nh-fact-value">{stats.target} days/wk</p>
            </div>
            <div>
              <p className="nh-fact-label">28-day</p>
              <div className="nh-fact-bar">
                <span className="nh-fact-track">
                  <span className="nh-fact-fill" style={{ width: `${stats.pct}%` }} />
                </span>
                <span className="nh-fact-pct">{stats.pct}%</span>
              </div>
            </div>
          </div>

          {/* 53-week heatmap */}
          <div className="nh-heat-wrap">
            <div className="nh-heat-wdcol">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className="nh-heat-wd"
                  style={{ height: CELL, marginBottom: GAP, visibility: [0, 2, 4, 6].includes(i) ? 'visible' : 'hidden' }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="nh-heat-scroll">
              <div style={{ width: weeks.length * COL }}>
                <div className="nh-heat-months">
                  {monthLabels.map((m, j) => (
                    <div key={j} className="nh-heat-month" style={{ width: m.span * COL, minWidth: 0 }}>
                      {m.span >= 3 ? m.name : ''}
                    </div>
                  ))}
                </div>
                <div className="nh-heat-cols" style={{ gap: GAP }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="nh-heat-col" style={{ gap: GAP }}>
                      {week.map((day, di) =>
                        day ? (
                          day.isToday ? (
                            <button
                              key={day.key}
                              type="button"
                              title={`${day.key}${logs[day.key] ? ' · done today' : ' · not done yet'} (tap to toggle)`}
                              onClick={() => onToggleDay(habit, day)}
                              className={`nh-heat-cell ${logs[day.key] ? 'nh-heat-cell--done' : 'nh-heat-cell--empty'} nh-heat-cell--today`}
                            />
                          ) : (
                            <div
                              key={day.key}
                              title={`${day.key}${logs[day.key] ? ` · ${logs[day.key].count}× done` : ' · not done'}`}
                              className={`nh-heat-cell ${logs[day.key] ? 'nh-heat-cell--done' : 'nh-heat-cell--empty'}`}
                            />
                          )
                        ) : (
                          <div key={`pad-${di}`} className="nh-heat-cell" style={{ border: 'none', background: 'transparent' }} />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="nh-heat-legend">
            <p className="nh-heat-caption">Only today can be marked — past days are history.</p>
            <div className="nh-heat-legend-right">
              Not done
              <span className="nh-heat-swatch nh-heat-swatch--empty" />
              <span className="nh-heat-swatch nh-heat-swatch--done" />
              Done
            </div>
          </div>

          {/* Notes */}
          {habit.description && <p style={{ fontSize: 12, fontWeight: 600, color: '#444', margin: 0 }}>{habit.description}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => onEdit(habit)} className="nh-btn nh-btn--sm">
              <Pencil className="nh-btn-icon" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(habit)}
              className="nh-btn nh-btn--sm"
              style={{ background: '#ffe3e3' }}
            >
              <Trash2 className="nh-btn-icon" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Side column: streak card + calendar card (ALL mode / SINGLE mode)
// ============================================
function HabitSidePanel({ habits, logsByHabit, todayKey, selectedHabitId, onSelect }) {
  const selected = habits.find((h) => h.id === selectedHabitId) || null
  const single = selected // null = ALL mode

  // ---- Streak values ----
  let streakNum = 0
  let bestNum = 0
  let caption = ''

  if (single) {
    const stats = computeStats(single, logsByHabit[single.id] || {})
    streakNum = stats.current
    bestNum = stats.best
    caption = `${single.name} streak`
  } else {
    // ALL mode: days on which AT LEAST ONE habit was completed
    const allDays = new Set()
    for (const h of habits) {
      for (const k of Object.keys(logsByHabit[h.id] || {})) allDays.add(k)
    }
    const sorted = [...allDays].sort()
    // best run
    let run = 0
    let prev = null
    for (const k of sorted) {
      run = prev && daysBetweenKeys(prev, k) === 1 ? run + 1 : 1
      if (run > bestNum) bestNum = run
      prev = k
    }
    // current streak: ends today, or yesterday if today has no completed log
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    if (!allDays.has(dateKey(d))) d.setDate(d.getDate() - 1)
    while (allDays.has(dateKey(d))) {
      streakNum++
      d.setDate(d.getDate() - 1)
    }
    caption = 'Current streak · any habit'
  }

  // ---- Calendar data for the CURRENT month ----
  const cal = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const first = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leading = first.getDay()
    const todayDay = now.getDate()
    const cells = []
    for (let i = 0; i < leading; i++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) cells.push(day)
    return { year, month, cells, todayDay }
  }, [])

  function dayLevel(day) {
    const key = `${cal.year}-${String(cal.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isFuture = day > cal.todayDay
    const isToday = key === todayKey
    let level = 'default'
    let tooltip = ''

    if (single) {
      const done = !!logsByHabit[single.id]?.[key]
      if (!isFuture && done) level = { type: 'single', hex: (HABIT_COLORS[single.color] || HABIT_COLORS.green).hex }
      tooltip = isFuture
        ? `${MONTHS[cal.month]} ${day} · upcoming`
        : done
          ? `${MONTHS[cal.month]} ${day} · ${single.name} done`
          : `${MONTHS[cal.month]} ${day} · Not done`
    } else {
      if (!isFuture) {
        // Only habits created on or before that day are eligible (same fairness idea as `summary`)
        const eligible = habits.filter((h) => {
          if (!h.created_at) return true
          const created = dateKey(new Date(h.created_at))
          return daysBetweenKeys(created, key) >= 0
        })
        if (eligible.length > 0) {
          const doneCount = eligible.filter((h) => logsByHabit[h.id]?.[key]).length
          if (doneCount === eligible.length) level = { type: 'all', cls: 'nh-cal-day--all' }
          else if (doneCount > 0) level = { type: 'some', cls: 'nh-cal-day--some' }
          tooltip = `${MONTHS[cal.month]} ${day} · ${doneCount}/${eligible.length} habits`
        } else {
          tooltip = `${MONTHS[cal.month]} ${day} · upcoming`
        }
      } else {
        tooltip = `${MONTHS[cal.month]} ${day} · upcoming`
      }
    }
    return { key, level, tooltip, isFuture, isToday }
  }

  const flameCls =
    streakNum >= 7 ? 'nh-streak-flame--hot' : streakNum >= 3 ? 'nh-streak-flame--mid' : streakNum >= 1 ? 'nh-streak-flame--low' : 'nh-streak-flame--0'

  return (
    <div className="nh-side">
      {/* Streak card */}
      <div className="nh-side-card">
        <div className="nh-side-head">
          <Flame className={`nh-streak-flame ${flameCls}`} fill="currentColor" />
          <div>
            <p className="nh-streak-num">
              {streakNum} day{streakNum === 1 ? '' : 's'}
            </p>
            <p className="nh-streak-cap">{caption}</p>
          </div>
        </div>
        <hr className="nh-side-divider" />
        <div className="nh-best-row">
          <span className="nh-best-label">BEST</span>
          <span>{bestNum} days</span>
        </div>
      </div>

      {/* Calendar card */}
      <div className="nh-side-card">
        <div className="nh-cal-head">
          <Calendar />
          {new Date().toLocaleDateString('en-US', { month: 'long' })} {cal.year}
        </div>
        <div className="nh-cal-grid">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
            <span key={`wd-${i}`} className="nh-cal-wd">
              {w}
            </span>
          ))}
          {cal.cells.map((day, i) => {
            if (day === null) return <span key={`pad-${i}`} className="nh-cal-day nh-cal-day--pad" />
            const { level, tooltip, isFuture, isToday } = dayLevel(day)
            const style = level?.type === 'single' ? { background: level.hex } : undefined
            const cls = ['nh-cal-day']
            if (level?.cls) cls.push(level.cls)
            if (level?.type === 'single') cls.push('nh-cal-day--single')
            if (isFuture) cls.push('nh-cal-day--future')
            if (isToday) cls.push('nh-cal-day--today')
            return (
              <span key={day} className={cls.join(' ')} style={style} title={tooltip}>
                {day}
              </span>
            )
          })}
        </div>
        {/* Legend */}
        <div className="nh-cal-legend">
          {single ? (
            <>
              <span className="nh-cal-legend-item">
                <span className="nh-cal-legend-swatch" style={{ background: (HABIT_COLORS[single.color] || HABIT_COLORS.green).hex }} />
                Done
              </span>
              <span className="nh-cal-legend-item">
                <span className="nh-cal-legend-swatch nh-cal-legend-swatch--missed" />
                Missed
              </span>
            </>
          ) : (
            <>
              <span className="nh-cal-legend-item">
                <span className="nh-cal-legend-swatch nh-cal-legend-swatch--some" />
                Some
              </span>
              <span className="nh-cal-legend-item">
                <span className="nh-cal-legend-swatch nh-cal-legend-swatch--all" />
                All done
              </span>
            </>
          )}
        </div>
        {/* Filter chips */}
        <div className="nh-filter-row">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`nh-filter-chip ${selectedHabitId === null ? 'nh-filter-chip--sel' : ''}`}
            aria-pressed={selectedHabitId === null}
            title="All habits"
            aria-label="All habits"
          >
            <LayoutGrid />
          </button>
          {habits.map((h) => {
            const IconComp = (HABIT_ICONS.find((i) => i.id === h.icon) || HABIT_ICONS[HABIT_ICONS.length - 1]).icon
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => onSelect(h.id)}
                className={`nh-filter-chip ${selectedHabitId === h.id ? 'nh-filter-chip--sel' : ''}`}
                aria-pressed={selectedHabitId === h.id}
                title={h.name}
                aria-label={h.name}
              >
                <IconComp />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Add / Edit modal
// ============================================
const TARGET_DESCRIPTORS = {
  1: 'Easy start',
  2: 'Easy start',
  3: 'Solid rhythm',
  4: 'Solid rhythm',
  5: 'Serious mode',
  6: 'Serious mode',
  7: 'Every. Single. Day.',
}

function HabitModal({ form, setForm, editing, saving, onClose, onSubmit }) {
  const [nameError, setNameError] = useState(false)
  const nameRef = useRef(null)

  function handleSubmit(e) {
    if (!form.name.trim()) {
      e.preventDefault()
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    onSubmit(e)
  }

  const hex = (HABIT_COLORS[form.color] || HABIT_COLORS.green).hex
  const PreviewIcon = (HABIT_ICONS.find((i) => i.id === form.icon) || HABIT_ICONS[HABIT_ICONS.length - 1]).icon

  return (
    <div className="nh-overlay">
      <div className="nh-overlay-bg" onClick={onClose} />
      <div className="nh-modal">
        {/* Peeking mascot */}
        <div className="nh-peek" aria-hidden="true">
          <svg viewBox="0 0 56 40" width="56" height="40">
            <rect x="4" y="12" width="48" height="40" rx="12" fill="#fff" stroke="#111" strokeWidth="3" />
            <g className="nh-peek-eyes">
              <circle cx="19" cy="28" r="3" fill="#111" />
              <circle cx="37" cy="28" r="3" fill="#111" />
            </g>
            <path d="M23 34 Q28 38 33 34" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M12 10 L12 16 Q28 22 44 16 L44 10Z" fill="#111" />
            <polygon points="28,0 56,8 28,16 0,8" fill="#111" />
          </svg>
        </div>

        {/* Header */}
        <div className="nh-modal-head">
          <h2 className="nh-modal-title">
            {editing ? 'Edit ' : 'Add '}
            <span className="nh-hl">Habit</span>
          </h2>
          <button type="button" onClick={onClose} className="nh-modal-x" aria-label="Close">
            <X />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="nh-form">
          {/* Name */}
          <div>
            <div className="nh-label-row">
              <label className="nh-label" htmlFor="nh-habit-name">
                Habit name *
              </label>
              {nameError && (
                <span className="nh-name-err" role="alert">
                  Name your habit first
                </span>
              )}
            </div>
            <div className="nh-name-row">
              <div className="nh-name-preview" style={{ '--hc': hex }}>
                <PreviewIcon />
              </div>
              <input
                id="nh-habit-name"
                ref={nameRef}
                type="text"
                required
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  if (nameError) setNameError(false)
                }}
                placeholder="e.g., Exercise, Read, Meditate"
                className={`nh-input ${nameError ? 'nh-input--error' : ''}`}
              />
            </div>
          </div>

          {/* Icon */}
          <div>
            <span className="nh-label" id="nh-icon-label">
              Icon
            </span>
            <div className="nh-icon-grid" role="radiogroup" aria-labelledby="nh-icon-label">
              {HABIT_ICONS.map((item) => {
                const Icon = item.icon
                const selected = form.icon === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={item.id}
                    title={item.id}
                    onClick={() => setForm({ ...form, icon: item.id })}
                    className={`nh-icon-tile ${selected ? 'nh-icon-tile--sel' : ''}`}
                    style={selected ? { '--hc': hex } : undefined}
                  >
                    <Icon />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color */}
          <div>
            <span className="nh-label" id="nh-color-label">
              Color
            </span>
            <div className="nh-color-row" role="radiogroup" aria-labelledby="nh-color-label">
              {Object.entries(HABIT_COLORS).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={form.color === key}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setForm({ ...form, color: key })}
                  className={`nh-swatch ${form.color === key ? 'nh-swatch--sel' : ''}`}
                  style={{ '--hc': c.hex }}
                >
                  {form.color === key && <Check />}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <span className="nh-label" id="nh-cat-label">
              Category
            </span>
            <div className="nh-cat-row" role="radiogroup" aria-labelledby="nh-cat-label">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={form.category === c}
                  aria-label={c}
                  onClick={() => setForm({ ...form, category: c })}
                  className={`nh-cat-chip ${form.category === c ? 'nh-cat-chip--sel' : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Target */}
          <div>
            <div className="nh-label-row">
              <span className="nh-label" id="nh-target-label">
                Target (days per week)
              </span>
              <span className="nh-target-desc">{TARGET_DESCRIPTORS[form.target]}</span>
            </div>
            <div className="nh-target-row" role="radiogroup" aria-labelledby="nh-target-label">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={form.target === n}
                  aria-label={`${n} days per week`}
                  onClick={() => setForm({ ...form, target: n })}
                  className={`nh-target-tile ${form.target === n ? 'nh-target-tile--sel' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="nh-label" htmlFor="nh-habit-notes">
              Notes
            </label>
            <textarea
              id="nh-habit-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add a short note..."
              className="nh-input nh-input--area"
            />
          </div>

          {/* Footer */}
          <div className="nh-modal-foot">
            <button type="button" onClick={onClose} className="nh-cancel">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="nh-btn nh-submit">
              <Sprout className={`nh-sprout ${saving ? 'nh-sprout--grow' : ''}`} />
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// Delete confirmation
// ============================================
function DeleteConfirm({ habit, deleting, onCancel, onConfirm }) {
  return (
    <div className="nh-overlay nh-overlay--center">
      <div className="nh-overlay-bg" onClick={onCancel} />
      <div className="nh-modal nh-modal--delete">
        <div className="nh-state-iconbox nh-state-iconbox--coral" style={{ margin: '0 0 12px' }}>
          <AlertCircle />
        </div>
        <h3 className="nh-del-title">Delete this habit?</h3>
        <p className="nh-del-body">
          "{habit.name}" and all habit tracking history for this habit will also be removed.
        </p>
        <div className="nh-modal-foot" style={{ paddingTop: 0 }}>
          <button type="button" onClick={onCancel} className="nh-btn nh-btn--sm">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="nh-btn nh-btn--sm nh-del-btn">
            <Trash2 className="nh-btn-icon" />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
