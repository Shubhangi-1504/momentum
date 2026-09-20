-- ============================================
-- Momentum - Migration 004: Habit Tracker UI fields (Idempotent)
-- ============================================
-- Adds three display columns to `habits` for the Habit Tracker page:
--   icon     -> lucide icon id chosen by the student (e.g. 'dumbbell')
--   color    -> pastel palette key (e.g. 'green', 'mint', 'coral')
--   category -> habit category label (e.g. 'Health', 'Study')
--
-- Reuses existing columns (no changes):
--   description      -> habit notes
--   target_count     -> target days per week (1-7)
--   frequency        -> stays 'daily' ( informational)
--
-- Purely additive: no RLS changes required (row-level policies are
-- column-agnostic). Safe to run multiple times.
-- ============================================

ALTER TABLE habits ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill defaults so existing habits render with a sensible look
UPDATE habits SET icon = 'leaf' WHERE icon IS NULL;
UPDATE habits SET color = 'green' WHERE color IS NULL;
UPDATE habits SET category = 'Other' WHERE category IS NULL;

-- (Optional) verify
SELECT COUNT(*) AS habits_missing_ui_fields
FROM habits
WHERE icon IS NULL OR color IS NULL OR category IS NULL;
