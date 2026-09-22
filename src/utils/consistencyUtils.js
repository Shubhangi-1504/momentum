// ============================================
// Consistency system — shared pure helpers.
// Single source of truth for local calendar-date math, streaks,
// countdowns and consistency stats. Used by student and mentor pages
// so the rules are computed in exactly one place.
// All dates are LOCAL calendar dates (no UTC off-by-one).
// ============================================

/** Local date key YYYY-MM-DD (mirrors homeUtils.dateKey; kept standalone
 *  so mentor code does not import student-page helpers). */
export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Whole calendar days between two date keys (exact, parsed as UTC). */
export function daysBetweenKeys(fromKey, toKey) {
  return Math.round(
    (new Date(`${toKey}T00:00:00Z`) - new Date(`${fromKey}T00:00:00Z`)) / 86400000
  )
}

/** Date key of a timestamptz/ISO string, in LOCAL time. */
export function isoToKey(iso) {
  return iso ? dateKey(new Date(iso)) : null
}

/** Parse a DATE column value ("YYYY-MM-DD") without timezone shifting. */
export function parseDateKey(key) {
  return key ? new Date(`${key}T00:00:00`) : null
}

/** Add n days to a date key, returning a new key. */
export function addDaysKey(key, n) {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

// ============================================
// HABIT STREAKS (strict: only completed days count, no backfill)
// ============================================

/**
 * Current streak of a habit from a map of { [dateKey]: logRow }.
 * Counts consecutive completed days ending today; if today is not done
 * yet, a run ending yesterday still counts (the day isn't over).
 */
export function habitCurrentStreak(logsMap, todayK = dateKey()) {
  let streak = 0
  let cursor = todayK
  if (!logsMap[cursor]) {
    cursor = addDaysKey(cursor, -1)
    if (!logsMap[cursor]) return 0
  }
  while (logsMap[cursor]) {
    streak++
    cursor = addDaysKey(cursor, -1)
  }
  return streak
}

/** Longest run of consecutive completed days in the log map. */
export function habitLongestStreak(logsMap) {
  const keys = Object.keys(logsMap).sort()
  let best = 0
  let run = 0
  let prev = null
  for (const k of keys) {
    run = prev && daysBetweenKeys(prev, k) === 1 ? run + 1 : 1
    if (run > best) best = run
    prev = k
  }
  return best
}

/**
 * Consistency % for one habit: completed days / days the habit has existed
 * (creation → today, capped at the tracked window), clamped to 0..100.
 */
export function habitConsistencyPct(logsMap, createdAtIso, todayK = dateKey()) {
  const created = createdAtIso ? isoToKey(createdAtIso) : todayK
  const ageDays = Math.max(1, daysBetweenKeys(created, todayK) + 1)
  const done = Object.keys(logsMap).length
  return Math.min(100, Math.round((done / ageDays) * 100))
}

// ============================================
// OVERALL CONSISTENCY (habit days ∪ assignment-done days)
// ============================================

/**
 * Merge habit + assignment completion into one set of active day keys,
 * then compute the overall stats from REAL dates only.
 *
 * @param {string[]} habitDates   - date keys with ≥1 habit completed
 * @param {string[]} assignDates  - date keys with ≥1 assignment completed
 * @param {string}   startDateKey - tracking start date
 * @param {string}   todayK       - today's local key
 */
export function overallConsistency(habitDates, assignDates, startDateKey, todayK = dateKey()) {
  const active = new Set([...(habitDates || []), ...(assignDates || [])])
  const start = startDateKey || todayK
  // Only count days from the tracking start (inclusive) up to today.
  const totalDays = Math.max(1, daysBetweenKeys(start <= todayK ? start : todayK, todayK) + 1)

  let activeInRange = 0
  for (const k of active) {
    if (k >= start && k <= todayK) activeInRange++
  }

  const currentStreak = streakFromActiveDays([...active], todayK)
  const longestStreak = longestStreakFromActiveDays([...active])

  return {
    activeDays: activeInRange,
    totalDays,
    overallPct: Math.min(100, Math.round((activeInRange / totalDays) * 100)),
    currentStreak,
    longestStreak,
  }
}

/** Consecutive active days ending today (or yesterday if today not active). */
export function streakFromActiveDays(dateKeys, todayK = dateKey()) {
  const set = new Set(dateKeys)
  let cursor = todayK
  if (!set.has(cursor)) {
    cursor = addDaysKey(cursor, -1)
    if (!set.has(cursor)) return 0
  }
  let streak = 0
  while (set.has(cursor)) {
    streak++
    cursor = addDaysKey(cursor, -1)
  }
  return streak
}

/** Longest run of consecutive days in a list of date keys. */
export function longestStreakFromActiveDays(dateKeys) {
  const sorted = [...new Set(dateKeys)].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const k of sorted) {
    run = prev && daysBetweenKeys(prev, k) === 1 ? run + 1 : 1
    if (run > best) best = run
    prev = k
  }
  return best
}

// ============================================
// DEADLINE COUNTDOWN (calendar dates, no negative confusion)
// ============================================

/**
 * Countdown state for an assignment's due date.
 * Returns one of: completed | overdue | due_today | due_soon | upcoming | none
 * with a short human label ("Due today", "3 days left", "Overdue by 2 days").
 * `due` and `completed` are date keys (calendar semantics).
 */
export function dueCountdown({ dueKey, completed, todayK = dateKey() }) {
  if (!dueKey) return { state: 'none', label: 'No due date', days: null }
  if (completed) return { state: 'completed', label: 'Completed', days: 0 }

  const diff = daysBetweenKeys(todayK, dueKey)
  if (diff < 0) {
    return { state: 'overdue', label: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''}`, days: diff }
  }
  if (diff === 0) return { state: 'due_today', label: 'Due today', days: 0 }
  if (diff <= 3) {
    return { state: 'due_soon', label: `${diff} day${diff > 1 ? 's' : ''} left`, days: diff }
  }
  return { state: 'upcoming', label: `${diff} days left`, days: diff }
}

/** Tailwind classes per countdown state — matches the existing palette. */
export const COUNTDOWN_META = {
  completed: 'bg-green-50 text-green-700 border-green-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  due_today: 'bg-amber-100 text-amber-800 border-amber-300',
  due_soon: 'bg-amber-50 text-amber-700 border-amber-200',
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  none: 'bg-gray-100 text-gray-500 border-gray-200',
}
