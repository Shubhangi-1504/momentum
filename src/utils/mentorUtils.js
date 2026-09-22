// ============================================
// Mentor Portal — pure helpers (no side effects)
// Shared by dbService and mentor pages so status
// rules are calculated in exactly one place.
// ============================================

/**
 * Human-friendly relative time: "Just now", "5m ago", "3h ago",
 * "Yesterday", "5 days ago", or a short date past a month.
 */
export function relativeTime(iso, now = new Date()) {
  if (!iso) return 'Never'
  const then = new Date(iso)
  const diffMs = now - then
  if (diffMs < 0) return formatDateShort(then)

  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return formatDateShort(then)
}

export function formatDateShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDate(iso) {
  if (!iso) return '—'
  return formatDateShort(new Date(iso))
}

/**
 * Same overdue rule the Student Study Tracker uses — calendar-date based:
 * a task is overdue when its due DATE is before TODAY (local), regardless
 * of time-of-day. Matches the Study Tracker's date-only due form.
 */
export function isOverdueAssignment(a, now = new Date()) {
  if (a.status === 'completed' || !a.due_date) return false
  const due = new Date(a.due_date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return due < today && !(
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  )
}

/**
 * Aggregate assignment counts, mirroring the Study Tracker summary cards.
 */
export function assignmentStats(assignments, now = new Date()) {
  const s = { total: 0, completed: 0, in_progress: 0, pending: 0, overdue: 0 }
  for (const a of assignments || []) {
    s.total++
    if (isOverdueAssignment(a, now)) s.overdue++
    if (a.status === 'completed') s.completed++
    else if (a.status === 'in_progress' && !isOverdueAssignment(a, now)) s.in_progress++
    else if (!isOverdueAssignment(a, now)) s.pending++
  }
  s.completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
  return s
}

/**
 * Simple, documented review-status rule:
 *   NEEDS REVIEW when the student has never been reviewed, or has overdue /
 *   heavy pending work (5+) that hasn't been looked at in 3+ days.
 * Everything else is ON TRACK (e.g. overdue work reviewed yesterday).
 */
export function studentNeedsReview({ overdue = 0, pending = 0, lastReviewedAt }, now = new Date()) {
  if (!lastReviewedAt) return overdue > 0 || pending > 0
  const daysSinceReview = (now - new Date(lastReviewedAt)) / 86400000
  const stale = daysSinceReview >= 3
  return stale && (overdue > 0 || pending >= 5)
}

export const REVIEW_STATUS = {
  on_track: { label: 'On Track', classes: 'bg-green-50 text-green-700 border-green-200' },
  needs_review: { label: 'Needs Review', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export function reviewStatusMeta(needsReview) {
  return needsReview ? REVIEW_STATUS.needs_review : REVIEW_STATUS.on_track
}
