// Temporary browser E2E — Mentor → My Students → Student Details flow.
// Verifies the "'habits' is not an embedded resource" fix end-to-end.
// Run: node supabase/diag_student_details_browser.mjs  (dev server on :5173)
import { chromium } from 'playwright-core'
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

const sfx = Date.now()
const password = 'Ui-Test-123!'

async function mkUser(n, role) {
  const api = createClient(url, anon)
  const email = `sdetails${n}_${sfx}@example.com`
  const su = await api.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: role === 'mentor' ? `Mentor ${sfx}` : `Student ${sfx}`,
        role,
        usn: role === 'student' ? `SDB-${sfx}` : undefined,
      },
    },
  })
  if (su.error || !su.data.session) {
    console.log('signup failed:', role, su.error?.message)
    process.exit(1)
  }
  const authed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${su.data.session.access_token}` } },
  })
  const table = role === 'mentor' ? 'mentors' : 'students'
  const sel = role === 'mentor' ? 'id, connection_code' : 'id'
  const { data: row } = await authed.from(table).select(sel).single()
  return { email, client: authed, id: row?.id, code: row?.connection_code }
}

console.log('setup: creating mentor + student...')
const mentor = await mkUser(1, 'mentor')
const student = await mkUser(2, 'student')

// Connect them
const conn = await student.client.rpc('request_mentor_connection', { p_code: mentor.code })
console.log('connected:', JSON.stringify(conn.data))

// Seed real student activity so the page has data to show
const { data: habit } = await student.client
  .from('habits')
  .insert({ student_id: student.id, name: 'Read 30 minutes', frequency: 'daily', target_count: 7 })
  .select()
  .single()
const now = new Date()
now.setHours(12, 0, 0, 0)
const todayKey = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
await student.client
  .from('habit_logs')
  .insert({ habit_id: habit.id, log_date: todayKey, count: 1, completed: true })
const due = new Date(now.getTime() + 5 * 86400000)
await student.client.from('assignments').insert({
  student_id: student.id,
  title: 'DBMS Assignment',
  subject: 'DBMS',
  due_date: due.toISOString(),
  status: 'pending',
  priority: 'medium',
})
console.log('seeded habit + today log + assignment due in 5 days')

// --- Browser: log in as mentor, open student details ---
const consoleErrors = []
const pageErrors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)))

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
// Mentor login form: Mentor Name*, Mentee USN, Email*, Password*
const textInputs = page.locator('input[type="text"]')
await textInputs.nth(0).fill('Mentor Diag')
await textInputs.nth(1).fill('SDB-' + sfx).catch(() => {}) // Mentee USN (optional)
await page.locator('input[type="email"]').first().fill(mentor.email)
await page.locator('input[type="password"]').first().fill(password)
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(3000)
console.log('mentor login URL:', page.url())

await page.goto('http://localhost:5173/mentor/students', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const listText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('student listed:', listText.includes('Student ' + sfx))

// Open the student detail page via the row's "View Student" link
await page.locator('a', { hasText: 'View Student' }).first().click()
await page.waitForTimeout(3500)
const detailUrl = page.url()
console.log('detail URL:', detailUrl)

const mainText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('\n=== Student Details checks ===')
console.log('page loaded (no error card) :', !mainText.includes('Could not load student'))
console.log('student name shown          :', mainText.includes('Student ' + sfx))
console.log('Consistency section         :', mainText.includes('Consistency'))
console.log('Current Streak stat         :', mainText.includes('Current Streak'))
console.log('Study Days stat             :', mainText.includes('Study Days'))
console.log('Habit Consistency stat      :', mainText.includes('Habit Consistency'))
console.log('calendar shows tracking note:', mainText.includes('Tracking since'))
console.log('Study Progress section      :', mainText.toLowerCase().includes('study progress'))
console.log('assignment listed           :', mainText.includes('DBMS Assignment'))
console.log('countdown label shown       :', mainText.includes('days left'))
console.log('Upcoming deadlines          :', mainText.includes('Upcoming deadlines'))
console.log('Remarks section             :', mainText.toLowerCase().includes('recent remarks'))

console.log('\n=== Console/page errors ===')
const relevant = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('sourcemap'))
console.log('console errors:', relevant.length === 0 ? 'none' : relevant.slice(0, 5))
console.log('page errors   :', pageErrors.length === 0 ? 'none' : pageErrors.slice(0, 5))
const embeddedErr = relevant.concat(pageErrors.map(String)).find((e) => e.includes('embedded resource'))
console.log('embedded-resource error present:', embeddedErr ? 'YES — FAIL' : 'no ✓')

// Cleanup browser but leave the accounts for inspection
await browser.close()
console.log('\ndone. test accounts left for inspection:', mentor.email, student.email)
process.exit(embeddedErr ? 1 : 0)
