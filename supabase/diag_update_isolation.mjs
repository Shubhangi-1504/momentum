// Focused check: can student A actually mutate student B's assignment row?
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

async function mkStudent(n) {
  const suffix = Date.now() + n
  const client = createClient(url, anon)
  const { data, error } = await client.auth.signUp({
    email: `updISO${n}_${suffix}@example.com`,
    password: 'Diag-Test-123!',
    options: { data: { full_name: `Upd ISO ${n}`, role: 'student', usn: `UPDISO-${suffix}` } },
  })
  if (error || !data.session) return null
  const authed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  const st = await authed.from('students').select('id').eq('profile_id', data.user.id).single()
  return { client: authed, studentId: st.data.id }
}

const A = await mkStudent(1)
const B = await mkStudent(2)
if (!A || !B) { console.log('setup failed'); process.exit(1) }

// B creates an assignment clearly marked in_progress
const row = {
  title: 'ISO probe', subject: 'X', due_date: new Date(Date.now() + 86400000).toISOString(),
  priority: 'high', status: 'in_progress', student_id: B.studentId,
}
const created = await B.client.from('assignments').insert(row).select().single()
console.log('B created row:', !created.error, '| status =', created.data?.status)

// A attempts to update B's row
const attempt = await A.client
  .from('assignments')
  .update({ status: 'completed', title: 'HACKED' })
  .eq('id', created.data.id)
console.log('A update attempt → error:', JSON.stringify(attempt.error), '| data:', JSON.stringify(attempt.data))

// B reads the row back — the ground truth
const after = await B.client.from('assignments').select('title, status').eq('id', created.data.id).single()
console.log('B reads back  → title =', after.data?.title, '| status =', after.data?.status)

const isolated = after.data?.title === 'ISO probe' && after.data?.status === 'in_progress'
console.log(isolated ? '\n✓ UPDATE isolation CONFIRMED — A cannot mutate B\'s row' : '\n✗ RLS LEAK: A mutated B\'s row!')

// cleanup
await B.client.from('assignments').delete().eq('id', created.data.id)
console.log('cleanup done')
process.exit(isolated ? 0 : 1)



