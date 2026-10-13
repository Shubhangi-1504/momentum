-- ============================================
-- Momentum - Migration 009: Notes (Phase 1, Idempotent)
-- ============================================
-- Purely additive. No existing tables, policies, or triggers modified.
--
-- 1. notes - private per-user notes (students AND mentors)
--       user_id references profiles.id; every user sees ONLY their own rows.
--       note_type: 'normal' | 'checklist' | 'code'; language is only
--       meaningful for code notes (nullable, populated in Phase 2).
-- 2. RLS - strict ownership: SELECT/INSERT/UPDATE/DELETE all require
--       user_id = auth.uid(). Mentors can NOT see student notes and
--       students can NOT see mentor notes (no cross-role policies).
-- 3. updated_at is maintained by the existing update_updated_at_column()
--       trigger from migration 001.
--
-- Safe to run multiple times.
-- ============================================

-- ============================================
-- 1. NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  note_type TEXT NOT NULL DEFAULT 'normal' CHECK (note_type IN ('normal', 'checklist', 'code')),
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at DESC);

-- ============================================
-- 2. ROW LEVEL SECURITY (strict per-user ownership)
-- ============================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own notes" ON notes;
CREATE POLICY "Users can create own notes"
  ON notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 3. updated_at MAINTENANCE (existing 001 helper)
-- ============================================
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Done. Idempotent: safe to re-run.
-- ============================================
