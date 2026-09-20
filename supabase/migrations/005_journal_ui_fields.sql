-- ============================================
-- Momentum - Migration 005: Journal page UI fields (Idempotent)
-- ============================================
-- Adds display/customization columns to `journal_entries` for the
-- new Journal page. Same additive pattern as migration 004.
--
--   is_starred    -> entry marked favorite (star icon in editor)
--   journal_date  -> user-facing "Diary date" (defaults to created date)
--   tags          -> free-form tags, e.g. {gratitude, exams}
--   background    -> landing notebook background key (e.g. 'botanical')
--   paper_style   -> editor paper style key (e.g. 'lined')
--
-- Reuses existing columns (no changes):
--   title               -> entry title
--   content             -> entry body text
--   mood                -> 'great' | 'good' | 'neutral' | 'bad' | 'terrible'
--   is_visible_to_mentor-> FALSE = private/locked, TRUE = shared with mentor
--
-- Purely additive: RLS policies are column-agnostic so no RLS changes.
-- Safe to run multiple times.
-- ============================================

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS journal_date DATE;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS background TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS paper_style TEXT;

-- Backfill so existing entries render correctly
UPDATE journal_entries SET journal_date = (created_at AT TIME ZONE 'utc')::date WHERE journal_date IS NULL;
UPDATE journal_entries SET background = 'botanical' WHERE background IS NULL;
UPDATE journal_entries SET paper_style = 'plain' WHERE paper_style IS NULL;

-- Helpful composite index for the sidebar query (newest diary date first)
CREATE INDEX IF NOT EXISTS idx_journal_entries_student_date
  ON journal_entries(student_id, journal_date DESC, created_at DESC);

-- (Optional) verify
SELECT COUNT(*) AS journal_rows_missing_ui_fields
FROM journal_entries
WHERE journal_date IS NULL OR background IS NULL OR paper_style IS NULL;
