-- ============================================
-- Momentum - Student Study Tracker Portal
-- Migration 002: RLS Policies (Idempotent)
-- ============================================

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Helper: Drop existing policies on a table before recreating
-- This is a reusable block for idempotent policy creation
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
    FOR pol IN EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''', tbl) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role can insert profiles (used by handle_new_user trigger context)
-- The trigger is SECURITY DEFINER so it bypasses RLS, but this is a safety net
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Mentors can view student profiles they are assigned to
CREATE POLICY "Mentors can view assigned student profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      JOIN students s ON s.id = msr.student_id
      WHERE msr.mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
      AND s.profile_id = profiles.id
    )
  );

-- ============================================
-- STUDENTS POLICIES
-- ============================================
-- Students can view their own student record
CREATE POLICY "Students can view own record" ON students
  FOR SELECT USING (profile_id = auth.uid());

-- Service role can insert students (used by handle_new_user trigger context)
CREATE POLICY "Service role can insert students" ON students
  FOR INSERT WITH CHECK (true);

-- Students can update their own record (e.g. USN correction)
CREATE POLICY "Students can update own record" ON students
  FOR UPDATE USING (profile_id = auth.uid());

-- Mentors can view their assigned students
CREATE POLICY "Mentors can view assigned students" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
      AND msr.student_id = students.id
    )
  );

-- ============================================
-- MENTORS POLICIES
-- ============================================
-- Mentors can view their own mentor record
CREATE POLICY "Mentors can view own record" ON mentors
  FOR SELECT USING (profile_id = auth.uid());

-- Service role can insert mentors (used by handle_new_user trigger context)
CREATE POLICY "Service role can insert mentors" ON mentors
  FOR INSERT WITH CHECK (true);

-- Mentors can update their own record
CREATE POLICY "Mentors can update own record" ON mentors
  FOR UPDATE USING (profile_id = auth.uid());

-- Students can view mentors assigned to them
CREATE POLICY "Students can view assigned mentors" ON mentors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
      AND msr.mentor_id = mentors.id
    )
  );

-- ============================================
-- MENTOR-STUDENT RELATIONSHIPS POLICIES
-- ============================================
-- Mentors can view their relationships
CREATE POLICY "Mentors can view own relationships" ON mentor_student_relationships
  FOR SELECT USING (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- Students can view their relationships
CREATE POLICY "Students can view own relationships" ON mentor_student_relationships
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Mentors can create relationships (assign students)
CREATE POLICY "Mentors can assign students" ON mentor_student_relationships
  FOR INSERT WITH CHECK (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- Mentors can remove relationships (unassign students)
CREATE POLICY "Mentors can unassign students" ON mentor_student_relationships
  FOR DELETE USING (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- ============================================
-- ASSIGNMENTS POLICIES
-- ============================================
-- Students can view their own assignments
CREATE POLICY "Students can view own assignments" ON assignments
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Students can create their own assignments
CREATE POLICY "Students can create own assignments" ON assignments
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Students can update their own assignments
CREATE POLICY "Students can update own assignments" ON assignments
  FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Students can delete their own assignments
CREATE POLICY "Students can delete own assignments" ON assignments
  FOR DELETE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Mentors can view assignments of assigned students
CREATE POLICY "Mentors can view assigned student assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
      AND msr.student_id = assignments.student_id
    )
  );

-- ============================================
-- HABITS POLICIES
-- ============================================
-- Students can manage their own habits
CREATE POLICY "Students can view own habits" ON habits
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can create own habits" ON habits
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can update own habits" ON habits
  FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can delete own habits" ON habits
  FOR DELETE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Mentors can view habits of assigned students
CREATE POLICY "Mentors can view assigned student habits" ON habits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
      AND msr.student_id = habits.student_id
    )
  );

-- ============================================
-- HABIT LOGS POLICIES
-- ============================================
-- Students can manage their own habit logs
CREATE POLICY "Students can view own habit logs" ON habit_logs
  FOR SELECT USING (
    habit_id IN (
      SELECT h.id FROM habits h
      WHERE h.student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Students can create own habit logs" ON habit_logs
  FOR INSERT WITH CHECK (
    habit_id IN (
      SELECT h.id FROM habits h
      WHERE h.student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Students can update own habit logs" ON habit_logs
  FOR UPDATE USING (
    habit_id IN (
      SELECT h.id FROM habits h
      WHERE h.student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Students can delete own habit logs" ON habit_logs
  FOR DELETE USING (
    habit_id IN (
      SELECT h.id FROM habits h
      WHERE h.student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
    )
  );

-- Mentors can view habit logs of assigned students
CREATE POLICY "Mentors can view assigned student habit logs" ON habit_logs
  FOR SELECT USING (
    habit_id IN (
      SELECT h.id FROM habits h
      WHERE EXISTS (
        SELECT 1 FROM mentor_student_relationships msr
        WHERE msr.mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
        AND msr.student_id = h.student_id
      )
    )
  );

-- ============================================
-- JOURNAL ENTRIES POLICIES
-- ============================================
-- Students can manage their own journal entries
CREATE POLICY "Students can view own journal entries" ON journal_entries
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can create own journal entries" ON journal_entries
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can update own journal entries" ON journal_entries
  FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can delete own journal entries" ON journal_entries
  FOR DELETE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Mentors can ONLY view journal entries that are explicitly marked as visible
CREATE POLICY "Mentors can view visible journal entries" ON journal_entries
  FOR SELECT USING (
    is_visible_to_mentor = TRUE
    AND EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
      AND msr.student_id = journal_entries.student_id
    )
  );

-- ============================================
-- MENTOR REMARKS POLICIES
-- ============================================
-- Students can view remarks about themselves
CREATE POLICY "Students can view own remarks" ON mentor_remarks
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Mentors can view remarks they created
CREATE POLICY "Mentors can view own remarks" ON mentor_remarks
  FOR SELECT USING (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- Mentors can create remarks for assigned students
CREATE POLICY "Mentors can create remarks for assigned students" ON mentor_remarks
  FOR INSERT WITH CHECK (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.mentor_id = mentor_remarks.mentor_id
      AND msr.student_id = mentor_remarks.student_id
    )
  );

-- Mentors can update their own remarks
CREATE POLICY "Mentors can update own remarks" ON mentor_remarks
  FOR UPDATE USING (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- Mentors can delete their own remarks
CREATE POLICY "Mentors can delete own remarks" ON mentor_remarks
  FOR DELETE USING (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- ============================================
-- ASSIGNED TASKS POLICIES
-- ============================================
-- Students can view tasks assigned to them
CREATE POLICY "Students can view assigned tasks" ON assigned_tasks
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Students can update status of tasks assigned to them
CREATE POLICY "Students can update assigned task status" ON assigned_tasks
  FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Mentors can view tasks they assigned
CREATE POLICY "Mentors can view tasks they assigned" ON assigned_tasks
  FOR SELECT USING (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- Mentors can create tasks for assigned students
CREATE POLICY "Mentors can create tasks for assigned students" ON assigned_tasks
  FOR INSERT WITH CHECK (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.mentor_id = assigned_tasks.mentor_id
      AND msr.student_id = assigned_tasks.student_id
    )
  );

-- Mentors can update tasks they assigned
CREATE POLICY "Mentors can update tasks they assigned" ON assigned_tasks
  FOR UPDATE USING (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- Mentors can delete tasks they assigned
CREATE POLICY "Mentors can delete tasks they assigned" ON assigned_tasks
  FOR DELETE USING (
    mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
  );

-- ============================================
-- PROGRESS POLICIES
-- ============================================
-- Students can view their own progress
CREATE POLICY "Students can view own progress" ON progress
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Students can create their own progress entries
CREATE POLICY "Students can create own progress entries" ON progress
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Students can update their own progress entries
CREATE POLICY "Students can update own progress entries" ON progress
  FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Students can delete their own progress entries
CREATE POLICY "Students can delete own progress entries" ON progress
  FOR DELETE USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Mentors can view progress of assigned students
CREATE POLICY "Mentors can view assigned student progress" ON progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mentor_student_relationships msr
      WHERE msr.mentor_id IN (SELECT id FROM mentors WHERE profile_id = auth.uid())
      AND msr.student_id = progress.student_id
    )
  );
