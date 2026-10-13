// Notes RLS E2E — run with: node supabase/diag_notes_rls.mjs
// Verifies (live DB, migration 009 applied):
//   1. INSERT with explicit user_id succeeds for an authenticated user
//      (fix for "new row violates row-level security policy for table 'notes'").
//   2. The note reads back after reload (SELECT policy works).
//   3. UPDATE works (own note).
//   4. UPDATE on someone else's note returns 0 rows (isolation holds).
//   5. DELETE of another user's note deletes 0 rows (isolation holds).
//   6. INSERT with someone else's user_id is rejected by RLS.
// Requires: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env (anon key only).
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
if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

let failures = 0
function check(name, ok, extra = '') {
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}${extra ? ` — ${extra}` : ''}`)
  if (!ok) failures++
}

async function mkUser(n, role) {
  const api = createClient(url, anon)
  const email = `note${n}_${Date.now()}@example.com`
  const su = await api.auth.signUp({
    email,
    password: 'Ui-Test-123!',
    options: { data: { full_name: `${role} ${n}`, role } },
  })
  if (su.error || !su.data.session) {
    console.error('signup failed:', su.error?.message)
    process.exit(1)
  }
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${su.data.session.access_token}` } },
  })
}

console.log('setup: creating user A (student) and user B (mentor)...')
const A = await mkUser(1, 'student')
const B = await mkUser(2, 'mentor')
const { data: { user: userA } } = await A.auth.getUser()
const { data: { user: userB } } = await B.auth.getUser()

// 1. INSERT with explicit user_id (the fix) — must succeed.
const ins = await A
  .from('notes')
  .insert({ user_id: userA.id, title: 'RLS probe', content: 'note body', note_type: 'normal' })
  .select()
  .single()
check('INSERT with explicit user_id succeeds', !ins.error, ins.error?.message)
const noteId = ins.data?.id

// 2. Read back (simulates page refresh).
const back = await A.from('notes').select('*').eq('id', noteId).single()
check('note reads back after insert (refresh)', !back.error && back.data?.title === 'RLS probe', back.error?.message)

// 3. UPDATE own note — must succeed and bump updated_at.
const upd = await A
  .from('notes')
  .update({ title: 'RLS probe v2' })
  .eq('id', noteId)
  .select()
  .single()
check('UPDATE own note succeeds', !upd.error && upd.data?.title === 'RLS probe v2', upd.error?.message)

// 4. Cross-user UPDATE — must return 0 rows (RLS hides B from A).
const xupd = await B.from('notes').update({ title: 'hijack' }).eq('id', noteId).select()
check('UPDATE another user\'s note returns 0 rows (isolation)', !xupd.error && xupd.data?.length === 0, xupd.error?.message)

// 5. Cross-user DELETE — must delete 0 rows.
const xdel = await B.from('notes').delete().eq('id', noteId).select()
check('DELETE another user\'s note deletes 0 rows (isolation)', !xdel.error && xdel.data?.length === 0, xdel.error?.message)
const stillThere = await A.from('notes').select('id').eq('id', noteId).single()
check('note still exists after cross-user delete attempt', !stillThere.error)

// 6. INSERT with someone else's user_id — must be rejected by RLS WITH CHECK.
const spoof = await B
  .from('notes')
  .insert({ user_id: userA.id, title: 'spoof', content: 'x', note_type: 'normal' })
  .select()
  .single()
check('INSERT with another user\'s user_id is rejected', !!spoof.error, spoof.error?.message || 'expected error, got none')

// 7. SELECT isolation: B cannot see A's notes.
const bList = await B.from('notes').select('id')
check('SELECT isolation: user B sees none of user A\'s notes', !bList.error && (bList.data || []).every((r) => r.id !== noteId), bList.error?.message)

console.log(failures === 0 ? '\nALL CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`)
process.exit(failures === 0 ? 0 : 1)
