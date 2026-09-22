-- ============================================
-- Momentum - Migration 007 PATCH (RPC aggregate fix, 42P10)
-- ============================================
-- If you already ran 007_consistency_system.sql, run THIS file next in the
-- Supabase SQL Editor. It replaces the two consistency RPCs with a
-- Postgres-safe form.
--
-- Error fixed:
--   42P10: in an aggregate with DISTINCT, ORDER BY expressions must
--          appear in argument list
--
-- Cause: array_agg(DISTINCT x ORDER BY 1) is invalid when the ORDER BY
-- doesn't match the DISTINCT argument. Rewritten as subquery + plain
-- array_agg, which is equivalent and always valid.
--
-- Additive/idempotent: replaces function bodies only. No tables, RLS,
-- triggers or data are touched. Safe to run multiple times.
-- ============================================

-- ============================================
-- 1. Student's own consistency snapshot
-- ============================================
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

  -- Distinct days on which ANY habit was completed (real activity only)
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

-- ============================================
-- 2. Mentor view (read-only, relationship-checked)
-- ============================================
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
-- 3. Keep the grants (idempotent)
-- ============================================
GRANT EXECUTE ON FUNCTION get_my_consistency() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentor_student_consistency(UUID) TO authenticated;

-- Done. The Mentor Student Details page will now load consistency data.
