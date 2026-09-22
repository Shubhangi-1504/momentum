-- ============================================
-- LOCAL-ONLY RLS TESTS for migration 008 (not a migration)
-- Run as superuser against a DB loaded with test_harness.sql:
--   psql "momentum_chat_test" -v ON_ERROR_STOP=1 -f supabase/test_harness_tests.sql
--
-- Simulates end-users exactly how PostgREST does it: the connection role is
-- `authenticated` and per-request identity comes from request.jwt.claim.*
-- GUCs (read by the auth.uid() stub). All tests therefore run WITH RLS
-- enforced. Prints PASS/FAIL per test; grep the output for FAIL.
-- ============================================

\set ON_ERROR_STOP on

-- ============================================
-- SEED (as superuser): 2 mentors, 2 students, 1 relationship (S1<->M1)
-- ============================================
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000c001', 'm1@t.local'),
  ('00000000-0000-0000-0000-00000000c002', 'm2@t.local'),
  ('00000000-0000-0000-0000-00000000e001', 's1@t.local'),
  ('00000000-0000-0000-0000-00000000e002', 's2@t.local');

INSERT INTO profiles (id, full_name, role, email) VALUES
  ('00000000-0000-0000-0000-00000000c001', 'Mentor One', 'mentor', 'm1@t.local'),
  ('00000000-0000-0000-0000-00000000c002', 'Mentor Two', 'mentor', 'm2@t.local'),
  ('00000000-0000-0000-0000-00000000e001', 'Student One', 'student', 's1@t.local'),
  ('00000000-0000-0000-0000-00000000e002', 'Student Two', 'student', 's2@t.local');

INSERT INTO mentors (id, profile_id) VALUES
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000c002');

INSERT INTO students (id, profile_id, usn, college_email) VALUES
  ('00000000-0000-0000-0000-0000000000A1', '00000000-0000-0000-0000-00000000e001', 'USN-1', 's1@t.local'),
  ('00000000-0000-0000-0000-0000000000A2', '00000000-0000-0000-0000-00000000e002', 'USN-2', 's2@t.local');

INSERT INTO mentor_student_relationships (mentor_id, student_id, status) VALUES
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000A1', 'active');

-- ============================================
-- Load 008 (the file under test) as table OWNER (bypasses RLS)
-- ============================================
\i supabase/migrations/008_chat_system.sql

-- Mirror Supabase's default privileges for the NEW tables (on Supabase this
-- happens automatically via ALTER DEFAULT PRIVILEGES; local harness must do
-- it explicitly since 008 created tables after the harness grants ran).
-- UPDATE on messages stays column-scoped to read_at by the migration's own
-- REVOKE/GRANT; DELETE is included to mirror Supabase's blanket grant (no
-- DELETE policy exists, so RLS still blocks every delete).
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON messages TO authenticated;
-- Supabase grants authenticated SELECT on ALL existing tables, including
-- mentor_student_relationships (read by the conversations INSERT policy).
-- Granting it here ensures tests 1-2 are rejected by the POLICY clause
-- itself, not by a missing privilege — matching live Supabase behavior.
GRANT SELECT ON mentor_student_relationships TO authenticated;
GRANT SELECT ON students, mentors, profiles TO authenticated;

-- ============================================
-- Test helpers (SECURITY INVOKER: inner statements run as the caller)
-- ============================================
CREATE OR REPLACE FUNCTION tests_expect(query TEXT, want BOOLEAN, label TEXT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  val BOOLEAN;
BEGIN
  EXECUTE query INTO val;
  IF val IS NOT DISTINCT FROM want THEN
    RAISE NOTICE 'PASS  %', label;
  ELSE
    RAISE NOTICE 'FAIL  % (got %, want %)', label, val, want;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION tests_expect_count(query TEXT, want BIGINT, label TEXT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  val BIGINT;
BEGIN
  EXECUTE query INTO val;
  IF val IS NOT DISTINCT FROM want THEN
    RAISE NOTICE 'PASS  %', label;
  ELSE
    RAISE NOTICE 'FAIL  % (got %, want %)', label, val, want;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION tests_expect_error(query TEXT, label TEXT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  dummy BIGINT;
BEGIN
  EXECUTE query INTO dummy;
  RAISE NOTICE 'FAIL  % (no error raised)', label;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS  % (rejected: %)', label, left(SQLERRM, 60);
END $$;

-- ============================================
-- Become an end-user session: role = authenticated (RLS enforced from here)
-- ============================================
SET ROLE authenticated;

-- ---- S1 (connected student) -------------------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', false);
SELECT set_config('request.jwt.claim.role', 'authenticated', false);

-- 1. Direct INSERT pairing self with an UNRELATED mentor -> rejected
SELECT tests_expect_error(
  $$INSERT INTO conversations (student_id, mentor_id)
    VALUES ('00000000-0000-0000-0000-0000000000A1', '00000000-0000-0000-0000-00000000d002')
    RETURNING 1$$,
  'student cannot create conversation with unrelated mentor');

-- 2. Direct INSERT claiming ANOTHER student's row -> rejected
SELECT tests_expect_error(
  $$INSERT INTO conversations (student_id, mentor_id)
    VALUES ('00000000-0000-0000-0000-0000000000A2', '00000000-0000-0000-0000-00000000d001')
    RETURNING 1$$,
  'student cannot create conversation for another student');

-- 3. RPC creates the conversation with the CONNECTED mentor
DO $$
DECLARE
  c conversations;
BEGIN
  c := get_or_create_conversation(NULL);
  IF c.mentor_id = '00000000-0000-0000-0000-00000000d001' THEN
    RAISE NOTICE 'PASS  student RPC creates conversation with connected mentor';
  ELSE
    RAISE NOTICE 'FAIL  student RPC creates conversation with connected mentor';
  END IF;
END $$;

-- 4. RLS SELECT: student sees their own conversation
SELECT tests_expect(
  $$SELECT EXISTS (SELECT 1 FROM conversations
     WHERE student_id = '00000000-0000-0000-0000-0000000000A1')$$,
  true,
  'student reads own conversation via RLS');

-- 5. RPC is idempotent
DO $$
DECLARE
  c1 conversations;
  c2 conversations;
BEGIN
  c1 := get_or_create_conversation(NULL);
  c2 := get_or_create_conversation(NULL);
  IF c1.id = c2.id THEN
    RAISE NOTICE 'PASS  get_or_create_conversation is idempotent';
  ELSE
    RAISE NOTICE 'FAIL  get_or_create_conversation is idempotent';
  END IF;
END $$;

-- 6. Student sends a message into their own conversation
SELECT tests_expect_count(
  $$WITH ins AS (
     INSERT INTO messages (conversation_id, sender_id, message)
     SELECT id, auth.uid(), 'Hello mentor!' FROM conversations
     WHERE student_id = '00000000-0000-0000-0000-0000000000A1'
     RETURNING 1)
   SELECT count(*) FROM ins$$,
  1,
  'student sends message into own conversation');

-- 7. Student cannot spoof the mentor as sender
SELECT tests_expect_error(
  $$INSERT INTO messages (conversation_id, sender_id, message)
   SELECT id, '00000000-0000-0000-0000-00000000c001', 'spoofed' FROM conversations
   WHERE student_id = '00000000-0000-0000-0000-0000000000A1'
   RETURNING 1$$,
  'student cannot spoof sender_id');

-- 8. Student cannot mark their OWN message as read
SELECT tests_expect_count(
  $$WITH upd AS (
     UPDATE messages SET read_at = NOW()
     WHERE sender_id = auth.uid() AND read_at IS NULL RETURNING 1)
   SELECT count(*) FROM upd$$,
  0,
  'student cannot mark own message as read');

-- ---- S2 (UNCONNECTED student) ------------------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e002', false);

-- 9. RPC rejects: no connected mentor
SELECT tests_expect_error(
  $$SELECT student_id FROM get_or_create_conversation(NULL)$$,
  'unconnected student RPC rejected');

SELECT tests_expect(
  $$SELECT NOT EXISTS (SELECT 1 FROM conversations)$$,
  true,
  'unconnected student sees NO conversations');

-- ---- M1 (connected mentor) ---------------------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c001', false);

SELECT tests_expect(
  $$SELECT EXISTS (SELECT 1 FROM conversations
     WHERE student_id = '00000000-0000-0000-0000-0000000000A1')$$,
  true,
  'connected mentor sees the conversation');

-- 10. Mentor replies
SELECT tests_expect_count(
  $$WITH ins AS (
     INSERT INTO messages (conversation_id, sender_id, message)
     SELECT id, auth.uid(), 'Hi! Sure.' FROM conversations
     WHERE student_id = '00000000-0000-0000-0000-0000000000A1'
     RETURNING 1)
   SELECT count(*) FROM ins$$,
  1,
  'mentor replies into connected conversation');

-- 11. Mentor marks the RECEIVED (student) message as read
SELECT tests_expect_count(
  $$WITH upd AS (
     UPDATE messages SET read_at = NOW()
     WHERE sender_id <> auth.uid() AND read_at IS NULL RETURNING 1)
   SELECT count(*) FROM upd$$,
  1,
  'mentor marks received message as read');

-- 12. Mentor RPC opens the conversation with the connected student
DO $$
DECLARE
  c conversations;
BEGIN
  c := get_or_create_conversation('00000000-0000-0000-0000-0000000000A1');
  IF c.student_id = '00000000-0000-0000-0000-0000000000A1' THEN
    RAISE NOTICE 'PASS  mentor RPC opens conversation with connected student';
  ELSE
    RAISE NOTICE 'FAIL  mentor RPC opens conversation with connected student';
  END IF;
END $$;

-- 13. Column-level lock: received message TEXT cannot be rewritten
SELECT tests_expect_error(
  $$UPDATE messages SET message = 'hacked' WHERE sender_id <> auth.uid() RETURNING 1$$,
  'mentor cannot alter received message text');

-- 14. Conversation list (mentor side): counterpart = Student One, unread 0
SELECT tests_expect(
  $$SELECT counterpart_name = 'Student One'
     AND counterpart_usn = 'USN-1'
     AND unread_count = 0
   FROM get_my_conversations()$$,
  true,
  'mentor conversation list: name/usn/unread correct');

-- ---- M2 (UNRELATED mentor) ---------------------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c002', false);

SELECT tests_expect(
  $$SELECT NOT EXISTS (SELECT 1 FROM conversations)$$,
  true,
  'unrelated mentor sees NO conversations');

SELECT tests_expect(
  $$SELECT NOT EXISTS (SELECT 1 FROM messages)$$,
  true,
  'unrelated mentor reads NO messages');

-- 15. Policy (not just FK) blocks sending: fabricated conversation id
SELECT tests_expect_error(
  $$INSERT INTO messages (conversation_id, sender_id, message)
    VALUES (gen_random_uuid(), auth.uid(), 'intrusion') RETURNING 1$$,
  'unrelated mentor cannot send into any conversation');

-- 16. RPC rejects unconnected student
SELECT tests_expect_error(
  $$SELECT student_id FROM get_or_create_conversation('00000000-0000-0000-0000-0000000000A1')$$,
  'unrelated mentor RPC rejected');

SELECT tests_expect(
  $$SELECT count(*) = 0 FROM get_my_conversations()$$,
  true,
  'unrelated mentor conversation list is empty');

-- ---- Back to S1: read receipts + list -----------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', false);

-- 17. Student marks the mentor's reply as read
SELECT tests_expect_count(
  $$WITH upd AS (
     UPDATE messages SET read_at = NOW()
     WHERE sender_id <> auth.uid() AND read_at IS NULL RETURNING 1)
   SELECT count(*) FROM upd$$,
  1,
  'student marks received (mentor) message as read');

-- 18. Conversation list (student side): counterpart = Mentor One, no usn
SELECT tests_expect(
  $$SELECT counterpart_name = 'Mentor One' AND counterpart_usn IS NULL
   FROM get_my_conversations()$$,
  true,
  'student conversation list: mentor name, no usn');

-- ---- M1 again: student's read receipt did not touch mentor's view -------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c001', false);

SELECT tests_expect_count(
  $$SELECT count(*) FROM messages$$,
  2,
  'exactly two messages exist (no stray writes)');

-- ============================================
-- IDEMPOTENCY: re-running 008 must succeed (needs owner role again)
-- ============================================
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('request.jwt.claim.role', 'anon', false);

\i supabase/migrations/008_chat_system.sql
SELECT 'PASS  migration 008 re-runs cleanly (idempotent)' AS result;

-- ============================================
-- Done. Check output with:  psql ... -f ... 2>&1 | grep FAIL
-- ============================================
