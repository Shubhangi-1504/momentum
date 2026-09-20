// Probe live habits/habit_logs schema + RLS isolation using a fresh student
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('#')).map(l=>{
    const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')]
  })
)
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const suffix = Date.now()
const email = `habschema_${suffix}@example.com`

const su = await db.auth.signUp({
  email, password: 'Diag-Test-123!',
  options: { data: { full_name: 'Habit Schema Probe', role: 'student', usn: `HAB-${suffix}` } },
})
if (su.error || !su.data.session) { console.log('signup failed:', su.error?.message); process.exit(1) }
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${su.data.session.access_token}` } },
})
const st = await c.from('students').select('id').eq('profile_id', su.data.user.id).single()
console.log('student id:', st.data?.id)

// --- Probe habits columns by attempting inserts with each candidate field ---
const base = { student_id: st.data.id, name: 'Probe' }
const candidates = ['icon','color','category','target_days_per_week','notes','description','frequency','target_count']

const fullRow = {
  ...base,
  icon: 'dumbbell', color: 'green', category: 'Fitness',
  target_days_per_week: 5, notes: 'probe note',
  description: 'probe desc', frequency: 'daily', target_count: 1,
}
const ins = await c.from('habits').insert(fullRow).select().single()
console.log('\nfull insert:', ins.error ? `ERROR ${ins.error.code}: ${ins.error.message}` : 'OK')
if (ins.data) {
  console.log('returned columns:', Object.keys(ins.data).join(', '))
  console.log('row:', JSON.stringify(ins.data, null, 2))
}

// --- habit_logs columns ---
if (ins.data?.id) {
  const log = await c.from('habit_logs').insert({
    habit_id: ins.data.id, log_date: '2026-09-19', count: 1, completed: true, notes: 'probe',
  }).select().single()
  console.log('\nhabit_logs full insert:', log.error ? `ERROR ${log.error.code}: ${log.error.message}` : 'OK')
  if (log.data) console.log('log columns:', Object.keys(log.data).join(', '), '\nlog row:', JSON.stringify(log.data))

  // upsert parity with dbService.createOrUpdateHabitLog
  const up = await c.from('habit_logs').upsert({
    habit_id: ins.data.id, log_date: '2026-09-19', count: 2, completed: true,
  }, { onConflict: 'habit_id,log_date' }).select().single()
  console.log('upsert same day:', up.error ? `ERROR: ${up.error.message}` : `OK count=${up.data?.count}`)

  const del = await c.from('habit_logs').delete().eq('habit_id', ins.data.id)
  console.log('delete logs:', del.error ? `ERROR: ${del.error.message}` : 'OK')
}

// --- cleanup habit ---
if (ins.data?.id) {
  const d = await c.from('habits').delete().eq('id', ins.data.id)
  console.log('delete habit:', d.error ? `ERROR: ${d.error.message}` : 'OK')
}

console.log('\nprobe user left behind:', email)
