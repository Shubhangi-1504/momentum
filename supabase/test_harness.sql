-- ============================================
-- LOCAL-ONLY TEST HARNESS (not a migration)
-- Emulates a minimal Supabase environment on plain Postgres so migration
-- 008 can be verified locally before running it in Supabase SQL Editor.
--
--   psql "localtest" -v ON_ERROR_STOP=1 -1 -f supabase/test_harness.sql
--   then run supabase/test_harness_tests.sql as described in it.
--
-- Provides: uuid extension, auth.uid(), auth.role(), roles anon/
-- authenticated/service_role, and the base schema from migrations 001-007.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- auth schema stub -------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb
);
-- The migrations install an on-auth-user-created trigger that mirrors
-- Supabase's signup flow; in the harness we seed auth.users + profiles
-- manually, so disable it.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

-- ---- Supabase roles ----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- ---- Base schema: run migrations 001-007 -------------------------------
\i supabase/migrations/001_initial_schema.sql
\i supabase/migrations/002_rls_policies.sql
\i supabase/migrations/003_fix_rls_recursion.sql
\i supabase/migrations/004_habit_ui_fields.sql
\i supabase/migrations/005_journal_ui_fields.sql
\i supabase/migrations/006_mentor_connection_flow.sql
\i supabase/migrations/007_consistency_system.sql

-- 003 reinstalls the signup trigger; harness seeds users manually, so
-- disable it AFTER all migrations have loaded.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ---- Supabase default privileges --------------------------------------
-- PostgREST connections run as anon/authenticated with these grants;
-- mirror them so RLS (not missing privileges) is what we're testing.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- Supabase also grants these on its auth schema (policies call auth.uid()).
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated;
