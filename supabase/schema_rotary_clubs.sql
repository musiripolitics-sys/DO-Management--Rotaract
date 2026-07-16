-- ═══════════════════════════════════════════════════════════════
-- Rotary official club cache (my.rotary.org districtClubsSearch)
-- Mirror of the live Rotary API so the site reads fast, resilient
-- local data. A sync job (POST /api/rotary/sync) refreshes this when
-- a valid my.rotary.org session cookie is available.
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rotary_clubs (
  club_id            UUID PRIMARY KEY,          -- Rotary "clubId"
  nf_id              TEXT,                       -- official Rotary Club ID (e.g. "88931")
  nf_key             UUID,                       -- Rotary "nfKey"
  club_name          TEXT NOT NULL,
  club_type          TEXT,                       -- e.g. "Rotaract Club"
  city               TEXT,
  state              TEXT,
  country            TEXT,
  active_members     INTEGER DEFAULT 0,          -- live member count from Rotary
  assistant_governor TEXT,
  ag_id              TEXT,
  synced_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rotary_clubs_name ON public.rotary_clubs(club_name);
CREATE INDEX IF NOT EXISTS idx_rotary_clubs_nfid ON public.rotary_clubs(nf_id);

-- ── RLS (service-role passthrough, same pattern as mom / clubs) ──
ALTER TABLE public.rotary_clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.rotary_clubs;
CREATE POLICY "Service role full access" ON public.rotary_clubs USING (true) WITH CHECK (true);
