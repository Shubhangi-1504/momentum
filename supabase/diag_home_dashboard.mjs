// End-to-end verification for the Home dashboard data layer — safe to delete.
// Exercises the exact dbService calls StudentHome.jsx makes, with a fresh
// student, and checks the dashboard metric computations + RLS isolation.
// Run:  node supabase/diag_home_dashboard.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    })
)
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY

let pass = 0
let fail = 0
function check(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name} ${extra}`)
  }
}

// Local-date key, identical to homeUtils.dateKey
function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function mkStudent(n) {
  const suffix = Date.now() + n
  const email = `homediag${n}_${suffix}@example.com`
  const client = createClient(url, anon)
  const { data, error } = await client.auth.signUp({
    email,
    password: 'Diag-Test-123!',
    options: {
      data: { full_name: `Home Diag ${n}`, role: 'student', usn: `DIAGH-${suffix}` },
    },
  })
  if (error || !data.session) {
    console.log(`signup ${n} FAILED:`, error?.message)
    return null
  }
  const authed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  return { email, client: authed, uid: data.user.id }
}

console.log('=== Setup: two fresh students ===')
const A = await mkStudent(1)
const B = await mkStudent(2)
if (!A || !B) process.exit(1)

for (const [label, s] of [
  ['A', A],
  ['B', B],
]) {
  const st = await s.client.from('students').select('id').eq('profile_id', s.uid).single()
  check(`${label}: students row exists`, !!st.data?.id, st.error?.message || '')
  s.studentId = st.data?.id
}

// ---------- Data seeding (same tables/pages the dashboard reads) ----------
console.log('\n=== Seed data (assignments, habits, logs, journals) ===')
const today = dateKey()
const todayEnd = new Date()
todayEnd.setHours(18, 0, 0, 0) // 6 PM today — "due today"

const { data: asg1 } = await A.client
  .from('assignments')
  .insert({
    student_id: A.studentId,
    title: 'Data Structures Assignment',
    description: 'Complete questions 1–3',
    due_date: todayEnd.toISOString(),
    status: 'pending',
    priority: 'high',
  })
  .select()
  .single()
check('assignment due today created', !!asg1?.id, 'missing')

const { data: asg2 } = await A.client
  .from('assignments')
  .insert({
    student_id: A.studentId,
    title: 'Old finished task',
    due_date: todayEnd.toISOString(),
    status: 'completed',
    priority: 'low',
  })
  .select()
  .single()
check('completed assignment created', !!asg2?.id, 'missing')

const { data: asg3 } = await A.client
  .from('assignments')
  .insert({
    student_id: A.studentId,
    title: 'Task due next week',
    due_date: new Date(Date.now() + 7 * 864e5).toISOString(),
    status: 'pending',
  })
  .select()
  .single()
check('future assignment created', !!asg3?.id, 'missing')

const { data: h1 } = await A.client
  .from('habits')
  .insert({ student_id: A.studentId, name: 'Evening Workout', frequency: 'daily' })
  .select()
  .single()
const { data: h2 } = await A.client
  .from('habits')
  .insert({ student_id: A.studentId, name: 'Read 20 pages', frequency: 'daily' })
  .select()
  .single()
check('2 habits created', !!h1?.id && !!h2?.id)

const { error: logErr } = await A.client.from('habit_logs').insert({
  habit_id: h1.id,
  log_date: today,
  completed: true,
  count: 1,
})
check("today's habit log created", !logErr, logErr?.message || '')

const { data: j1 } = await A.client
  .from('journal_entries')
  .insert({
    student_id: A.studentId,
    title: 'Grateful',
    content: 'Today was good.',
    journal_date: today,
  })
  .select()
  .single()
check('journal entry created', !!j1?.id)

const { data: jB } = await B.client
  .from('journal_entries')
  .insert({ student_id: B.studentId, title: "B's page", content: 'private', journal_date: today })
  .select()
  .single()
check('B journal entry created', !!jB?.id)

// ---------- Dashboard queries (mirror StudentHome exactly) ----------
console.log('\n=== Dashboard queries (StudentHome parity) ===')
const [aRes, hRes, lRes, jRes] = await Promise.all([
  A.client.from('assignments').select('*').eq('student_id', A.studentId),
  A.client.from('habits').select('*').eq('student_id', A.studentId),
  A.client
    .from('habit_logs')
    .select('id, habit_id, log_date, count, completed, habits!inner(student_id)')
    .eq('habits.student_id', A.studentId)
    .gte('log_date', today)
    .lte('log_date', today),
  A.client.from('journal_entries').select('*').eq('student_id', A.studentId),
])
check('assignments query ok', !aRes.error, aRes.error?.message || '')
check('habits query ok', !hRes.error, hRes.error?.message || '')
check(
  'getStudentHabitLogs (habits!inner join) ok',
  !lRes.error,
  lRes.error?.message || ''
)
check('journal query ok', !jRes.error, jRes.error?.message || '')

// ---------- Metric computations (mirror the useMemo) ----------
console.log('\n=== Metric computations ===')
const assignments = aRes.data || []
const habits = hRes.data || []
const logsToday = lRes.data || []
const journals = jRes.data || []

const dueToday = assignments.filter(
  (a) => a.due_date && dateKey(new Date(a.due_date)) === today
).length
check('Study Sessions (due today) = 2', dueToday === 2, `got ${dueToday}`)

const focusTasks = assignments
  .filter((a) => a.due_date && dateKey(new Date(a.due_date)) === today)
  .sort((a, b) => (a.status === 'completed') - (b.status === 'completed'))
check("Today's Focus = 2 tasks", focusTasks.length === 2, `got ${focusTasks.length}`)
check(
  'unfinished task sorts first',
  focusTasks[0]?.title === 'Data Structures Assignment',
  `got ${focusTasks[0]?.title}`
)

const completedToday = logsToday.filter((l) => l.completed).length
check('Habits Completed = 1/2', `${completedToday}/${habits.length}` === '1/2')

const weekStart = new Date()
const dow = (weekStart.getDay() + 6) % 7
weekStart.setDate(weekStart.getDate() - dow)
weekStart.setHours(0, 0, 0, 0)
const journalThisWeek = journals.filter((j) => new Date(j.created_at) >= weekStart).length
check('Journal Entries this week = 1', journalThisWeek === 1, `got ${journalThisWeek}`)

const doneA = assignments.filter((a) => a.status === 'completed').length
const overall = Math.round(
  ((doneA / assignments.length + completedToday / habits.length) / 2) * 100
)
check('Overall Progress = 42% (avg of 1/3 done, 1/2 habits)', overall === 42, `got ${overall}%`)

// ---------- Status cycle persistence (Today's Focus interaction) ----------
console.log('\n=== Status cycle (pending → in_progress) ===')
const cyc = await A.client
  .from('assignments')
  .update({ status: 'in_progress' })
  .eq('id', asg1.id)
  .select()
  .single()
check('status persisted', cyc.data?.status === 'in_progress', cyc.error?.message || '')

// ---------- RLS isolation ----------
console.log('\n=== RLS isolation ===')
{
  const { data, error } = await A.client
    .from('journal_entries')
    .select('*')
    .eq('student_id', B.studentId)
  check('A sees NO journal rows of B', !error && data?.length === 0, `got ${data?.length}`)
}
{
  const { data, error } = await A.client
    .from('habit_logs')
    .select('id, habits!inner(student_id)')
    .eq('habits.student_id', B.studentId)
  check(
    'A CANNOT read habit_logs joined to B (habits!inner + RLS)',
    !error && data?.length === 0,
    `got ${data?.length}, err: ${error?.message || ''}`
  )
}
{
  const { data, error } = await A.client
    .from('assignments')
    .select('*')
    .eq('student_id', B.studentId)
  check('A sees NO assignment rows of B', !error && data?.length === 0, `got ${data?.length}`)
}

// ---------- cleanup ----------
console.log('\n=== Cleanup diag data ===')
for (const [label, s] of [
  ['A', A],
  ['B', B],
]) {
  const del = await s.client
    .from('assignments')
    .delete()
    .eq('student_id', s.studentId)
  const delH = await s.client.from('habits').delete().eq('student_id', s.studentId)
  const delJ = await s.client.from('journal_entries').delete().eq('student_id', s.studentId)
  check(
    `${label}: rows cleaned`,
    !del.error && !delH.error && !delJ.error,
    [del.error, delH.error, delJ.error].find(Boolean)?.message || ''
  )
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
process.exit(fail === 0 ? 0 : 1)
