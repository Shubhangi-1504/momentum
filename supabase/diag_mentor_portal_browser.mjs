// Temporary browser E2E — redesigned Mentor Portal verification.
// Covers: Dashboard (new sections), My Students, Student Details,
// Study Tasks, Mentor Remarks, Shared Journals.
// Run: node supabase/diag_mentor_portal_browser.mjs  (dev server on :5173)
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^[\"']|[\"']$/g, '')]
    })
)
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY

const sfx = Date.now()
const password = 'Ui-Test-123!'

async function mkUser(n, role) {
  const api = createClient(url, anon)
  const email = `mportal${n}_${sfx}@example.com`
  const su = await api.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: role === 'mentor' ? `Mentor ${sfx}` : `Student ${sfx}`,
        role,
        usn: role === 'student' ? `MPT-${sfx}` : undefined,
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
await student.client.rpc('request_mentor_connection', { p_code: mentor.code })

// Seed real student activity (no fake data shown to the mentor beyond this)
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
const due = new Date(now.getTime() + 3 * 86400000)
await student.client.from('assignments').insert({
  student_id: student.id,
  title: 'DBMS Assignment',
  subject: 'DBMS',
  due_date: due.toISOString(),
  status: 'pending',
  priority: 'medium',
})
await student.client.from('journal_entries').insert({
  student_id: student.id,
  title: 'Study reflection',
  content: 'Focused on consistency today.',
  is_visible_to_mentor: true,
})
console.log('seeded habit + today log + assignment due in 3 days + shared journal')

// --- Browser: log in as mentor ---
const consoleErrors = []
const pageErrors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)))

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
const textInputs = page.locator('input[type=\"text\"]')
await textInputs.nth(0).fill('Mentor Diag')
await textInputs.nth(1).fill('MPT-' + sfx).catch(() => {})
await page.locator('input[type=\"email\"]').first().fill(mentor.email)
await page.locator('input[type=\"password\"]').first().fill(password)
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(3000)
console.log('mentor login URL:', page.url())

// ============ DASHBOARD ============
await page.goto('http://localhost:5173/mentor', { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)
const dash = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('\n=== Dashboard checks ===')
console.log('welcome header          :', dash.includes('Welcome, Mentor'))
console.log('subtitle                :', dash.includes("Here's how your students"))
console.log('My Students card        :', dash.includes('My Students'))
console.log('Needing Review card     :', dash.includes('Students Needing Review'))
console.log('Pending Tasks card      :', dash.includes('Pending Tasks'))
console.log('Remarks Given card      :', dash.includes('Remarks Given'))
console.log('Attention section       :', dash.includes('Students Needing Attention'))
console.log('Progress section        :', dash.includes('Student Progress'))
console.log('Quick Actions section   :', dash.includes('Quick Actions'))
console.log('Deadlines section       :', dash.includes('Upcoming Deadlines'))
console.log('Activity section        :', dash.includes('Recent Activity'))
console.log('student appears         :', dash.includes('Student ' + sfx))
console.log('deadline w/ countdown   :', dash.includes('DBMS Assignment') && dash.includes('3 days left'))
console.log('sidebar brand           :', await page.locator('aside').innerText().then(t => t.includes('Momentum') && t.toUpperCase().includes('MENTOR PORTAL')))

// ============ MY STUDENTS ============
await page.goto('http://localhost:5173/mentor/students', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const students = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('\n=== My Students checks ===')
console.log('page loads              :', !students.includes('Something went wrong'))
console.log('mentor code card        :', students.includes('Your mentor code'))
console.log('student listed          :', students.includes('Student ' + sfx))
console.log('View Student button     :', students.includes('View Student'))

// ============ STUDENT DETAILS ============
await page.locator('a', { hasText: 'View Student' }).first().click()
await page.waitForTimeout(3500)
console.log('\n=== Student Details checks ===')
console.log('detail URL              :', page.url())
const detail = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('no error card           :', !detail.includes('Could not load student'))
console.log('name shown              :', detail.includes('Student ' + sfx))
console.log('Consistency section     :', detail.includes('Consistency'))
console.log('Study Progress section  :', detail.toLowerCase().includes('study progress'))

// ============ STUDY TASKS ============
await page.goto('http://localhost:5173/mentor/tasks', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const tasks = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('\n=== Study Tasks checks ===')
console.log('page loads              :', !tasks.includes('Could not load study tasks'))
console.log('assignment listed       :', tasks.includes('DBMS Assignment'))
console.log('Assign Task button      :', tasks.includes('Assign Task'))

// ============ MENTOR REMARKS ============
await page.goto('http://localhost:5173/mentor/remarks', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const remarks = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('\n=== Mentor Remarks checks ===')
console.log('page loads              :', !remarks.includes('Could not load remarks'))
console.log('add remark available    :', remarks.includes('Add Remark') || remarks.includes('New Remark'))

// ============ SHARED JOURNALS ============
await page.goto('http://localhost:5173/mentor/journals', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const journals = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('\n=== Shared Journals checks ===')
console.log('page loads              :', !journals.includes('Could not load shared journals'))
console.log('shared entry listed     :', journals.includes('Study reflection'))

// ============ ERRORS ============
console.log('\n=== Console/page errors ===')
const relevant = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('sourcemap'))
console.log('console errors:', relevant.length === 0 ? 'none' : relevant.slice(0, 5))
console.log('page errors   :', pageErrors.length === 0 ? 'none' : pageErrors.slice(0, 5))

await browser.close()
console.log('\ndone. test accounts left for inspection:', mentor.email, student.email)
const failed =
  relevant.length > 0 ||
  pageErrors.length > 0 ||
  dash.includes('Could not load') ||
  detail.includes('Could not load student')
process.exit(failed ? 1 : 0)
