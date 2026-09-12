-- ============================================
-- ONE-TIME FIX: Backfill missing profiles for existing users
-- Run this in Supabase SQL Editor AFTER applying migrations 001 and 002
-- This script is idempotent — safe to run multiple times.
-- ============================================

-- 1. Backfill profiles for any auth users missing a profile row
INSERT INTO profiles (id, full_name, role, email)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'role', 'student'),
  au.email
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Backfill student records for student profiles missing a students row
INSERT INTO students (profile_id, usn, college_email)
SELECT
  p.id,
  COALESCE(
    (SELECT au.raw_user_meta_data->>'usn' FROM auth.users au WHERE au.id = p.id),
    'USR-' || SUBSTRING(p.id::text, 1, 8)
  ),
  p.email
FROM profiles p
LEFT JOIN students s ON s.profile_id = p.id
WHERE p.role = 'student' AND s.id IS NULL
ON CONFLICT (usn) DO NOTHING;

-- 3. Backfill mentor records for mentor profiles missing a mentors row
INSERT INTO mentors (profile_id, credentials)
SELECT
  p.id,
  COALESCE(
    (SELECT au.raw_user_meta_data->>'credentials' FROM auth.users au WHERE au.id = p.id),
    ''
  )
FROM profiles p
LEFT JOIN mentors m ON m.profile_id = p.id
WHERE p.role = 'mentor' AND m.id IS NULL
ON CONFLICT DO NOTHING;

-- 4. Verify: show all auth users and whether they have profiles
SELECT
  au.email,
  au.raw_user_meta_data->>'role' AS intended_role,
  p.id IS NOT NULL AS has_profile,
  s.id IS NOT NULL AS has_student,
  m.id IS NOT NULL AS has_mentor
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN students s ON s.profile_id = au.id
LEFT JOIN mentors m ON m.profile_id = au.id;
