// Probe each candidate habits column individually (fresh user per run not needed — reuse signup)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('#')).map(l=>{
    const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')]
  })
)
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const suffix = Date.now()
const su = await db.auth.signUp({
  email: `habcols_${suffix}@example.com`, password: 'Diag-Test-123!',
  options: { data: { full_name: 'Col Probe', role: 'student', usn: `HABC-${suffix}` } },
})
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${su.data.session.access_token}` } },
})
const st = await c.from('students').select('id').eq('profile_id', su.data.user.id).single()

for (const col of ['icon', 'color', 'category', 'target_days_per_week', 'notes']) {
  const r = await c.from('habits').insert({ student_id: st.data.id, name: 'p', [col]: 'x' }).select().single()
  if (r.error) console.log(col.padEnd(22), 'MISSING   ', r.error.message.slice(0, 80))
  else {
    console.log(col.padEnd(22), 'EXISTS    ')
    await c.from('habits').delete().eq('id', r.data.id)
  }
}
// baseline sanity: known-existing columns
for (const col of ['description', 'frequency', 'target_count']) {
  const val = col === 'frequency' ? 'daily' : col === 'target_count' ? 1 : 'x'
  const r = await c.from('habits').insert({ student_id: st.data.id, name: 'p', [col]: val }).select().single()
  console.log(col.padEnd(22), r.error ? 'MISSING?! ' + r.error.message.slice(0, 60) : 'EXISTS    ')
  if (!r.error) await c.from('habits').delete().eq('id', r.data.id)
}
console.log('probe user:', `habcols_${suffix}@example.com`)
