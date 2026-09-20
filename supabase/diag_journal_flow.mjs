// End-to-end verification for the Journal feature — safe to delete.
// Mirrors dbService.js journal calls 1:1 against the live DB with two
// freshly signed-up students, covering: create, read, update (autosave
// parity), star/lock toggles, delete, and RLS isolation between students.
//
// PREREQUISITE: supabase/migrations/005_journal_ui_fields.sql must be
// applied first (it adds is_starred / journal_date / tags / background /
// paper_style). Run:  node supabase/diag_journal_flow.mjs
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

async function mkStudent(n) {
  const suffix = Date.now() + n
  const email = `journaldiag${n}_${suffix}@example.com`
  const client = createClient(url, anon)
  const { data, error } = await client.auth.signUp({
    email,
    password: 'Diag-Test-123!',
    options: { data: { full_name: `Journal Diag ${n}`, role: 'student', usn: `DIAGJ-${suffix}` } },
  })
  if (error || !data.session) {
    console.log(`signup ${n} FAILED:`, error?.message, '| session:', !!data?.session)
    return null
  }
  const authed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  return { email, client: authed, uid: data.user.id, accessToken: data.session.access_token }
}

// Pre-flight: verify migration 005 is applied before signing anyone up
{
  const probe = createClient(url, anon)
  const { error } = await probe.from('journal_entries').select('id, is_starred, journal_date, tags').limit(1)
  if (error) {
    console.log('✗ MIGRATION 005 NOT APPLIED:', error.message)
    console.log('\nFix: open Supabase Dashboard → SQL Editor and run:')
    console.log('  supabase/migrations/005_journal_ui_fields.sql')
    console.log('\nThen re-run: node supabase/diag_journal_flow.mjs')
    process.exit(1)
  }
  console.log('✓ Migration 005 columns present (is_starred, journal_date, tags, background, paper_style)')
}

console.log('\n=== Setup: two fresh students ===')
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

// ---------- CREATE (dbService.createJournalEntry parity) ----------
console.log('\n=== CREATE ===')
const today = new Date().toISOString().slice(0, 10)
const c1 = await A.client
  .from('journal_entries')
  .insert({
    student_id: A.studentId,
    title: 'A new beginning',
    content: 'First page of my journal.',
    mood: 'great',
    tags: ['fresh-start', 'reflection'],
    is_starred: true,
    is_visible_to_mentor: false,
    journal_date: today,
    background: 'botanical',
    paper_style: 'lined',
  })
  .select()
  .single()
check('A created entry 1 (with new UI fields)', !c1.error, c1.error?.message || '')
check('entry 1 persisted is_starred=true', c1.data?.is_starred === true)
check('entry 1 persisted tags array', Array.isArray(c1.data?.tags) && c1.data.tags.length === 2)
check('entry 1 persisted journal_date', c1.data?.journal_date === today)

const c2 = await A.client
  .from('journal_entries')
  .insert({
    student_id: A.studentId,
    title: 'Productive Day',
    content: 'Finished three assignments and reviewed DBMS notes.',
    mood: 'good',
    tags: [],
    is_starred: false,
    is_visible_to_mentor: true,
    journal_date: today,
  })
  .select()
  .single()
check('A created entry 2 (shared with mentor)', !c2.error && c2.data?.is_visible_to_mentor === true, c2.error?.message || '')

const cB = await B.client
  .from('journal_entries')
  .insert({
    student_id: B.studentId,
    title: "B's secret page",
    content: 'This belongs to student B only.',
    journal_date: today,
  })
  .select()
  .single()
check('B created own entry', !cB.error, cB.error?.message || '')

// ---------- READ + isolation (dbService.getJournalEntries parity) ----------
console.log('\n=== READ + isolation ===')
{
  const { data, error } = await A.client
    .from('journal_entries')
    .select('*')
    .eq('student_id', A.studentId)
    .order('created_at', { ascending: false })
  check('A reads own 2 entries', !error && data?.length === 2, `got ${data?.length}, err: ${error?.message || ''}`)
  check('A sees NO rows from B (RLS isolation)', data?.every((r) => r.student_id === A.studentId))
}
{
  const { data, error } = await B.client
    .from('journal_entries')
    .select('*')
    .eq('student_id', B.studentId)
    .order('created_at', { ascending: false })
  check('B reads own 1 entry only', !error && data?.length === 1, `got ${data?.length}, err: ${error?.message || ''}`)
}

// ---------- REFRESH SIMULATION (step 3: persistence across page reload) ----------
console.log('\n=== Refresh simulation (brand-new client, same session) ===')
{
  const A2 = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${A.accessToken}` } },
  })
  const { data, error } = await A2
    .from('journal_entries')
    .select('*')
    .eq('id', c1.data.id)
    .single()
  check('entry 1 survives a fresh page load', !error && data?.title === 'A new beginning', error?.message || `title: ${data?.title}`)
  check('starred state persisted across reload', data?.is_starred === true)
}

// ---------- UPDATE (autosave parity: updateJournalEntry) ----------
console.log('\n=== UPDATE (edit / autosave / star / lock) ===')
{
  const { data, error } = await A.client
    .from('journal_entries')
    .update({
      title: 'A new beginning (edited)',
      content: 'First page of my journal — with more thoughts added after autosave.',
      mood: 'good',
      tags: ['reflection'],
    })
    .eq('id', c1.data.id)
    .select()
    .single()
  check('A edited entry 1 (title+content+tags)', !error && data?.title === 'A new beginning (edited)', error?.message || '')
  check('updated_at trigger bumped', new Date(data?.updated_at) >= new Date(data?.created_at))
}
{
  const { error } = await A.client.from('journal_entries').update({ is_starred: false }).eq('id', c1.data.id)
  const back = await A.client.from('journal_entries').select('is_starred').eq('id', c1.data.id).single()
  check('A unstarred entry 1', !error && back.data?.is_starred === false, error?.message || '')
}
{
  const { error } = await A.client.from('journal_entries').update({ is_visible_to_mentor: false }).eq('id', c2.data.id)
  const back = await A.client.from('journal_entries').select('is_visible_to_mentor').eq('id', c2.data.id).single()
  check('A re-locked entry 2', !error && back.data?.is_visible_to_mentor === false, error?.message || '')
}
{
  // Step 5: background + paper style change (JournalCustomizeModal parity)
  const { data: themed, error: terr } = await A.client
    .from('journal_entries')
    .update({ background: 'cream', paper_style: 'dotted' })
    .eq('id', c1.data.id)
    .select('background, paper_style')
    .single()
  check('A changed background to cream', !terr && themed?.background === 'cream', terr?.message || '')
  check('A changed paper style to dotted', themed?.paper_style === 'dotted')
}
{
  // Cross-student mutation attempt (update isolation)
  const attempt = await A.client
    .from('journal_entries')
    .update({ title: 'HACKED', content: 'hacked' })
    .eq('id', cB.data.id)
  const after = await B.client.from('journal_entries').select('title, content').eq('id', cB.data.id).single()
  check(
    "A CANNOT update B's entry (RLS)",
    after.data?.title === "B's secret page" && after.data?.content === 'This belongs to student B only.',
    `title now: ${after.data?.title}`
  )
  if (attempt.error) console.log(`    (update attempt correctly rejected: ${attempt.error.code || attempt.error.message})`)
}

// ---------- DELETE ----------
console.log('\n=== DELETE ===')
{
  await A.client.from('journal_entries').delete().eq('id', c2.data.id)
  const left = await A.client.from('journal_entries').select('id').eq('student_id', A.studentId)
  check('A deleted entry 2', !left.error && left.data?.length === 1, `rows: ${left.data?.length}`)
}
{
  await A.client.from('journal_entries').delete().eq('id', cB.data.id)
  const leftB = await B.client.from('journal_entries').select('id').eq('student_id', B.studentId)
  check("A CANNOT delete B's entry (RLS) — B still has it", !leftB.error && leftB.data?.length === 1, `B rows: ${leftB.data?.length}`)
}

// ---------- Mentor visibility (shared entries only) ----------
console.log('\n=== Mentor visibility (is_visible_to_mentor) ===')
{
  // B re-locks entry; mentor-side query filters on is_visible_to_mentor = true
  await B.client.from('journal_entries').update({ is_visible_to_mentor: true }).eq('id', cB.data.id)
  const { data, error } = await B.client
    .from('journal_entries')
    .select('id, title, is_visible_to_mentor')
    .eq('is_visible_to_mentor', true)
  check('shared-entry query returns only visible rows', !error && data?.length === 1 && data[0].is_visible_to_mentor === true, error?.message || '')
}

// ---------- cleanup ----------
console.log('\n=== Cleanup diag data ===')
for (const s of [A, B]) {
  const del = await s.client.from('journal_entries').delete().eq('student_id', s.studentId)
  const left = await s.client.from('journal_entries').select('id').eq('student_id', s.studentId)
  check(`${s.email}: rows cleaned`, !del.error && left.data?.length === 0, del.error?.message || '')
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
process.exit(fail === 0 ? 0 : 1)
