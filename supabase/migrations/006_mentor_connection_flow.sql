-- ============================================
-- Momentum - Migration 006: Mentor <-> Student connection flow
-- ============================================
-- Additive only (no drops, no destructive changes):
--   1. mentors.connection_code        - human-readable invite code (MOM-XXXXX)
--   2. mentor_student_relationships   - status + updated_at ('active' by default)
--   3. assignments.created_by_role    - 'student' | 'mentor' (who created the record)
--   4. mentor_remarks.assignment_id   - optional link to a specific assignment
--   5. student_reviews                - "Mark as Reviewed" history
--   6. RLS: mentors can create/update assignments of connected students;
--          student_reviews policies
--   7. RPCs (SECURITY DEFINER):
--        request_mentor_connection(code)  - student connects by invite code
--        get_student_mentor_info()        - student's mentor card data
--        make_connection_code()           - code generator for the trigger
--
-- Reuses existing structures: profiles/students/mentors, mentor_student_relationships,
-- assignments, mentor_remarks, update_updated_at_column(), RLS helpers from 003.
-- Safe to run multiple times.
-- ============================================

-- ============================================
-- 1. MENTOR CONNECTION CODE
-- ============================================
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS connection_code TEXT;

-- Unique (idempotent on re-run: ignore if the index already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'mentors'
      AND indexname  = 'uq_mentors_connection_code'
  ) THEN
    CREATE UNIQUE INDEX uq_mentors_connection_code ON mentors (connection_code);
  END IF;
END $$;

-- Unambiguous alphabet (no I/L/O/0/1) — 5 chars, ~39M combinations
CREATE OR REPLACE FUNCTION make_connection_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code TEXT;
  tries INT := 0;
BEGIN
  LOOP
    tries := tries + 1;
    code := 'MOM-'
         || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1)
         || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1)
         || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1)
         || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1)
         || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM mentors WHERE connection_code = code) OR tries > 20;
  END LOOP;
  RETURN code;
END;
$$;

-- Auto-assign a code to every new mentor (used by the signup trigger)
CREATE OR REPLACE FUNCTION set_mentor_connection_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.connection_code IS NULL OR TRIM(NEW.connection_code) = '' THEN
    NEW.connection_code := make_connection_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_mentor_connection_code_trigger ON mentors;
CREATE TRIGGER set_mentor_connection_code_trigger
  BEFORE INSERT ON mentors
  FOR EACH ROW EXECUTE FUNCTION set_mentor_connection_code();

-- Backfill existing mentors
UPDATE mentors SET connection_code = make_connection_code() WHERE connection_code IS NULL;

-- ============================================
-- 2. RELATIONSHIP STATUS + updated_at
-- ============================================
ALTER TABLE mentor_student_relationships
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE mentor_student_relationships
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DROP TRIGGER IF EXISTS update_msr_updated_at ON mentor_student_relationships;
CREATE TRIGGER update_msr_updated_at
  BEFORE UPDATE ON mentor_student_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. ASSIGNMENT AUTHORSHIP
-- ============================================
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS created_by_role TEXT NOT NULL DEFAULT 'student'
  CHECK (created_by_role IN ('student', 'mentor'));
-- Existing rows were created by students; the default backfills them correctly.

-- ============================================
-- 4. REMARK <-> ASSIGNMENT LINK
-- ============================================
ALTER TABLE mentor_remarks
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mentor_remarks_assignment_id
  ON mentor_remarks(assignment_id);

-- ============================================
-- 5. STUDENT REVIEWS ("Mark as Reviewed")
-- ============================================
CREATE TABLE IF NOT EXISTS student_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (mentor_id, student_id, reviewed_at)
);

CREATE INDEX IF NOT EXISTS idx_student_reviews_mentor_id ON student_reviews(mentor_id);
CREATE INDEX IF NOT EXISTS idx_student_reviews_student_id ON student_reviews(student_id);

-- ============================================
-- 6. RLS
-- ============================================
ALTER TABLE student_reviews ENABLE ROW LEVEL SECURITY;

-- Assignments: mentors currently have SELECT-only. Add INSERT/UPDATE for
-- connected students so both roles work on the SAME assignment record.
DROP POLICY IF EXISTS "Mentors can create assignments for assigned students" ON assignments;
CREATE POLICY "Mentors can create assignments for assigned students"
  ON assignments FOR INSERT
  WITH CHECK (created_by_role = 'mentor' AND is_assigned_student(student_id));

DROP POLICY IF EXISTS "Mentors can update assignments of assigned students" ON assignments;
CREATE POLICY "Mentors can update assignments of assigned students"
  ON assignments FOR UPDATE
  USING (is_assigned_student(student_id));

-- student_reviews
DROP POLICY IF EXISTS "Mentors can view own student reviews" ON student_reviews;
CREATE POLICY "Mentors can view own student reviews"
  ON student_reviews FOR SELECT
  USING (mentor_id = current_mentor_id());

DROP POLICY IF EXISTS "Mentors can review assigned students" ON student_reviews;
CREATE POLICY "Mentors can review assigned students"
  ON student_reviews FOR INSERT
  WITH CHECK (
    mentor_id = current_mentor_id()
    AND is_assigned_student(student_id)
  );

DROP POLICY IF EXISTS "Mentors can delete own student reviews" ON student_reviews;
CREATE POLICY "Mentors can delete own student reviews"
  ON student_reviews FOR DELETE
  USING (mentor_id = current_mentor_id());

-- Students see their own review history (for "Last reviewed" on their side)
DROP POLICY IF EXISTS "Students can view own reviews" ON student_reviews;
CREATE POLICY "Students can view own reviews"
  ON student_reviews FOR SELECT
  USING (student_id = current_student_id());

-- ============================================
-- 7. RPCs (SECURITY DEFINER — no UUIDs exposed to users)
-- ============================================

-- Student connects to a mentor by invite code.
-- Enforces: caller is a student, code valid, ONE active mentor per student.
CREATE OR REPLACE FUNCTION request_mentor_connection(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_code TEXT;
  v_mentor RECORD;
  v_existing UUID;
BEGIN
  v_student_id := current_student_id();
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only students can connect to a mentor.');
  END IF;

  v_code := UPPER(TRIM(COALESCE(p_code, '')));
  IF v_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please enter a mentor code.');
  END IF;

  SELECT m.id, p.full_name
    INTO v_mentor
  FROM mentors m
  JOIN profiles p ON p.id = m.profile_id
  WHERE UPPER(m.connection_code) = v_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No mentor found with that code. Please check it and try again.');
  END IF;

  SELECT msr.id INTO v_existing
  FROM mentor_student_relationships msr
  WHERE msr.student_id = v_student_id AND msr.status = 'active'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You are already connected to a mentor.');
  END IF;

  INSERT INTO mentor_student_relationships (mentor_id, student_id, status)
  VALUES (v_mentor.id, v_student_id, 'active');

  RETURN jsonb_build_object('ok', true, 'mentor_name', v_mentor.full_name);
END;
$$;

-- Student-side mentor card: name, status, last review, latest feedback.
CREATE OR REPLACE FUNCTION get_student_mentor_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_result JSONB;
BEGIN
  v_student_id := current_student_id();
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('connected', false);
  END IF;

  SELECT jsonb_build_object(
    'connected', TRUE,
    'mentor_name', p.full_name,
    'status', msr.status,
    'connected_at', msr.assigned_at,
    'last_reviewed_at', (
      SELECT MAX(r.reviewed_at) FROM student_reviews r WHERE r.student_id = v_student_id
    ),
    'latest_remark', (
      SELECT mr.content FROM mentor_remarks mr
      WHERE mr.student_id = v_student_id
      ORDER BY mr.created_at DESC LIMIT 1
    ),
    'latest_remark_at', (
      SELECT mr.created_at FROM mentor_remarks mr
      WHERE mr.student_id = v_student_id
      ORDER BY mr.created_at DESC LIMIT 1
    )
  )
  INTO v_result
  FROM mentor_student_relationships msr
  JOIN mentors m ON m.id = msr.mentor_id
  JOIN profiles p ON p.id = m.profile_id
  WHERE msr.student_id = v_student_id AND msr.status = 'active'
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('connected', false);
  END IF;
  RETURN v_result;
END;
$$;

-- ============================================
-- 8. Verify (optional)
-- ============================================
SELECT COUNT(*) AS mentors_missing_code FROM mentors WHERE connection_code IS NULL;
