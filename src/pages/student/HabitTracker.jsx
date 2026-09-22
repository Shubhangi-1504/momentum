import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dbService } from '../../services/dbService'
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
  CheckCircle2,
  Undo2,
} from 'lucide-react'

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
// Pastel palette (keys persisted on habits.color)
// heat: [empty, low, medium, high]
// ============================================
const HABIT_COLORS = {
  green: { label: 'Green', swatch: 'bg-green-300', iconBg: 'bg-green-100', iconText: 'text-green-600', heat: ['bg-gray-100/70', 'bg-green-100', 'bg-green-300', 'bg-green-500'] },
  mint: { label: 'Mint', swatch: 'bg-teal-300', iconBg: 'bg-teal-100', iconText: 'text-teal-600', heat: ['bg-gray-100/70', 'bg-teal-100', 'bg-teal-300', 'bg-teal-500'] },
  blue: { label: 'Blue', swatch: 'bg-sky-300', iconBg: 'bg-sky-100', iconText: 'text-sky-600', heat: ['bg-gray-100/70', 'bg-sky-100', 'bg-sky-300', 'bg-sky-500'] },
  yellow: { label: 'Yellow', swatch: 'bg-amber-300', iconBg: 'bg-amber-100', iconText: 'text-amber-600', heat: ['bg-gray-100/70', 'bg-amber-100', 'bg-amber-300', 'bg-amber-400'] },
  orange: { label: 'Orange', swatch: 'bg-orange-300', iconBg: 'bg-orange-100', iconText: 'text-orange-600', heat: ['bg-gray-100/70', 'bg-orange-100', 'bg-orange-300', 'bg-orange-500'] },
  coral: { label: 'Coral', swatch: 'bg-rose-300', iconBg: 'bg-rose-100', iconText: 'text-rose-600', heat: ['bg-gray-100/70', 'bg-rose-100', 'bg-rose-300', 'bg-rose-500'] },
  pink: { label: 'Pink', swatch: 'bg-pink-300', iconBg: 'bg-pink-100', iconText: 'text-pink-600', heat: ['bg-gray-100/70', 'bg-pink-100', 'bg-pink-300', 'bg-pink-500'] },
  purple: { label: 'Purple', swatch: 'bg-purple-300', iconBg: 'bg-purple-100', iconText: 'text-purple-600', heat: ['bg-gray-100/70', 'bg-purple-100', 'bg-purple-300', 'bg-purple-500'] },
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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Cream content sheet */}
      <div className="bg-[#FAF8F3] border border-[#EFEAE0] rounded-3xl p-5 sm:p-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Habit Tracker</h1>
            <p className="text-gray-600 mt-1">Build better habits, one day at a time.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Habit
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="animate-pulse flex items-center justify-between">
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                  <div className="h-8 w-8 bg-gray-100 rounded-full" />
                </div>
                <div className="animate-pulse h-7 w-10 bg-gray-100 rounded mt-3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
            <SummaryCard label="Total Habits" value={summary.total} pct={100} stroke="#A7D7AB" />
            <SummaryCard label="On Track" value={summary.onTrack} pct={pctOf(summary.onTrack, summary.total)} stroke="#86C98C" />
            <SummaryCard label="Needs Attention" value={summary.attention} pct={pctOf(summary.attention, summary.total)} stroke="#F2C879" />
            <SummaryCard label="Fell Behind" value={summary.behind} pct={pctOf(summary.behind, summary.total)} stroke="#EFA1A1" />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="animate-pulse flex gap-5">
                  <div className="h-12 w-12 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-32 bg-gray-100 rounded" />
                    <div className="h-[72px] w-full bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Something went wrong</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={loadAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        ) : habits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sprout className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No habits yet</h3>
            <p className="text-gray-500 mb-5">Start with one small habit and build from there.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#43A047] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first habit
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                logs={logsByHabit[h.id] || {}}
                weeks={weeks}
                onToggleDay={handleToggleDay}
                onEdit={() => openEdit(h)}
                onDelete={() => setDeletingHabit(h)}
              />
            ))}
          </div>
        )}

        {/* Motivational footer */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 text-gray-400 mb-1">
            <Leaf className="w-4 h-4 text-green-400" />
            <Sprout className="w-4 h-4 text-green-300" />
          </div>
          <p className="text-gray-700 font-medium leading-snug">
            Small habits make
            <br />
            big progress!
          </p>
          <p className="text-gray-400 text-sm mt-2 italic">
            "Discipline today, a better tomorrow."
          </p>
        </div>
      </div>

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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          <Check className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  )
}

function pctOf(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function SummaryCard({ label, value, pct, stroke }) {
  const r = 10
  const c = 2 * Math.PI * r
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <svg width="32" height="32" viewBox="0 0 28 28" className="shrink-0">
        <circle cx="14" cy="14" r={r} fill="none" stroke="#F3F1EB" strokeWidth="3" />
        <circle
          cx="14"
          cy="14"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform="rotate(-90 14 14)"
        />
      </svg>
    </div>
  )
}

function HabitCard({ habit, logs, weeks, onToggleDay, onEdit, onDelete }) {
  const color = HABIT_COLORS[habit.color] || HABIT_COLORS.green
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex flex-col xl:flex-row gap-5">
        {/* Left: identity + stats */}
        <div className="flex items-start gap-4 xl:w-60 shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${color.iconBg}`}>
            <IconComp className={`w-6 h-6 ${color.iconText}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">{habit.name}</h3>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                {habit.category || 'Other'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm">
              <span className="inline-flex items-center gap-1 text-orange-500 font-medium">
                <Flame className="w-4 h-4" />
                {stats.current} day streak
              </span>
              <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                <Trophy className="w-3.5 h-3.5" />
                Best: {stats.best}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{stats.pct}%</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Target: {stats.target} day{stats.target > 1 ? 's' : ''}/week
              {stats.todayDone && (
                <span className="text-green-600 font-medium"> · Done today ✓</span>
              )}
            </p>
          </div>
        </div>

        {/* Main: heatmap + today's completion */}
        <div className="flex-1 min-w-0">
          {/* Strict daily completion: one tap for TODAY only */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs text-gray-500">
              Today · {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => onToggleDay(habit, { key: todayKey })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                todayDone
                  ? 'bg-primary-soft text-primary-dark hover:bg-[#dcefdd]'
                  : 'bg-primary text-white hover:bg-[#43A047]'
              }`}
              title={todayDone ? 'Undo today (today only — past days stay as they are)' : 'Mark this habit as completed for today'}
            >
              {todayDone ? <Undo2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {todayDone ? 'Done today — undo' : 'Mark done today'}
            </button>
          </div>

          <div className="flex gap-1.5">
            {/* Weekday labels */}
            <div className="flex flex-col shrink-0" style={{ paddingTop: 15 }}>
              {WEEKDAYS.map((d, i) => (
                <div key={d} className="text-[8px] text-gray-400 leading-none" style={{ height: CELL, marginBottom: GAP, visibility: [0, 2, 4, 6].includes(i) ? 'visible' : 'hidden' }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Scrollable month labels + grid */}
            <div className="overflow-x-auto pb-1">
              <div style={{ width: weeks.length * COL }}>
                <div className="flex" style={{ height: 15 }}>
                  {monthLabels.map((m, j) => (
                    <div key={j} className="text-[9px] text-gray-400 uppercase tracking-wide" style={{ width: m.span * COL, minWidth: 0 }}>
                      {m.span >= 3 ? m.name : ''}
                    </div>
                  ))}
                </div>
                <div className="flex" style={{ gap: GAP }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                      {week.map((day, di) =>
                        day ? (
                          day.isToday ? (
                            <button
                              key={day.key}
                              type="button"
                              title={`${day.key}${logs[day.key] ? ' · done today' : ' · not done yet'} (tap to toggle)`}
                              onClick={() => onToggleDay(habit, day)}
                              className={`${color.heat[logs[day.key] ? 3 : 0]} rounded-[3px] border border-black/[0.03] ring-1 ring-primary/50 hover:ring-2 hover:ring-green-400/70 transition-shadow`}
                              style={{ width: CELL, height: CELL }}
                            />
                          ) : (
                            <div
                              key={day.key}
                              title={`${day.key}${logs[day.key] ? ` · ${logs[day.key].count}× done` : ' · not done'}`}
                              className={`${color.heat[logs[day.key] ? Math.min(3, logs[day.key].count || 1) : 0]} rounded-[3px] border border-black/[0.03]`}
                              style={{ width: CELL, height: CELL }}
                            />
                          )
                        ) : (
                          <div key={`pad-${di}`} style={{ width: CELL, height: CELL }} />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-between gap-1 mt-2">
            <p className="text-[9px] text-gray-400">Only today can be marked — past days are history.</p>
            <div className="flex items-center gap-1 text-[9px] text-gray-400">
              Not done
              <span className={`${color.heat[0]} rounded-[2px] border border-black/[0.03]`} style={{ width: CELL, height: CELL }} />
              <span className={`${color.heat[3]} rounded-[2px] border border-black/[0.03]`} style={{ width: CELL, height: CELL }} />
              Done
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex xl:flex-col gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            title="Edit habit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete habit"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function HabitModal({ form, setForm, editing, saving, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Habit' : 'Add Habit'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Habit name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Exercise, Read, Meditate"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-7 gap-2">
              {HABIT_ICONS.map((item) => {
                const Icon = item.icon
                const selected = form.icon === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.id}
                    onClick={() => setForm({ ...form, icon: item.id })}
                    className={`aspect-square rounded-xl border flex items-center justify-center transition-colors ${
                      selected
                        ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                        : 'border-gray-150 bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${selected ? 'text-green-700' : 'text-gray-500'}`} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(HABIT_COLORS).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  title={c.label}
                  onClick={() => setForm({ ...form, color: key })}
                  className={`w-8 h-8 rounded-full ${c.swatch} transition-shadow ${
                    form.color === key ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Category + Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target (days per week)</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, target: n })}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      form.target === n
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add a short note..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-[#43A047] disabled:bg-[#81C784] transition-colors"
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ habit, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center mb-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Delete this habit?</h3>
        <p className="text-sm text-gray-500 mt-1.5">
          "{habit.name}" and all habit tracking history for this habit will also be removed.
        </p>
        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
