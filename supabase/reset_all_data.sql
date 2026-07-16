-- ═══════════════════════════════════════════════════════════════
-- ⚠️  FULL DATA RESET — DESTRUCTIVE. Wipes ALL rows in every table.
--
-- Empties every existing public table AND every Supabase auth login,
-- so the database is a blank slate ready for a fresh member import.
--
-- Structure (schemas, columns, RLS, triggers) is PRESERVED — only
-- rows are removed. The super admin is env-based (Kumar), not stored
-- in the DB, so admin access survives this reset.
--
-- This version SKIPS tables that don't exist, so it works whether or
-- not every schema file has been run. It is one transaction: it
-- either fully succeeds or rolls back untouched.
--
-- ‼️  TAKE A BACKUP FIRST. auth.users deletion is irreversible.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  t text;
  -- Every table this app may have created, across all schema files.
  -- CASCADE makes order irrelevant; to_regclass skips missing ones.
  candidates text[] := ARRAY[
    'attendance',
    'event_feedback',
    'drc_bookings',
    'club_projects',
    'member_registrations',
    'mom_action_items',
    'mom_completed_projects',
    'mom_upcoming_projects',
    'mom_cohost_proposals',
    'mom_updates',
    'mom_meetings',
    'events',
    'clubs',
    'profiles'
  ];
BEGIN
  FOREACH t IN ARRAY candidates LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
      RAISE NOTICE 'truncated %', t;
    ELSE
      RAISE NOTICE 'skipped (missing) %', t;
    END IF;
  END LOOP;
END $$;

-- profiles are now empty; remove the orphaned auth logins.
-- (Cascades to auth.identities / auth.sessions automatically.)
DELETE FROM auth.users;

COMMIT;

-- ── Verify — profiles/auth should be 0; run counts on what exists ──
SELECT
  (SELECT count(*) FROM auth.users)      AS auth_users,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.clubs)    AS clubs,
  (SELECT count(*) FROM public.events)   AS events;
