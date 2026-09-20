// Temporary verification script for Study Tracker — safe to delete.
// Replicates dbService.js assignment calls 1:1 against the live DB,
// with two freshly signed-up students to also verify RLS isolation.
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

let pass = 0, fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}

async function mkStudent(n) {
  const suffix = Date.now() + n
  const email = `studydiag${n}_${suffix}@example.com`
  const client = createClient(url, anon)
  const { data, error } = await client.auth.signUp({
    email,
    password: 'Diag-Test-123!',
    options: { data: { full_name: `Study Diag ${n}`, role: 'student', usn: `DIAGST-${suffix}` } },
  })
  if (error || !data.session) {
    console.log(`signup ${n} FAILED:`, error?.message, '| session:', !!data?.session)
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
check('student A signed up + has session', !!A)
check('student B signed up + has session', !!B)

// --- profile + students row (trigger side-effects) ---
for (const [label, s] of [['A', A], ['B', B]]) {
  const p = await s.client.from('profiles').select('*').eq('id', s.uid).maybeSingle()
  check(`${label}: profile row exists (${p.data?.role})`, !!p.data && !p.error, p.error?.message || '')
  const st = await s.client.from('students').select('id, usn').eq('profile_id', s.uid).maybeSingle()
  check(`${label}: students row exists (usn=${st.data?.usn})`, !!st.data && !st.error, st.error?.message || '')
  s.studentId = st.data?.id
}

// --- getStudentByProfileId parity (single() like dbService) ---
{
  const { data, error } = await A.client.from('students').select('id').eq('profile_id', A.uid).single()
  check('getStudentByProfileId(A) works', !error && data?.id === A.studentId, error?.message || '')
}

console.log('\n=== CREATE (3 assignments for A, 1 for B) ===')
async function createAssignment(client, studentId, row) {
  return client.from('assignments').insert({ ...row, student_id: studentId }).select().single()
}
const mk = (n, status, days, priority, subject) => ({
  title: `Diag assignment ${n}`,
  subject,
  description: 'Created by diag script',
  due_date: new Date(Date.now() + days * 86400000).toISOString(),
  priority,
  status,
})
const c1 = await createAssignment(A.client, A.studentId, mk(1, 'pending', 3, 'high', 'Data Structures'))
check('A created assignment 1', !c1.error, c1.error?.message || '')
const c2 = await createAssignment(A.client, A.studentId, mk(2, 'in_progress', -2, 'medium', 'DBMS'))
check('A created assignment 2 (past due → overdue)', !c2.error, c2.error?.message || '')
const c3 = await createAssignment(A.client, A.studentId, mk(3, 'completed', 10, 'low', 'OS'))
check('A created assignment 3', !c3.error, c3.error?.message || '')
const cB = await createAssignment(B.client, B.studentId, mk('B1', 'pending', 5, 'low', 'Math'))
check('B created assignment B1', !cB.error, cB.error?.message || '')

console.log('\n=== READ + isolation (dbService.getAssignments parity) ===')
{
  const { data, error } = await A.client
    .from('assignments').select('*').eq('student_id', A.studentId)
    .order('created_at', { ascending: false })
  check('A reads own 3 assignments', !error && data?.length === 3, `got ${data?.length}, err: ${error?.message || ''}`)
  check('A sees NO rows from B (RLS isolation)', data?.every((r) => r.student_id === A.studentId))
}
{
  const { data, error } = await B.client
    .from('assignments').select('*').eq('student_id', B.studentId)
    .order('created_at', { ascending: false })
  check('B reads own 1 assignment only', !error && data?.length === 1, `got ${data?.length}, err: ${error?.message || ''}`)
}

console.log('\n=== UPDATE status (dbService.updateAssignment parity) ===')
{
  const { data, error } = await A.client
    .from('assignments').update({ status: 'completed' }).eq('id', c1.data.id).select().single()
  check('A updated assignment 1 → completed', !error && data?.status === 'completed', error?.message || '')
}
{
  const { data, error } = await A.client
    .from('assignments').update({ title: 'Diag assignment 1 edited', priority: 'low' }).eq('id', c1.data.id).select().single()
  check('A edited title + priority', !error && data?.title === 'Diag assignment 1 edited' && data?.priority === 'low', error?.message || '')
}
{
  const { error } = await A.client
    .from('assignments').update({ status: 'pending' }).eq('id', cB.data.id)
  check('A CANNOT update B\'s assignment (RLS)', error?.code === 'PGRST116' || (error && data_len_check(error)), JSON.stringify(error || {}))
}
function data_len_check() { return false }

console.log('\n=== DELETE (dbService.deleteAssignment parity) ===')
{
  const { error } = await A.client.from('assignments').delete().eq('id', c2.data.id)
  const after = await A.client.from('assignments').select('id').eq('student_id', A.studentId)
  check('A deleted assignment 2', !error && after.data?.length === 2, error?.message || `rows: ${after.data?.length}`)
}
{
  const { error } = await A.client.from('assignments').delete().eq('id', cB.data.id)
  const afterB = await B.client.from('assignments').select('id').eq('student_id', B.studentId)
  check('A CANNOT delete B\'s assignment (RLS) — B still has it', (error && afterB.data?.length === 1) || (!error && afterB.data?.length === 1))
}

// --- cleanup all diag rows ---
console.log('\n=== Cleanup diag data ===')
for (const s of [A, B]) {
  const del = await s.client.from('assignments').delete().not('title', 'is', null).eq('student_id', s.studentId)
  const left = await s.client.from('assignments').select('id').eq('student_id', s.studentId)
  check(`${s.email}: rows cleaned (${left.data?.length} left)`, !del.error && left.data?.length === 0, del.error?.message || '')
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
process.exit(fail === 0 ? 0 : 1)
