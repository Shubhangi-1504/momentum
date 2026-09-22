-- ============================================
-- Momentum - Migration 008: Mentor <-> Student Chat (Idempotent)
-- ============================================
-- Purely additive. No existing tables, policies, or triggers modified.
--
-- 1. conversations  - ONE per (student, mentor) pair
-- 2. messages       - chat messages with read receipts
-- 3. RLS            - only connected pairs can converse; identity comes
--                     from auth.uid() via the 003 helpers, never the client
-- 4. RPC            - get_or_create_conversation(p_student_id) — atomic,
--                     client-supplied IDs are only ever *verified*, never
--                     trusted for identity
-- 5. Realtime       - adds the new tables to the supabase_realtime
--                     publication so Postgres changes stream to clients
--
-- Safe to run multiple times.
-- ============================================

-- ============================================
-- 1. CONVERSATIONS TABLE
--    student_id / mentor_id reference students.id / mentors.id, matching
--    the existing conventions (assignments, remarks, relationships all do).
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (student_id, mentor_id)
);

-- ============================================
-- 2. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_student
  ON conversations (student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_mentor
  ON conversations (mentor_id);

-- updated_at maintenance for conversations (existing 001 helper)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Keep the conversation's updated_at fresh as messages arrive, so
-- conversation lists can show the most recently active thread first.
-- SECURITY DEFINER: the UPDATE runs as the owner, bypassing RLS — the
-- message sender already proved membership via the messages INSERT policy.
CREATE OR REPLACE FUNCTION touch_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS messages_touch_conversation ON messages;
CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_conversation_on_message();

-- ============================================
-- 4. RPC: get_or_create_conversation(p_student_id DEFAULT NULL)
--    Identity is ALWAYS derived from auth.uid(); the optional parameter
--    only selects WHICH connected student a mentor is addressing.
--      student calls it with no args  -> conversation with their mentor
--      mentor calls it with student id -> conversation with that student
--    Atomic under concurrency (the unique constraint resolves races).
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_student_id UUID DEFAULT NULL)
RETURNS conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student UUID;
  v_mentor  UUID;
  v_existing conversations;
BEGIN
  IF p_student_id IS NULL THEN
    -- Student mode: resolve my own student row and my active mentor.
    v_student := current_student_id();
    IF v_student IS NULL THEN
      RAISE EXCEPTION 'not a student or mentor';
    END IF;

    SELECT msr.mentor_id INTO v_mentor
    FROM mentor_student_relationships msr
    WHERE msr.student_id = v_student
      AND msr.status = 'active'
    LIMIT 1;

    IF v_mentor IS NULL THEN
      RAISE EXCEPTION 'no connected mentor';
    END IF;
  ELSE
    -- Mentor mode: verify the addressed student is actually connected.
    v_mentor := current_mentor_id();
    IF v_mentor IS NULL THEN
      RAISE EXCEPTION 'not a mentor';
    END IF;
    IF NOT is_assigned_student(p_student_id) THEN
      RAISE EXCEPTION 'student not connected to you';
    END IF;
    v_student := p_student_id;
  END IF;

  -- Existing conversation? (unique constraint guarantees at most one)
  SELECT * INTO v_existing FROM conversations
  WHERE student_id = v_student AND mentor_id = v_mentor
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO conversations (student_id, mentor_id)
  VALUES (v_student, v_mentor)
  ON CONFLICT (student_id, mentor_id) DO NOTHING
  RETURNING * INTO v_existing;

  IF v_existing.id IS NULL THEN
    -- Lost an insert race — fetch the winner.
    SELECT * INTO v_existing FROM conversations
    WHERE student_id = v_student AND mentor_id = v_mentor
    LIMIT 1;
  END IF;

  RETURN v_existing;
END;
$$;

-- Conversation list for the current user (student OR mentor):
-- counterpart name, USN (student side), last message preview, unread
-- count, ordered by most recent activity. SECURITY DEFINER + auth.uid()
-- identity, so a user only ever sees their own conversations.
CREATE OR REPLACE FUNCTION get_my_conversations()
RETURNS TABLE (
  conversation_id UUID,
  counterpart_id UUID,
  counterpart_name TEXT,
  counterpart_usn TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_sender_id UUID,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT current_student_id() AS sid, current_mentor_id() AS mid
  ),
  convs AS (
    SELECT c.*,
      CASE WHEN me.sid IS NOT NULL THEN c.mentor_id ELSE c.student_id END AS counterpart_row_id
    FROM conversations c, me
    WHERE (me.sid IS NOT NULL AND c.student_id = me.sid)
       OR (me.mid IS NOT NULL AND c.mentor_id = me.mid)
  ),
  last_msg AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id, m.message, m.created_at, m.sender_id
    FROM messages m
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread AS (
    SELECT m.conversation_id, COUNT(*)::BIGINT AS cnt
    FROM messages m, me
    WHERE m.read_at IS NULL
      AND m.sender_id <> auth.uid()
    GROUP BY m.conversation_id
  )
  SELECT
    cv.id AS conversation_id,
    p.id AS counterpart_id,
    p.full_name AS counterpart_name,
    -- usn only exists on the student side; NULL when talking to a mentor
    s.usn AS counterpart_usn,
    lm.message AS last_message,
    lm.created_at AS last_message_at,
    lm.sender_id AS last_sender_id,
    COALESCE(u.cnt, 0) AS unread_count
  FROM convs cv
  JOIN me ON TRUE
  -- Exactly one of these matches: a student's counterpart is a mentor row,
  -- a mentor's counterpart is a student row. Join conditionally, then take
  -- the matching profile. (A plain JOIN on students only would drop every
  -- student caller's rows, because their counterpart_row_id is mentors.id.)
  LEFT JOIN students s ON me.mid IS NOT NULL AND s.id = cv.counterpart_row_id
  LEFT JOIN mentors m  ON me.sid IS NOT NULL AND m.id = cv.counterpart_row_id
  JOIN profiles p ON p.id = COALESCE(s.profile_id, m.profile_id)
  LEFT JOIN last_msg lm ON lm.conversation_id = cv.id
  LEFT JOIN unread u ON u.conversation_id = cv.id
  ORDER BY COALESCE(lm.created_at, cv.created_at) DESC;
$$;

-- ============================================
-- 5. ROW LEVEL SECURITY
--    Policy identity rule everywhere: the caller is either the
--    conversation's student or its mentor. Cross-pair access fails.
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat: pair members view conversation" ON conversations;
CREATE POLICY "Chat: pair members view conversation"
  ON conversations FOR SELECT
  USING (
    current_student_id() = student_id
    OR current_mentor_id() = mentor_id
  );

DROP POLICY IF EXISTS "Chat: students create own conversation" ON conversations;
CREATE POLICY "Chat: students create own conversation"
  ON conversations FOR INSERT
  WITH CHECK (
    current_student_id() = student_id
    -- Pairing with an ARBITRARY mentor_id must fail: the pair must already
    -- be an ACTIVE mentor_student_relationship. (Permissive policies are
    -- OR'd, so this bound is what stops unrelated pairings.) Relationship
    -- SELECT policies only expose the caller's own rows, so this leaks
    -- nothing and cannot recurse (it never references conversations).
    -- NOTE: the outer row's columns MUST be table-qualified here — bare
    -- names would resolve to msr's own columns inside the subquery and
    -- make the clause vacuously true.
    AND EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.student_id = conversations.student_id
        AND msr.mentor_id = conversations.mentor_id
        AND msr.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Chat: mentors create with connected student" ON conversations;
CREATE POLICY "Chat: mentors create with connected student"
  ON conversations FOR INSERT
  WITH CHECK (
    current_mentor_id() = mentor_id
    AND is_assigned_student(student_id)
  );

DROP POLICY IF EXISTS "Chat: pair members update conversation" ON conversations;
CREATE POLICY "Chat: pair members update conversation"
  ON conversations FOR UPDATE
  USING (
    current_student_id() = student_id
    OR current_mentor_id() = mentor_id
  )
  WITH CHECK (
    -- Bare column names in policies refer to the NEW row (unlike trigger
    -- functions, RLS expressions cannot use the new./old. records).
    current_student_id() = student_id
    OR current_mentor_id() = mentor_id
  );

-- messages: visibility derives from conversation membership. The EXISTS
-- subquery targets conversations by PRIMARY KEY, so it does not recurse
-- into the conversations policies.
DROP POLICY IF EXISTS "Chat: members view messages" ON messages;
CREATE POLICY "Chat: members view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.student_id = current_student_id()
             OR c.mentor_id = current_mentor_id())
    )
  );

DROP POLICY IF EXISTS "Chat: members send as themselves" ON messages;
CREATE POLICY "Chat: members send as themselves"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.student_id = current_student_id()
             OR c.mentor_id = current_mentor_id())
    )
  );

-- read_at receipts: a member may mark RECEIVED messages as read — i.e.
-- update only messages they did NOT send, inside their own conversation.
DROP POLICY IF EXISTS "Chat: members mark received read" ON messages;
CREATE POLICY "Chat: members mark received read"
  ON messages FOR UPDATE
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.student_id = current_student_id()
             OR c.mentor_id = current_mentor_id())
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.student_id = current_student_id()
             OR c.mentor_id = current_mentor_id())
    )
  );

-- ============================================
-- 5b. COLUMN-LEVEL WRITE LOCK on messages
--     RLS row policies cannot restrict WHICH COLUMNS an UPDATE may change,
--     so pair members could otherwise rewrite a received message's text.
--     Privileges close that: members may only ever UPDATE read_at.
--     Message text, sender and timestamps are immutable.
-- ============================================
REVOKE UPDATE ON TABLE messages FROM anon, authenticated;
GRANT UPDATE (read_at) ON TABLE messages TO authenticated;

-- Conversations are never updated by clients (updated_at is maintained by
-- the trigger). The UPDATE policy above stays as defense-in-depth.
REVOKE UPDATE ON TABLE conversations FROM anon, authenticated;

-- RPCs are invocable by authenticated users (same convention as migration 007).
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_conversations() TO authenticated;

-- ============================================
-- 6. REALTIME
--    Stream message inserts/updates to subscribed clients. Realtime
--    applies these same RLS policies per subscriber, so users only ever
--    receive rows from their own conversations.
-- ============================================
DO $$
BEGIN
  -- The publication exists only on Supabase; skip silently on plain Postgres
  -- (this also keeps local psql harness runs working).
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    END IF;
  END IF;
END $$;

-- ============================================
-- Done. Idempotent: safe to re-run.
-- ============================================






 