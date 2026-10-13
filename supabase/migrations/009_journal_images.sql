-- ============================================
-- Momentum - Migration 009: Journal photos
-- ============================================
-- Run once in the Supabase SQL editor; review policies before applying.
--
-- Adds:
--   1. journal_entries.images jsonb (array of { path, name, size, w, h })
--   2. PRIVATE storage bucket 'journal-images' (5 MB, JPEG/PNG/WebP)
--   3. storage.objects policies:
--        - owner (the student) INSERT/SELECT/DELETE in their own
--          auth.uid()-named first folder
--        - assigned mentor SELECT — but ONLY for photos that are
--          attached to an entry the mentor may already see via the
--          journal_entries mentor read policy
--          ("Mentors can view visible journal entries", migration 003:
--          is_visible_to_mentor = TRUE AND is_assigned_student(student_id)).
--
-- Reuses the 003 helper is_assigned_student(target_student_id UUID).
-- Purely additive: no existing RLS policy is weakened or replaced.
-- Safe to re-run (drop policy if exists before each create).
-- ============================================

-- 1. images column
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. PRIVATE storage bucket (no public URLs, ever)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-images',
  'journal-images',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. storage.objects policies (bucket_id = 'journal-images')

-- 3a. Owner (student) INSERT — first folder must be their auth.uid()
DROP POLICY IF EXISTS "Journal images: owner inserts own photos" ON storage.objects;
CREATE POLICY "Journal images: owner inserts own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'journal-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3b. Owner (student) SELECT — their own folder
DROP POLICY IF EXISTS "Journal images: owner reads own photos" ON storage.objects;
CREATE POLICY "Journal images: owner reads own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'journal-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3c. Owner (student) DELETE — their own folder (photo removal + entry cleanup)
DROP POLICY IF EXISTS "Journal images: owner deletes own photos" ON storage.objects;
CREATE POLICY "Journal images: owner deletes own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'journal-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3d. Assigned mentor SELECT — mirrors the journal_entries mentor read
-- rule, tightened further by a jsonb containment check so a mentor can
-- only resolve photos that are STILL attached to a shared entry.
DROP POLICY IF EXISTS "Journal images: mentor reads shared entry photos" ON storage.objects;
CREATE POLICY "Journal images: mentor reads shared entry photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'journal-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM public.journal_entries je
      WHERE je.is_visible_to_mentor = TRUE
        AND is_assigned_student(je.student_id)
        AND je.images @> jsonb_build_array(
          jsonb_build_object('path', storage.objects.name)
        )
    )
  );
