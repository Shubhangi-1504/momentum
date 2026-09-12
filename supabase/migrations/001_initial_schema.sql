-- ============================================
-- Momentum - Student Study Tracker Portal
-- Migration 001: Initial Schema (Idempotent)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (Base user data)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'mentor')),
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. STUDENTS TABLE (Student-specific data)
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  usn TEXT UNIQUE NOT NULL,
  college_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. MENTORS TABLE (Mentor-specific data)
-- ============================================
CREATE TABLE IF NOT EXISTS mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credentials TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. MENTOR-STUDENT RELATIONSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS mentor_student_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mentor_id, student_id)
);

-- ============================================
-- 5. ASSIGNMENTS TABLE (Study tasks/work)
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. HABITS TABLE (Trackable habits)
-- ============================================
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  target_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. HABIT LOGS TABLE (Daily habit tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, log_date)
);

-- ============================================
-- 8. JOURNAL ENTRIES TABLE (Private student journals)
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'bad', 'terrible')),
  is_visible_to_mentor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. MENTOR REMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mentor_remarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('general', 'academic', 'behavior', 'improvement', 'achievement')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. TASKS ASSIGNED BY MENTORS
-- ============================================
CREATE TABLE IF NOT EXISTS assigned_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 11. PROGRESS TABLE (Overall progress tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  assignments_completed INTEGER DEFAULT 0,
  assignments_total INTEGER DEFAULT 0,
  habits_completed INTEGER DEFAULT 0,
  habits_total INTEGER DEFAULT 0,
  study_hours DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- ============================================
-- INDEXES for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_usn ON students(usn);
CREATE INDEX IF NOT EXISTS idx_mentors_profile_id ON mentors(profile_id);
CREATE INDEX IF NOT EXISTS idx_mentor_student_relationships_mentor_id ON mentor_student_relationships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_student_relationships_student_id ON mentor_student_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_habits_student_id ON habits(student_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_log_date ON habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_student_id ON journal_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_visible ON journal_entries(is_visible_to_mentor) WHERE is_visible_to_mentor = TRUE;
CREATE INDEX IF NOT EXISTS idx_mentor_remarks_student_id ON mentor_remarks(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_remarks_mentor_id ON mentor_remarks(mentor_id);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_student_id ON assigned_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_mentor_id ON assigned_tasks(mentor_id);
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_date ON progress(date);

-- ============================================
-- FUNCTION: Auto-update updated_at column
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (drop first to be idempotent)
DO $$
BEGIN
  -- profiles
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- students
  DROP TRIGGER IF EXISTS update_students_updated_at ON students;
  CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- mentors
  DROP TRIGGER IF EXISTS update_mentors_updated_at ON mentors;
  CREATE TRIGGER update_mentors_updated_at
    BEFORE UPDATE ON mentors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- assignments
  DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
  CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- habits
  DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
  CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- journal_entries
  DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
  CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- mentor_remarks
  DROP TRIGGER IF EXISTS update_mentor_remarks_updated_at ON mentor_remarks;
  CREATE TRIGGER update_mentor_remarks_updated_at
    BEFORE UPDATE ON mentor_remarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- assigned_tasks
  DROP TRIGGER IF EXISTS update_assigned_tasks_updated_at ON assigned_tasks;
  CREATE TRIGGER update_assigned_tasks_updated_at
    BEFORE UPDATE ON assigned_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_usn TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- Create profile record
  INSERT INTO profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role,
    NEW.email
  );

  -- If student, create student record
  IF user_role = 'student' THEN
    user_usn := NEW.raw_user_meta_data->>'usn';
    -- Generate a fallback USN if empty or null to avoid UNIQUE constraint violations
    IF user_usn IS NULL OR TRIM(user_usn) = '' THEN
      user_usn := 'USR-' || SUBSTRING(NEW.id::text, 1, 8);
    END IF;

    INSERT INTO students (profile_id, usn, college_email)
    VALUES (NEW.id, user_usn, NEW.email);
  END IF;

  -- If mentor, create mentor record
  IF user_role = 'mentor' THEN
    INSERT INTO mentors (profile_id, credentials)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'credentials', ''));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
