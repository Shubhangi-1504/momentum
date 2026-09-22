-- ============================================
-- Momentum - Migration 007: Consistency / Calendar system (Idempotent)
-- ============================================
-- Purely additive. No tables are dropped, recreated, or duplicated.
-- Existing RLS behavior from 002/003 is preserved; new policies are added
-- only for the new RPCs (none needed: RPCs are SECURITY DEFINER and reuse
-- the 003 helpers).
--
-- 1. students.tracking_start_date        - when the student began Momentum
-- 2. assignments.start_date              - task start date (calendar date)
-- 3. assignments.completed_at            - when the task was completed
-- 4. STRICT habit completion guard       - a trigger rejects any habit_logs
--    insert/update whose log_date is not the student's *current* day
--    (DB-enforced anti-backfill; missed days stay missed)
-- 5. Helper RPCs (SECURITY DEFINER) for real consistency data:
--      get_my_consistency()                    - student's own stats
--      get_mentor_student_consistency(sid)     - mentor view (RLS-checked)
-- 6. Indexes + updated_at trigger for new columns
--
-- Safe to run multiple times.
-- ============================================

-- ============================================
-- 1. STUDENT TRACKING START DATE
-- ============================================
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS tracking_start_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Existing students started "when they joined": backfill from auth creation
-- time converted to a calendar date (UTC calendar date; the auth timestamp
-- has no local timezone, so this is the best available approximation).
UPDATE students s
SET tracking_start_date = (p.created_at AT TIME ZONE 'utc')::date
FROM profiles p
WHERE s.profile_id = p.id
  AND s.tracking_start_date = CURRENT_DATE;

-- ============================================
-- 2. ASSIGNMENT START DATE + COMPLETION TIMESTAMP
-- ============================================
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Backfill: completed tasks with no completion timestamp (best effort)
UPDATE assignments
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;

-- Auto-record/clear completed_at whenever status changes (works for both
-- student and mentor updates; preserves the existing updated_at trigger).
CREATE OR REPLACE FUNCTION set_assignment_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at := NOW();
  ELSIF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_assignment_completed_at_trigger ON assignments;
CREATE TRIGGER set_assignment_completed_at_trigger
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION set_assignment_completed_at();

-- ============================================
-- 3. STRICT HABIT COMPLETION GUARD (anti-backfill)
-- ============================================
-- A habit_log row may only be written when log_date equals the student's
-- current calendar day (Postgres CURRENT_DATE on the server). Missed days
-- remain missed; streaks cannot be fabricated by inserting past rows.
CREATE OR REPLACE FUNCTION enforce_habit_log_today()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  SELECT student_id INTO v_student_id
  FROM habits WHERE id = NEW.habit_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Habit not found for this log.';
  END IF;

  -- Students may only write today. Mentors have no habit_logs write
  -- policies at all (RLS already blocks them), so this guard mainly
  -- protects against students backfilling.
  IF NEW.log_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'Habits can only be marked for today (%). Missed days stay missed.', CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_habit_log_today_trigger ON habit_logs;
CREATE TRIGGER enforce_habit_log_today_trigger
  BEFORE INSERT OR UPDATE ON habit_logs
  FOR EACH ROW EXECUTE FUNCTION enforce_habit_log_today();

-- ============================================
-- 4. CONSISTENCY HELPERS (single source of truth for date math)
-- ============================================

-- Consecutive streak of days ending today or yesterday, counting from
-- the later of (tracking start, habit creation) where relevant is done
-- client-side; the server provides raw completion day lists instead.

-- Student's own consistency snapshot (caller = the student, via RLS helpers).
CREATE OR REPLACE FUNCTION get_my_consistency()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_start DATE;
  v_days_active INT;
  v_completed_dates TEXT[];
  v_assignment_done_dates TEXT[];
BEGIN
  v_student_id := current_student_id();
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only students have consistency data.');
  END IF;

  SELECT tracking_start_date INTO v_start FROM students WHERE id = v_student_id;

  -- Distinct days on which ANY habit was completed (real activity only).
  -- NOTE: subquery + plain array_agg — DISTINCT aggregates with ORDER BY
  -- positional refs raise 42P10 in Postgres.
  SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_completed_dates
  FROM (
    SELECT DISTINCT hl.log_date::text AS d
    FROM habit_logs hl
    JOIN habits h ON h.id = hl.habit_id
    WHERE h.student_id = v_student_id
      AND hl.completed = TRUE
  ) sub;

  -- Distinct days on which any assignment was completed
  SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_assignment_done_dates
  FROM (
    SELECT DISTINCT (a.completed_at AT TIME ZONE 'utc')::date::text AS d
    FROM assignments a
    WHERE a.student_id = v_student_id
      AND a.status = 'completed'
      AND a.completed_at IS NOT NULL
  ) sub;

  v_days_active := (
    SELECT COUNT(DISTINCT hl.log_date)
    FROM habit_logs hl
    JOIN habits h ON h.id = hl.habit_id
    WHERE h.student_id = v_student_id AND hl.completed = TRUE
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'tracking_start_date', v_start,
    'habit_completion_dates', v_completed_dates,
    'assignment_completion_dates', COALESCE(v_assignment_done_dates, '{}'),
    'study_days', v_days_active
  );
END;
$$;

-- Mentor view of a connected student's consistency snapshot.
-- Authorization reuses is_assigned_student() from migration 003.
CREATE OR REPLACE FUNCTION get_mentor_student_consistency(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_completed_dates TEXT[];
  v_assignment_done_dates TEXT[];
BEGIN
  IF NOT is_assigned_student(p_student_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Student not connected to you.');
  END IF;

  SELECT tracking_start_date INTO v_start FROM students WHERE id = p_student_id;

  SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_completed_dates
  FROM (
    SELECT DISTINCT hl.log_date::text AS d
    FROM habit_logs hl
    JOIN habits h ON h.id = hl.habit_id
    WHERE h.student_id = p_student_id
      AND hl.completed = TRUE
  ) sub;

  SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_assignment_done_dates
  FROM (
    SELECT DISTINCT (a.completed_at AT TIME ZONE 'utc')::date::text AS d
    FROM assignments a
    WHERE a.student_id = p_student_id
      AND a.status = 'completed'
      AND a.completed_at IS NOT NULL
  ) sub;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'tracking_start_date', v_start,
    'habit_completion_dates', v_completed_dates,
    'assignment_completion_dates', COALESCE(v_assignment_done_dates, '{}')
  );
END;
$$;

-- ============================================
-- 5. GRANTS (supabase-authenticated roles can call the RPCs)
-- ============================================
GRANT EXECUTE ON FUNCTION get_my_consistency() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentor_student_consistency(UUID) TO authenticated;

-- ============================================
-- 6. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_tracking_start ON students(tracking_start_date);
CREATE INDEX IF NOT EXISTS idx_assignments_student_status_due
  ON assignments(student_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_completed_at
  ON assignments(student_id, completed_at) WHERE completed_at IS NOT NULL;

-- (Optional) verify
SELECT COUNT(*) AS students_missing_start FROM students WHERE tracking_start_date IS NULL;
