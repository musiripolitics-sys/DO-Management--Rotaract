-- ═══════════════════════════════════════════════════════════════
-- Unified role system + universal password auth
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ── a) New columns ───────────────────────────────────────────────
-- General password hash (scrypt "salt:hash"), used by ALL accounts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Single source of truth for access control.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_role TEXT NOT NULL DEFAULT 'member';

-- Enforce the allowed set (drop first so re-runs don't error).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_access_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_access_role_check
  CHECK (access_role IN (
    'super_admin','drr','adrr','drs','adrs','sergeant',
    'president','district_official','secretary','member'
  ));

-- ── b) Migrate existing president/sergeant passwords ─────────────
UPDATE public.profiles
  SET password_hash = president_password_hash
  WHERE password_hash IS NULL
    AND president_password_hash IS NOT NULL;

-- ── c) Backfill access_role from designation ─────────────────────
-- Priority order matters: more specific titles first.
-- "DO - " prefixed roles fall through to district_official unless
-- they carry a leadership/sergeant title.
UPDATE public.profiles SET access_role = CASE
  WHEN designation IS NULL OR TRIM(designation) = ''                       THEN 'member'
  WHEN LOWER(designation) LIKE '%sergeant%'                                THEN 'sergeant'
  WHEN LOWER(designation) LIKE '%associate district rotaract representative%' THEN 'adrr'
  WHEN LOWER(designation) LIKE '%district rotaract representative%'        THEN 'drr'
  WHEN LOWER(designation) LIKE '%drr%'                                     THEN 'drr'
  WHEN LOWER(designation) LIKE '%associate district rotaract secretary%'   THEN 'adrs'
  WHEN LOWER(designation) LIKE '%district rotaract secretary%'             THEN 'drs'
  WHEN LOWER(TRIM(designation)) = 'president'                              THEN 'president'
  WHEN LOWER(TRIM(designation)) = 'secretary'                              THEN 'secretary'
  WHEN LOWER(designation) LIKE 'do -%' OR LOWER(designation) LIKE 'do-%'   THEN 'district_official'
  ELSE 'member'
END;

-- ── Verify ───────────────────────────────────────────────────────
SELECT access_role, COUNT(*) AS total
FROM public.profiles
GROUP BY access_role
ORDER BY total DESC;
