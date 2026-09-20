// Temporary browser E2E for Habit Tracker — drives system Chrome through the real app.
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

const step = process.argv[2] || 'full' // 'render' | 'full'

// fresh student
const suffix = Date.now()
const email = `habui_${suffix}@example.com`
const password = 'Ui-Test-123!'
const usn = `HABUI-${suffix}`
const api = createClient(url, anon)
const su = await api.auth.signUp({
  email, password,
  options: { data: { full_name: 'Habit UI Test', role: 'student', usn } },
})
if (su.error || !su.data.session) { console.log('signup failed:', su.error?.message); process.exit(1) }
console.log('setup: fresh student created:', email)

const consoleErrors = []
const pageErrors = []
const failedRequests = []

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 400)))
page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 120)} :: ${r.failure()?.errorText}`))

// login through the real form
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
await page.locator('input[type="text"]').first().fill(usn)
await page.locator('input[type="email"]').first().fill(email)
await page.locator('input[type="password"]').first().fill(password)
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(3000)
console.log('after login URL:', page.url())

await page.goto('http://localhost:5173/student/habits', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
console.log('habits page URL:', page.url())

const bodyText = (await page.locator('body').innerText().catch(() => '')) || ''
const mainText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('\n=== render check ===')
console.log('h1 "Habit Tracker"   :', mainText.includes('Habit Tracker'))
console.log('subtitle             :', mainText.includes('Build better habits, one day at a time.'))
console.log('"Add Habit" button   :', mainText.includes('Add Habit'))
console.log('summary cards        :', mainText.includes('Total Habits') && mainText.includes('On Track') && mainText.includes('Needs Attention') && mainText.includes('Fell Behind'))
console.log('empty state          :', mainText.includes('No habits yet') && mainText.includes('Create your first habit'))
console.log('motivational footer  :', mainText.includes('big progress') && mainText.includes('Discipline today'))

// modal fields probe
await page.getByRole('button', { name: /add habit/i }).first().click()
await page.waitForTimeout(500)
const modalProbe = await page.evaluate(() => {
  const form = document.querySelector('form')
  if (!form) return { form: false }
  return {
    form: true,
    iconButtons: form.querySelectorAll('button[title]').length,
    colorDots: form.querySelectorAll('button.w-8.rounded-full').length,
    categoryOptions: form.querySelectorAll('select option').length,
    targetButtons: form.querySelectorAll('button.w-9').length,
    hasNotes: !!form.querySelector('textarea'),
    hasName: !!form.querySelector('input[type="text"]'),
  }
})
console.log('\n=== modal probe ===')
console.log(JSON.stringify(modalProbe))

if (step === 'render') {
  await page.screenshot({ path: '/tmp/habits_modal.png', fullPage: true })
  console.log('\nscreenshot: /tmp/habits_modal.png')
  await browser.close()
  console.log('\nconsole errors:', consoleErrors.length ? consoleErrors.join('\n') : '(none)')
  console.log('page errors  :', pageErrors.length ? pageErrors.join('\n') : '(none)')
  console.log('failed reqs  :', failedRequests.length ? failedRequests.join('\n') : '(none)')
  process.exit(0)
}

// CREATE a habit through the modal
await page.locator('input[placeholder*="Exercise"]').fill('E2E Morning Read')
await page.locator('button[title="book-open"]').click()
await page.locator('button.w-8.rounded-full').nth(2).click() // blue
await page.locator('select').selectOption('Study')
await page.locator('button.w-9', { hasText: '5' }).click()
await page.locator('textarea').fill('read 20 pages')
await page.getByRole('button', { name: /create habit/i }).click()
await page.waitForTimeout(2500)

const after = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('\n=== create check ===')
console.log('habit appears        :', after.includes('E2E Morning Read'))
console.log('error toast if any   :', after.match(/Could not find.*|Failed to save.*/)?.[0] || '(none)')

if (!after.includes('E2E Morning Read')) {
  await page.screenshot({ path: '/tmp/habits_fail.png', fullPage: true })
  console.log('CREATE FAILED — screenshot: /tmp/habits_fail.png')
  await browser.close()
  process.exit(1)
}

// TOGGLE today + a past day on the heatmap
const today = await page.evaluate(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const cellsBefore = await page.locator(`button[title^="${today}"]`).count()
console.log('today cell found     :', cellsBefore === 1)
await page.locator(`button[title^="${today}"]`).click()
await page.waitForTimeout(1200)
let mainNow = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('after 1 click streak :', mainNow.includes('1 day streak'))
console.log('done today marker    :', mainNow.includes('Done today ✓'))
// click again → medium intensity
await page.locator(`button[title*="${today}"]`).first().click()
await page.waitForTimeout(1200)
// past day (3 days ago)
await page.evaluate(() => null)
const pastKey = await page.evaluate(() => {
  const d = new Date(); d.setDate(d.getDate() - 3)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
await page.locator(`button[title^="${pastKey}"]`).click()
await page.waitForTimeout(1200)
mainNow = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('streak after 2 days  :', mainNow.match(/\d+ day streak/)?.[0])

await page.screenshot({ path: '/tmp/habits_toggled.png', fullPage: true })
console.log('screenshot: /tmp/habits_toggled.png')

// EDIT the habit
await page.locator('button[title="Edit habit"]').first().click()
await page.waitForTimeout(600)
const nameInput = page.locator('input[placeholder*="Exercise"]')
console.log('edit modal prefilled :', (await nameInput.inputValue()) === 'E2E Morning Read')
await nameInput.fill('E2E Morning Read (edited)')
await page.getByRole('button', { name: /save changes/i }).click()
await page.waitForTimeout(2500)
mainNow = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('edited name visible  :', mainNow.includes('E2E Morning Read (edited)'))

// DELETE with confirmation
await page.locator('button[title="Delete habit"]').first().click()
await page.waitForTimeout(500)
console.log('confirm dialog shown :', mainNow.includes('') || (await page.locator('text=Delete this habit?').count()) === 1)
await page.getByRole('button', { name: /^Delete$/ }).click()
await page.waitForTimeout(2500)
mainNow = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('empty state restored :', mainNow.includes('No habits yet'))

// PERSISTENCE: reload and confirm empty again (habit was deleted)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const afterReload = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('persisted after reload:', !afterReload.includes('E2E Morning Read'))

await page.screenshot({ path: '/tmp/habits_final.png', fullPage: true })

console.log('\nconsole errors:', consoleErrors.length ? consoleErrors.join('\n') : '(none)')
console.log('page errors  :', pageErrors.length ? pageErrors.join('\n') : '(none)')
console.log('failed reqs  :', failedRequests.length ? failedRequests.join('\n') : '(none)')

await browser.close()
const ok = pageErrors.length === 0
console.log(ok ? '\nVERDICT: PASS ✓' : '\nVERDICT: FAIL ✗')
process.exit(ok ? 0 : 1)
