// ============================================
// Home dashboard — shared date/greeting helpers used by StudentHome.jsx.
// ============================================

/** Shared date key in local time (YYYY-MM-DD) — no UTC drift. */
export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "GOOD MORNING / AFTERNOON / EVENING" + parts of today's date. */
export function getGreeting(now = new Date()) {
  const h = now.getHours()
  const word = h < 12 ? 'MORNING' : h < 17 ? 'AFTERNOON' : 'EVENING'
  return {
    word,
    date: now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  }
}

/** Monday-based start of the current week (used for "Journal Entries — This Week"). */
export function startOfWeek(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - dow)
  return d
}
