// Temporary diagnostic script — safe to delete after use.
// Reads .env, probes live Supabase DB for RLS recursion (42P17),
// dumps live schema for profiles/students/mentors, then reproduces signup.
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
console.log('Project URL:', url)

const supabase = createClient(url, anon)

// ---------- 1. Probe every table for RLS recursion / errors ----------
console.log('\n=== 1. Table probes (anon key) ===')
const tables = [
  'profiles', 'students', 'mentors', 'mentor_student_relationships',
  'assignments', 'habits', 'habit_logs', 'journal_entries',
  'mentor_remarks', 'assigned_tasks', 'progress',
]
for (const t of tables) {
  const { error } = await supabase.from(t).select('*').limit(1)
  console.log(
    t.padEnd(32),
    error ? `ERROR ${error.code ?? ''}: ${error.message}` : 'OK'
  )
}

// ---------- 2. Live schema from REST OpenAPI spec ----------
console.log('\n=== 2. Live schema (REST OpenAPI) for profiles/students/mentors ===')
try {
  const res = await fetch(`${url}/rest/v1/?apikey=${encodeURIComponent(anon)}`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  })
  const spec = await res.json()
  for (const t of ['profiles', 'students', 'mentors']) {
    const def = spec.definitions?.[t]
    console.log(`\n-- ${t} --`)
    if (!def) {
      console.log('  !! TABLE MISSING FROM API SPEC (does it exist? RLS fully locked?)')
      continue
    }
    for (const [col, prop] of Object.entries(def.properties)) {
      const desc = (prop.description || '').split('\n')[0]
      console.log(
        `  ${col.padEnd(20)} ${(prop.format || prop.type || '').padEnd(10)} ${desc}`
      )
    }
  }
} catch (e) {
  console.log('OpenAPI fetch failed:', e.message)
}

// ---------- 3. Reproduce signup (student) ----------
console.log('\n=== 3. Signup reproduction (student) ===')
const suffix = Date.now()
const email = `diag_${suffix}@example.com`
const password = 'Diag-Test-123!'
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: 'Diag Test', role: 'student', usn: `DIAG-${suffix}` },
  },
})
if (error) {
  console.log('SIGNUP FAILED:')
  console.log('  status :', error.status)
  console.log('  code   :', error.code)
  console.log('  message:', error.message)
  process.exit(0)
}
console.log('signup OK — user id:', data.user?.id)
console.log('  session returned:', data.session ? 'YES (email confirmation OFF)' : 'NO (email confirmation ON)')

// ---------- 4. Verify trigger side-effects ----------
if (data.session?.access_token) {
  const jwt = data.session.access_token
  const c2 = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
  const uid = data.user.id

  const prof = await c2.from('profiles').select('*').eq('id', uid).maybeSingle()
  console.log('\nprofiles row :', prof.error ? `ERROR ${prof.error.code}: ${prof.error.message}` : JSON.stringify(prof.data))

  const stu = await c2.from('students').select('*').eq('profile_id', uid).maybeSingle()
  console.log('students row :', stu.error ? `ERROR ${stu.error.code}: ${stu.error.message}` : JSON.stringify(stu.data))

  // ---------- 5. Post-login queries used by dashboards ----------
  console.log('\n=== 5. Post-login smoke queries (as the new user) ===')
  const checks = [
    ['assignments (own)', c2.from('assignments').select('*').limit(1)],
    ['habits (own)', c2.from('habits').select('*').limit(1)],
    ['habit_logs (own)', c2.from('habit_logs').select('*').limit(1)],
    ['journal_entries (own)', c2.from('journal_entries').select('*').limit(1)],
    ['progress (own)', c2.from('progress').select('*').limit(1)],
    ['assigned_tasks (own)', c2.from('assigned_tasks').select('*').limit(1)],
    ['mentor_remarks (own)', c2.from('mentor_remarks').select('*').limit(1)],
    ['mentor_student_relationships', c2.from('mentor_student_relationships').select('*').limit(1)],
    ['mentors (visible)', c2.from('mentors').select('*').limit(1)],
  ]
  for (const [name, q] of checks) {
    const { error } = await q
    console.log(name.padEnd(32), error ? `ERROR ${error.code}: ${error.message}` : 'OK')
  }
} else {
  console.log('\nNo session returned — email confirmation is ON. Trigger side-effects cannot be verified with anon key, but trigger DID run during signup.')
}

console.log('\nTest user left behind:', email, '(no service key available to delete it)')
