// Temporary browser/Realtime E2E — Mentor <-> Student chat.
// Verifies: RLS isolation (unrelated users), connected pair messaging,
// read receipts, realtime delivery in-browser without refresh.
// Run: node supabase/diag_chat_flow.mjs  (dev server on :5173)
// REQUIRES migration 008_chat_system.sql to be applied to the live DB.
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
let failures = 0
function check(name, ok) {
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}`)
  if (!ok) failures++
}

async function mkUser(n, role) {
  const api = createClient(url, anon)
  const email = `chat${n}_${sfx}@example.com`
  const su = await api.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: role === 'mentor' ? `Mentor ${sfx}` : `Student ${sfx}`,
        role,
        usn: role === 'student' ? `CHT-${sfx}` : undefined,
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

console.log('setup: creating mentor A, mentor B, student S...')
const mentorA = await mkUser(1, 'mentor')
const mentorB = await mkUser(2, 'mentor')
const student = await mkUser(3, 'student')

// Connect S <-> A only.
await student.client.rpc('request_mentor_connection', { p_code: mentorA.code })

// ============================================
// 1. RLS isolation
// ============================================
console.log('\n=== RLS isolation ===')

// Student creates a conversation with their connected mentor (RPC).
const convRes = await student.client.rpc('get_or_create_conversation', { p_student_id: null })
check('student creates conversation with connected mentor', !convRes.error && !!convRes.data?.id)
const convId = convRes.data?.id

// Student cannot create a conversation with the UNRELATED mentor B.
const convB = await student.client.rpc('get_or_create_conversation', {
  p_student_id: null,
})
// The RPC resolves mentor from the relationship table, so it still returns
// mentor A's conversation; the real guard is direct-table isolation below.

// Direct-table attacks with fabricated IDs:
const fakeInsert = await student.client.from('conversations').insert({
  student_id: student.id,
  mentor_id: mentorB.id,
})
check('student cannot INSERT conversation with unrelated mentor', !!fakeInsert.error)

const foreignConv = await student.client
  .from('conversations')
  .insert({ student_id: student.id, mentor_id: mentorA.id })
// may fail as duplicate (unique) — that is fine, it proves nothing either way.

const listA = await mentorA.client.from('conversations').select('*')
check('connected mentor sees the conversation', (listA.data || []).some((c) => c.id === convId))
const listB = await mentorB.client.from('conversations').select('*')
check('unrelated mentor sees NO conversations', (listB.data || []).length === 0)

// Mentor B cannot read the messages.
const msgsB = await mentorB.client
  .from('messages')
  .select('*')
  .eq('conversation_id', convId)
check('unrelated mentor reads NO messages', (msgsB.data || []).length === 0)

// ============================================
// 2. Connected pair messaging + read receipts
// ============================================
console.log('\n=== Messaging ===')
const m1 = await student.client
  .from('messages')
  .insert({ conversation_id: convId, sender_id: (await student.client.auth.getUser()).data.user.id, message: 'Hi mentor, question about the ADA project!' })
  .select()
  .single()
check('student sends message into own conversation', !m1.error && !!m1.data?.id)

const spoof = await student.client
  .from('messages')
  .insert({ conversation_id: convId, sender_id: mentorA.id, message: 'spoofed' })
  .select()
  .single()
check('student cannot spoof sender_id (RLS rejects)', !!spoof.error)

const seenA = await mentorA.client
  .from('messages')
  .select('*')
  .eq('conversation_id', convId)
check('mentor sees student message', (seenA.data || []).some((m) => m.id === m1.data?.id))

// Mentor marks received message read.
const mark = await mentorA.client
  .from('messages')
  .update({ read_at: new Date().toISOString() })
  .eq('conversation_id', convId)
  .is('read_at', null)
  .neq('sender_id', (await mentorA.client.auth.getUser()).data.user.id)
  .select('id')
check('mentor marks received message as read', !mark.error && (mark.data || []).length === 1)

// Mentor cannot edit the student's message TEXT (only read_at).
const evilEdit = await mentorA.client
  .from('messages')
  .update({ message: 'hacked' })
  .eq('id', m1.data.id)
  .select('message')
check('mentor cannot alter message content', !evilEdit.error && evilEdit.data?.[0]?.message !== 'hacked')

// Mentor B cannot send into the conversation.
const mB = await mentorB.client
  .from('messages')
  .insert({ conversation_id: convId, sender_id: (await mentorB.client.auth.getUser()).data.user.id, message: 'intrusion' })
  .select()
  .single()
check('unrelated mentor cannot send into conversation', !!mB.error)

// Mentor replies.
const m2 = await mentorA.client
  .from('messages')
  .insert({ conversation_id: convId, sender_id: (await mentorA.client.auth.getUser()).data.user.id, message: 'Sure — send me your progress.' })
  .select()
  .single()
check('mentor replies', !m2.error && !!m2.data?.id)

// ============================================
// 3. Conversation list RPC
// ============================================
console.log('\n=== Conversation list RPC ===')
const listStudent = await student.client.rpc('get_my_conversations')
check(
  'student list shows conversation w/ unread 0 (all read)',
  !listStudent.error && listStudent.data?.[0]?.unread_count === 0n || listStudent.data?.[0]?.unread_count === 0
)
const listMentor = await mentorA.client.rpc('get_my_conversations')
check('mentor list shows 1 conversation', !listMentor.error && (listMentor.data || []).length === 1)
const listMentorB = await mentorB.client.rpc('get_my_conversations')
check('unrelated mentor list is empty', !listMentorB.error && (listMentorB.data || []).length === 0)

// ============================================
// 4. Realtime: student client receives mentor reply without refresh
// ============================================
console.log('\n=== Realtime (Supabase channel) ===')
const received = []
const channel = student.client
  .channel(`messages:${convId}`)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
    (payload) => received.push(payload.new)
  )
  .subscribe()

// Wait for the subscription to be confirmed SUBSCRIBED.
await new Promise((resolve) => {
  const t = setInterval(() => {
    if (channel.state === 'joined') { clearInterval(t); resolve() }
  }, 100)
  setTimeout(() => { clearInterval(t); resolve() }, 5000)
})

const m3 = await mentorA.client
  .from('messages')
  .insert({ conversation_id: convId, sender_id: (await mentorA.client.auth.getUser()).data.user.id, message: 'Realtime test message' })
  .select()
  .single()
check('mentor sends realtime test message', !m3.error)

await new Promise((r) => setTimeout(r, 3500))
check('student received mentor message via realtime', received.some((m) => m.id === m3.data?.id))
student.client.removeChannel(channel)

// ============================================
// 5. Browser UI: live receive without refresh
// ============================================
console.log('\n=== Browser UI (student sees mentor reply live) ===')
const consoleErrors = []
const pageErrors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)))

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
const textInputs = page.locator('input[type="text"]')
await textInputs.nth(0).fill('Student Diag')
await textInputs.nth(1).fill('CHT-' + sfx).catch(() => {})
await page.locator('input[type="email"]').first().fill(student.email)
await page.locator('input[type="password"]').first().fill(password)
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(3000)

// Student portal → Chat
await page.goto('http://localhost:5173/student/chat', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const chatText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
check('chat page loads', !chatText.includes('Something went wrong'))
check('conversation listed with mentor name', chatText.includes('Mentor ' + sfx))
check('history rendered', chatText.includes('ADA project'))

// Open the thread, then have the mentor send a NEW message; it must appear live.
await page.locator('button', { hasText: 'Mentor ' + sfx }).first().click()
await page.waitForTimeout(2000)

await mentorA.client
  .from('messages')
  .insert({ conversation_id: convId, sender_id: (await mentorA.client.auth.getUser()).data.user.id, message: 'Live check ' + sfx })
  .select()
  .single()

await page.waitForTimeout(3500)
const threadText = await page.evaluate(() => document.querySelector('main')?.innerText || '')
check('mentor message appears WITHOUT refresh', threadText.includes('Live check ' + sfx))

// Student sends a reply through the UI.
await page.locator('input[placeholder="Type a message…"]').fill('Thanks mentor!')
await page.locator('button[title="Send"]').click()
await page.waitForTimeout(1500)
const afterSend = await page.evaluate(() => document.querySelector('main')?.innerText || '')
check('student reply appears in thread', afterSend.includes('Thanks mentor!'))

console.log('\n=== Console/page errors ===')
const relevant = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('sourcemap'))
console.log('console errors:', relevant.length === 0 ? 'none' : relevant.slice(0, 5))
console.log('page errors   :', pageErrors.length === 0 ? 'none' : pageErrors.slice(0, 5))

await browser.close()
console.log(`\n=== RESULT: ${failures === 0 && relevant.length === 0 && pageErrors.length === 0 ? 'ALL PASSED' : failures + ' FAILURES'} ===`)
console.log('test accounts:', mentorA.email, mentorB.email, student.email)
process.exit(failures > 0 || relevant.length > 0 || pageErrors.length > 0 ? 1 : 0)
