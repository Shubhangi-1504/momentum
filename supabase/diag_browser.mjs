// Temporary browser diagnostic — drives system Chrome through login → /student/study
// capturing console errors, page errors, failed requests, and the page's actual DOM.
import { chromium } from 'playwright-core'
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

// 1. Create a guaranteed-fresh student via the API (same as app signup)
const suffix = Date.now()
const email = `uitest_${suffix}@example.com`
const password = 'Ui-Test-123!'
const { createClient } = await import('@supabase/supabase-js')
const api = createClient(url, anon)
const su = await api.auth.signUp({
  email, password,
  options: { data: { full_name: 'UI Test Student', role: 'student', usn: `UI-${suffix}` } },
})
if (su.error || !su.data.session) {
  console.log('SETUP SIGNUP FAILED:', su.error?.message)
  process.exit(1)
}
console.log('setup: fresh student created:', email)

// 2. Drive the real browser
const consoleErrors = []
const pageErrors = []
const failedRequests = []
const supabaseCalls = []

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 400)))
page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 120)} :: ${r.failure()?.errorText}`))
page.on('response', (r) => {
  const u = r.url()
  if (u.includes('supabase')) supabaseCalls.push(`${r.status()} ${r.request().method()} ${u.replace(url, '')}`)
})

// Log in through the app's own login page (tests real app auth path)
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
console.log('opened /login, title =', await page.title())

// Discover the login form fields
const inputs = await page.locator('input').all()
const meta = []
for (const i of inputs) meta.push(await i.getAttribute('type'))
console.log('login page input types:', JSON.stringify(meta))

// Fill by type: USN (text), email, password — the login form requires all three
const usnInput = page.locator('input[type="text"]').first()
const emailInput = page.locator('input[type="email"]').first()
const pwInput = page.locator('input[type="password"]').first()
await usnInput.fill(`UI-${suffix}`)
await emailInput.fill(email)
await pwInput.fill(password)
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(3000)
console.log('after login URL:', page.url())

// Navigate to Study Tracker
if (!page.url().includes('/student')) {
  await page.goto('http://localhost:5173/student/study', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
}
await page.goto('http://localhost:5173/student/study', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
console.log('study page URL:', page.url())

// --- Diagnostics ---
console.log('\n=== console errors ===')
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)')
console.log('\n=== page errors (uncaught) ===')
console.log(pageErrors.length ? pageErrors.join('\n') : '(none)')
console.log('\n=== failed requests ===')
console.log(failedRequests.length ? failedRequests.join('\n') : '(none)')
console.log('\n=== supabase calls (status method path) ===')
console.log(supabaseCalls.length ? supabaseCalls.join('\n') : '(none)')

console.log('\n=== DOM check ===')
await page.waitForTimeout(4000) // give deferred data-loading effects ample time

// Deep probe of the content area
const probe = await page.evaluate(() => {
  const main = document.querySelector('main')
  if (!main) return { main: false }
  return {
    main: true,
    childCount: main.children.length,
    innerHTMLStart: main.innerHTML.slice(0, 500),
    hasSkeleton: !!main.querySelector('.animate-pulse'),
    hasH1: !!main.querySelector('h1'),
    h1Text: main.querySelector('h1')?.textContent || null,
    hasButton: Array.from(main.querySelectorAll('button')).map((b) => b.textContent.trim()).slice(0, 6),
  }
})
console.log('main area probe:', JSON.stringify(probe, null, 2))

const h1 = await page.locator('h1').first().textContent().catch(() => null)
console.log('h1:', JSON.stringify(h1))
const bodyText = (await page.locator('body').innerText().catch(() => '')) || ''
const has = (s) => bodyText.includes(s)
console.log('has "Study Tracker" heading :', has('Study Tracker'))
console.log('has "Add Assignment" button :', has('Add Assignment'))
console.log('has "No assignments yet"    :', has('No assignments yet'))
console.log('has "Loading"               :', has('Loading'))
console.log('body text length            :', bodyText.length)
console.log('\n--- first 400 chars of body ---')
console.log(bodyText.slice(0, 400))

await page.screenshot({ path: '/tmp/study_page.png', fullPage: true })
console.log('\nscreenshot saved: /tmp/study_page.png')

// --- Modal end-to-end test: click Add Assignment, fill, save, verify row ---
console.log('\n=== Add Assignment modal test ===')
await page.getByRole('button', { name: /add assignment/i }).first().click()
await page.waitForTimeout(500)
const modalVisible = await page.locator('text=Edit Assignment').count() === 0 && await page.locator('form').count() > 0
console.log('modal form appeared:', modalVisible)

await page.locator('input[placeholder*="DS Lab"]').fill('Browser E2E assignment')
await page.locator('input[placeholder*="Data Structures"]').fill('Software Eng')
await page.locator('textarea[placeholder*="Optional"]').fill('Created by automated browser test')
await page.locator('input[type="date"]').fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
await page.getByRole('button', { name: /^Add Assignment$/ }).last().click()
await page.waitForTimeout(2500)

const afterCreate = await page.evaluate(() => document.querySelector('main')?.innerText || '')
console.log('row visible after save    :', afterCreate.includes('Browser E2E assignment'))
console.log('total count updated to 1  :', /Total\s*\n\s*1/.test(afterCreate))
console.log('empty state gone          :', !afterCreate.includes('No assignments yet'))
await page.screenshot({ path: '/tmp/study_page_with_row.png', fullPage: true })
console.log('screenshot saved: /tmp/study_page_with_row.png')

await browser.close()

const modalOk = modalVisible && afterCreate.includes('Browser E2E assignment')

const ok = pageErrors.length === 0 && has('Study Tracker') && has('Add Assignment') && modalOk
console.log(ok ? '\nVERDICT: PAGE RENDERS ✓' : '\nVERDICT: PAGE BROKEN ✗')
process.exit(ok ? 0 : 1)
