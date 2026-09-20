-- ============================================
-- Momentum - Migration 003: Fix RLS infinite recursion
-- ============================================
-- Problem: policies on `students` query `mentors` and policies on
-- `mentors` query `students`. When evaluating a policy on table A,
-- Postgres must evaluate policies on table B, and vice versa →
-- error 42P17 "infinite recursion detected in policy".
--
-- Fix (Supabase-documented pattern): move the cross-table lookup into
-- SECURITY DEFINER functions. The function body runs with the owner's
-- rights and bypasses RLS on the helper tables, so policy evaluation
-- no longer recurses. auth.uid() still enforces the caller's identity.
--
-- Safe to run multiple times (idempotent).
-- ============================================

-- 1. Helper: is the current user a student? Returns their students.id
CREATE OR REPLACE FUNCTION current_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM students s
  WHERE s.profile_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Helper: is the current user a mentor? Returns their mentors.id
CREATE OR REPLACE FUNCTION current_mentor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id
  FROM mentors m
  WHERE m.profile_id = auth.uid()
  LIMIT 1;
$$;

-- 3. Helper: can the current user (mentor) see this student?
--    Resolves the mentor → student relationship without touching
--    policy-protected tables from inside a policy.
CREATE OR REPLACE FUNCTION is_assigned_student(target_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM mentor_student_relationships msr
    WHERE msr.student_id = target_student_id
      AND msr.mentor_id = current_mentor_id()
  );
$$;

-- 4. Drop ALL existing policies on all app tables (dynamic, so this stays
--    correct even if the live DB was built from a different migration mix —
--    every policy is recreated below in safe form).
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'profiles', 'students', 'mentors', 'mentor_student_relationships',
    'assignments', 'habits', 'habit_logs', 'journal_entries',
    'mentor_remarks', 'assigned_tasks', 'progress'
  ]) LOOP
    FOR pol IN EXECUTE format(
      'SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''',
      tbl
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- 5. Recreate all policies in recursion-safe form using the helpers

-- profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Mentors can view assigned student profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.profile_id = profiles.id
        AND is_assigned_student(s.id)
    )
  );

-- students
CREATE POLICY "Students can view own record"
  ON students FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Service role can insert students"
  ON students FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can update own record"
  ON students FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Mentors can view assigned students"
  ON students FOR SELECT
  USING (is_assigned_student(id));

-- mentors
CREATE POLICY "Mentors can view own record"
  ON mentors FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Service role can insert mentors"
  ON mentors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Mentors can update own record"
  ON mentors FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Students can view assigned mentors"
  ON mentors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM mentor_student_relationships msr
    WHERE msr.mentor_id = mentors.id
      AND msr.student_id = current_student_id()
  ));

-- mentor_student_relationships (helpers make these safe)
CREATE POLICY "Mentors can view own relationships"
  ON mentor_student_relationships FOR SELECT
  USING (mentor_id = current_mentor_id());

CREATE POLICY "Students can view own relationships"
  ON mentor_student_relationships FOR SELECT
  USING (student_id = current_student_id());

CREATE POLICY "Mentors can assign students"
  ON mentor_student_relationships FOR INSERT
  WITH CHECK (mentor_id = current_mentor_id());

CREATE POLICY "Mentors can unassign students"
  ON mentor_student_relationships FOR DELETE
  USING (mentor_id = current_mentor_id());

-- assignments
CREATE POLICY "Students can view own assignments"
  ON assignments FOR SELECT
  USING (student_id = current_student_id());

CREATE POLICY "Students can create own assignments"
  ON assignments FOR INSERT
  WITH CHECK (student_id = current_student_id());

CREATE POLICY "Students can update own assignments"
  ON assignments FOR UPDATE
  USING (student_id = current_student_id());

CREATE POLICY "Students can delete own assignments"
  ON assignments FOR DELETE
  USING (student_id = current_student_id());

CREATE POLICY "Mentors can view assigned student assignments"
  ON assignments FOR SELECT
  USING (is_assigned_student(student_id));

-- habits
CREATE POLICY "Students can view own habits"
  ON habits FOR SELECT
  USING (student_id = current_student_id());

CREATE POLICY "Students can create own habits"
  ON habits FOR INSERT
  WITH CHECK (student_id = current_student_id());

CREATE POLICY "Students can update own habits"
  ON habits FOR UPDATE
  USING (student_id = current_student_id());

CREATE POLICY "Students can delete own habits"
  ON habits FOR DELETE
  USING (student_id = current_student_id());

CREATE POLICY "Mentors can view assigned student habits"
  ON habits FOR SELECT
  USING (is_assigned_student(student_id));

-- habit_logs
CREATE POLICY "Students can view own habit logs"
  ON habit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM habits h
    WHERE h.id = habit_logs.habit_id
      AND h.student_id = current_student_id()
  ));

CREATE POLICY "Students can create own habit logs"
  ON habit_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM habits h
    WHERE h.id = habit_logs.habit_id
      AND h.student_id = current_student_id()
  ));

CREATE POLICY "Students can update own habit logs"
  ON habit_logs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM habits h
    WHERE h.id = habit_logs.habit_id
      AND h.student_id = current_student_id()
  ));

CREATE POLICY "Students can delete own habit logs"
  ON habit_logs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM habits h
    WHERE h.id = habit_logs.habit_id
      AND h.student_id = current_student_id()
  ));

CREATE POLICY "Mentors can view assigned student habit logs"
  ON habit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM habits h
    WHERE h.id = habit_logs.habit_id
      AND is_assigned_student(h.student_id)
  ));

-- journal_entries
CREATE POLICY "Students can view own journal entries"
  ON journal_entries FOR SELECT
  USING (student_id = current_student_id());

CREATE POLICY "Students can create own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (student_id = current_student_id());

CREATE POLICY "Students can update own journal entries"
  ON journal_entries FOR UPDATE
  USING (student_id = current_student_id());

CREATE POLICY "Students can delete own journal entries"
  ON journal_entries FOR DELETE
  USING (student_id = current_student_id());

CREATE POLICY "Mentors can view visible journal entries"
  ON journal_entries FOR SELECT
  USING (
    is_visible_to_mentor = TRUE
    AND is_assigned_student(student_id)
  );

-- mentor_remarks
CREATE POLICY "Students can view own remarks"
  ON mentor_remarks FOR SELECT
  USING (student_id = current_student_id());

CREATE POLICY "Mentors can view own remarks"
  ON mentor_remarks FOR SELECT
  USING (mentor_id = current_mentor_id());

CREATE POLICY "Mentors can create remarks for assigned students"
  ON mentor_remarks FOR INSERT
  WITH CHECK (
    mentor_id = current_mentor_id()
    AND is_assigned_student(student_id)
  );

CREATE POLICY "Mentors can update own remarks"
  ON mentor_remarks FOR UPDATE
  USING (mentor_id = current_mentor_id());

CREATE POLICY "Mentors can delete own remarks"
  ON mentor_remarks FOR DELETE
  USING (mentor_id = current_mentor_id());

-- assigned_tasks
CREATE POLICY "Students can view assigned tasks"
  ON assigned_tasks FOR SELECT
  USING (student_id = current_student_id());

CREATE POLICY "Students can update assigned task status"
  ON assigned_tasks FOR UPDATE
  USING (student_id = current_student_id());

CREATE POLICY "Mentors can view tasks they assigned"
  ON assigned_tasks FOR SELECT
  USING (mentor_id = current_mentor_id());

CREATE POLICY "Mentors can create tasks for assigned students"
  ON assigned_tasks FOR INSERT
  WITH CHECK (
    mentor_id = current_mentor_id()
    AND is_assigned_student(student_id)
  );

CREATE POLICY "Mentors can update tasks they assigned"
  ON assigned_tasks FOR UPDATE
  USING (mentor_id = current_mentor_id());

CREATE POLICY "Mentors can delete tasks they assigned"
  ON assigned_tasks FOR DELETE
  USING (mentor_id = current_mentor_id());

-- progress
CREATE POLICY "Students can view own progress"
  ON progress FOR SELECT
  USING (student_id = current_student_id());

CREATE POLICY "Students can create own progress entries"
  ON progress FOR INSERT
  WITH CHECK (student_id = current_student_id());

CREATE POLICY "Students can update own progress entries"
  ON progress FOR UPDATE
  USING (student_id = current_student_id());

CREATE POLICY "Students can delete own progress entries"
  ON progress FOR DELETE
  USING (student_id = current_student_id());

CREATE POLICY "Mentors can view assigned student progress"
  ON progress FOR SELECT
  USING (is_assigned_student(student_id));

-- ============================================
-- 6. Harden the signup trigger: guarantee uuid generation exists,
--    and use ON CONFLICT so a retried signup can't fail the auth insert.
--    (The repo copy of 001 already has the trigger fix; this makes the
--    live DB converge regardless of which version was applied.)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_usn TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  INSERT INTO profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role,
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF user_role = 'student' THEN
    user_usn := COALESCE(NEW.raw_user_meta_data->>'usn', '');
    IF TRIM(user_usn) = '' THEN
      user_usn := 'USR-' || LEFT(NEW.id::text, 8);
    END IF;

    INSERT INTO students (profile_id, usn, college_email)
    VALUES (NEW.id, user_usn, COALESCE(NEW.email, ''))
    ON CONFLICT (usn) DO NOTHING;
  END IF;

  IF user_role = 'mentor' THEN
    INSERT INTO mentors (profile_id, credentials)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'credentials', ''))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger creation is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
