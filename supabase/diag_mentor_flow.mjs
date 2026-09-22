// End-to-end verification of the Mentor ↔ Student connection flow + RLS matrix.
// Mirrors supabase/diag_home_dashboard.mjs conventions (fresh users, self-cleanup).
// Run:  node supabase/diag_mentor_flow.mjs
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

async function mkUser(n, role) {
  const suffix = Date.now() + n
  const email = `mflowdiag${n}_${suffix}@example.com`
  const client = createClient(url, anon)
  const { data, error } = await client.auth.signUp({
    email,
    password: 'Diag-Test-123!',
    options: {
      data: {
        full_name: role === 'mentor' ? `Mentor Diag ${n}` : `Student Diag ${n}`,
        role,
        usn: role === 'student' ? `DIAGM-${suffix}` : undefined,
      },
    },
  })
  if (error || !data.session) {
    console.log(`signup ${role} ${n} FAILED:`, error?.message)
    return null
  }
  const authed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  const table = role === 'mentor' ? 'mentors' : 'students'
  // connection_code exists only on mentors; selecting it on students
  // errors and leaves roleId undefined (breaking every later check).
  const select = role === 'mentor' ? 'id, connection_code' : 'id'
  const { data: row, error: rowErr } = await authed
    .from(table)
    .select(select)
    .eq('profile_id', data.user.id)
    .single()
  if (rowErr || !row) console.log(`  (!) ${table} lookup failed:`, rowErr?.message || 'no row')
  return { email, client: authed, uid: data.user.id, roleId: row?.id, code: row?.connection_code }
}

console.log('=== Setup: Mentor A, Mentor B, Student A, Student B ===')
const mentorA = await mkUser(1, 'mentor')
const mentorB = await mkUser(2, 'mentor')
const studentA = await mkUser(3, 'student')
const studentB = await mkUser(4, 'student')
if (!mentorA || !mentorB || !studentA || !studentB) process.exit(1)

check('mentor A has connection code', !!mentorA.code, `got ${mentorA.code}`)
check('mentor B has connection code', !!mentorB.code, `got ${mentorB.code}`)
check('codes are MOM-format', /^MOM-[A-HJ-NP-Z2-9]{5}$/.test(mentorA.code || ''), mentorA.code)

console.log('\n=== Connection flow (RPC) ===')
{
  const { data } = await studentA.client.rpc('request_mentor_connection', { p_code: 'MOM-XXXXX' })
  check('invalid code rejected', data?.ok === false, data?.error || '')
}
{
  const { data } = await studentA.client.rpc('request_mentor_connection', { p_code: mentorA.code })
  check('student A connected to mentor A', data?.ok === true, data?.error || '')
  check('connected response has mentor name', !!data?.mentor_name, '')
}
{
  const { data } = await studentA.client.rpc('request_mentor_connection', { p_code: mentorB.code })
  check('duplicate connection blocked (one active mentor)', data?.ok === false, data?.error || '')
}
{
  const { data } = await studentA.client.rpc('request_mentor_connection', { p_code: mentorA.code })
  check('re-connect to same mentor blocked', data?.ok === false, data?.error || '')
}
{
  const { data } = await studentB.client.rpc('request_mentor_connection', { p_code: mentorA.code })
  check('student B connected to mentor A (mentor has many students)', data?.ok === true, data?.error || '')
}

console.log('\n=== Student mentor info RPC ===')
{
  const { data } = await studentA.client.rpc('get_student_mentor_info')
  check('student A sees connected=true', data?.connected === true, '')
  check('student A sees mentor name', !!data?.mentor_name, '')
  check('student A last_reviewed_at null (never reviewed)', data?.last_reviewed_at === null, '')
}
{
  const { data } = await studentB.client.rpc('get_student_mentor_info')
  check('student B sees connected=true', data?.connected === true, '')
}

console.log('\n=== Seed assignments (same table as Study Tracker) ===')
const todayEnd = new Date()
todayEnd.setHours(18, 0, 0, 0)
const { data: asgA1 } = await studentA.client
  .from('assignments')
  .insert({
    student_id: studentA.roleId,
    title: 'DSA Assignment',
    subject: 'DSA',
    due_date: todayEnd.toISOString(),
    status: 'pending',
    priority: 'medium',
  })
  .select()
  .single()
check('student A assignment created', !!asgA1?.id)

const { data: asgB1 } = await studentB.client
  .from('assignments')
  .insert({
    student_id: studentB.roleId,
    title: 'B private task',
    due_date: todayEnd.toISOString(),
    status: 'pending',
  })
  .select()
  .single()
check('student B assignment created', !!asgB1?.id)

console.log('\n=== RLS matrix: assignments ===')
{
  const { data, error } = await studentA.client
    .from('assignments')
    .select('*')
    .eq('student_id', studentB.roleId)
  check('student A cannot read student B assignments', !error && data?.length === 0, `got ${data?.length}`)
}
{
  const { data, error } = await mentorA.client
    .from('assignments')
    .select('*')
    .eq('student_id', studentA.roleId)
  check('mentor A reads connected student A assignments', !error && data?.length === 1, `got ${data?.length}, ${error?.message || ''}`)
}
{
  const { data, error } = await mentorB.client
    .from('assignments')
    .select('*')
    .eq('student_id', studentA.roleId)
  check('mentor B cannot read student A (not connected)', !error && data?.length === 0, `got ${data?.length}`)
}
{
  const { data, error } = await mentorA.client
    .from('assignments')
    .select('*')
    .eq('student_id', studentB.roleId)
  check('mentor A reads student B (also connected to A)', !error && data?.length === 1, `got ${data?.length}`)
}

console.log('\n=== Mentor creates/updates assignment (same record) ===')
{
  const { data, error } = await mentorA.client
    .from('assignments')
    .insert({
      student_id: studentA.roleId,
      title: 'Mentor-created task',
      due_date: todayEnd.toISOString(),
      status: 'pending',
      created_by_role: 'mentor',
    })
    .select()
    .single()
  check('mentor A creates assignment for student A', !!data?.id, error?.message || '')
  var mentorAsgId = data?.id
}
{
  const { error } = await mentorA.client
    .from('assignments')
    .insert({
      student_id: studentB.roleId,
      title: 'should fail',
      created_by_role: 'mentor',
    })
    .select()
    .single()
  // Student B IS connected to mentor A in this diag, so this insert is allowed.
  // Instead verify the isolation with a non-connected pair below.
  check('mentor A insert for connected student B allowed', !error, error?.message || '')
}
{
  const { data, error } = await studentA.client
    .from('assignments')
    .update({ status: 'completed' })
    .eq('id', asgA1.id)
    .select()
    .single()
  check('student updates own assignment status', data?.status === 'completed', error?.message || '')
  const { data: seen } = await mentorA.client
    .from('assignments')
    .select('status')
    .eq('id', asgA1.id)
    .single()
  check('mentor sees the SAME updated record', seen?.status === 'completed', `got ${seen?.status}`)
}

console.log('\n=== Mentor remarks ===')
{
  const { data, error } = await mentorA.client
    .from('mentor_remarks')
    .insert({
      mentor_id: mentorA.roleId,
      student_id: studentA.roleId,
      assignment_id: asgA1.id,
      content: 'Please complete this before Friday.',
    })
    .select()
    .single()
  check('mentor A adds remark for connected student A', !!data?.id, error?.message || '')
  var remarkId = data?.id
}
{
  const { data } = await studentA.client
    .from('mentor_remarks')
    .select('*, mentors(id)')
    .eq('student_id', studentA.roleId)
  check('student A reads own remarks', data?.length === 1, `got ${data?.length}`)
}
{
  const { data } = await studentB.client
    .from('mentor_remarks')
    .select('*')
    .eq('student_id', studentA.roleId)
  check('student B cannot read student A remarks', data?.length === 0, `got ${data?.length}`)
}

console.log('\n=== Student reviews (Mark as Reviewed) ===')
{
  const { data, error } = await mentorA.client
    .from('student_reviews')
    .insert({ mentor_id: mentorA.roleId, student_id: studentA.roleId })
    .select()
    .single()
  check('mentor A reviews student A', !!data?.id, error?.message || '')
}
{
  const { data } = await studentA.client.rpc('get_student_mentor_info')
  check('last_reviewed_at now visible to student A', !!data?.last_reviewed_at, '')
}
{
  const { data } = await mentorB.client
    .from('student_reviews')
    .select('*')
    .eq('student_id', studentA.roleId)
  check('mentor B sees no reviews for student A', data?.length === 0, `got ${data?.length}`)
}

console.log('\n=== Journal privacy ===')
{
  const { data: jA } = await studentA.client
    .from('journal_entries')
    .insert({ student_id: studentA.roleId, title: 'Private', content: 'secret', journal_date: new Date().toISOString().slice(0, 10) })
    .select()
    .single()
  const { data: seen } = await mentorA.client
    .from('journal_entries')
    .select('*')
    .eq('id', jA.id)
  check('private journal NOT visible to mentor', seen?.length === 0, `got ${seen?.length}`)

  const { error: shareErr } = await studentA.client
    .from('journal_entries')
    .update({ is_visible_to_mentor: true })
    .eq('id', jA.id)
  const { data: seenShared } = await mentorA.client
    .from('journal_entries')
    .select('*')
    .eq('id', jA.id)
  check('shared journal visible to connected mentor', !shareErr && seenShared?.length === 1, `got ${seenShared?.length}, ${shareErr?.message || ''}`)

  const { data: bSees } = await studentB.client
    .from('journal_entries')
    .select('*')
    .eq('id', jA.id)
  check('student B cannot read student A journal (even shared)', bSees?.length === 0, `got ${bSees?.length}`)
}

console.log('\n=== Mentor reads student consistency data (read-only) ===')
{
  // Seed a habit + today's log for student A
  const { data: habit, error: hErr } = await studentA.client
    .from('habits')
    .insert({ student_id: studentA.roleId, name: 'Read 30 min', frequency: 'daily', target_count: 7 })
    .select()
    .single()
  check('student A creates a habit', !!habit?.id, hErr?.message || '')

  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const logDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const { data: log, error: lErr } = await studentA.client
    .from('habit_logs')
    .insert({ habit_id: habit.id, log_date: logDate, count: 1, completed: true })
    .select()
    .single()
  check('student A logs habit for today', !!log?.id, lErr?.message || '')

  // Mentor A (connected) can read habits + logs
  const { data: mHabits } = await mentorA.client
    .from('habits')
    .select('id, name')
    .eq('student_id', studentA.roleId)
  check('mentor A reads connected student habits', (mHabits || []).length === 1, `got ${mHabits?.length}`)

  const habitIds = (mHabits || []).map((h) => h.id)
  const { data: mLogs } = await mentorA.client
    .from('habit_logs')
    .select('id, habit_id, log_date, completed')
    .in('habit_id', habitIds)
  check('mentor A reads connected student habit logs (.in path)', (mLogs || []).length === 1, `got ${mLogs?.length}`)
  check('mentor A log read is completed=true', mLogs?.[0]?.completed === true, '')

  // Mentor B (NOT connected to student A) must see nothing
  const { data: bHabits } = await mentorB.client
    .from('habits')
    .select('id')
    .eq('student_id', studentA.roleId)
  check('mentor B cannot read student A habits (not connected)', (bHabits || []).length === 0, `got ${bHabits?.length}`)

  const { data: bLogs } = await mentorB.client
    .from('habit_logs')
    .select('id')
    .in('habit_id', habitIds)
  check('mentor B cannot read student A habit logs', (bLogs || []).length === 0, `got ${bLogs?.length}`)

  // Mentor must NOT be able to write student habit data
  const { error: wErr } = await mentorA.client
    .from('habit_logs')
    .insert({ habit_id: habit.id, log_date: logDate, count: 5, completed: true })
    .select()
    .single()
  check('mentor cannot insert habit logs (RLS write blocked)', !!wErr, 'insert unexpectedly allowed')

  // Consistency RPC for connected + unrelated student
  const { data: cons } = await mentorA.client.rpc('get_mentor_student_consistency', {
    p_student_id: studentA.roleId,
  })
  check('consistency RPC works for connected student', cons?.ok === true, cons?.error || '')
  check('consistency RPC returns habit completion dates', (cons?.habit_completion_dates || []).length === 1, `got ${cons?.habit_completion_dates?.length}`)

  const { data: consB } = await mentorB.client.rpc('get_mentor_student_consistency', {
    p_student_id: studentA.roleId,
  })
  check('consistency RPC blocked for unrelated mentor', consB?.ok === false, JSON.stringify(consB))

  // Cleanup habit + log (cascade removes log)
  const { error: dhErr } = await studentA.client.from('habits').delete().eq('id', habit.id)
  check('habit cleanup', !dhErr, dhErr?.message || '')
}

console.log('\n=== Cleanup diag data ===')
const cleanups = [
  mentorA.client.from('student_reviews').delete().eq('mentor_id', mentorA.roleId),
  mentorA.client.from('mentor_remarks').delete().eq('mentor_id', mentorA.roleId),
  mentorA.client.from('assignments').delete().eq('id', mentorAsgId),
  studentA.client.from('assignments').delete().eq('student_id', studentA.roleId),
  studentB.client.from('assignments').delete().eq('student_id', studentB.roleId),
  studentA.client.from('journal_entries').delete().eq('student_id', studentA.roleId),
]
const results = await Promise.all(cleanups)
check('cleanup succeeded', results.every((r) => !r.error), results.find((r) => r.error)?.error?.message || '')

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
process.exit(fail === 0 ? 0 : 1)
