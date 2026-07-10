-- ═══════════════════════════════════════════════════════════════
-- DRC Minutes of Meeting (MoM) module
-- One MoM per DRC event → update cards → repeatable sub-entries.
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Meeting (one per DRC event) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.mom_meetings (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id       UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL UNIQUE,
  meeting_number TEXT,
  venue          TEXT,
  chairperson    TEXT,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at   TIMESTAMP WITH TIME ZONE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 2. Update card ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mom_updates (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mom_id          UUID REFERENCES public.mom_meetings(id) ON DELETE CASCADE NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('district','avenue','group','club')),
  source_ref      TEXT NOT NULL,        -- e.g. 'DRR', 'Community Service', 'Group 7', club name
  general_updates TEXT,                 -- Section 6 rich-text HTML
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mom_updates_mom ON public.mom_updates(mom_id);

-- ── 3. Completed projects (Section 3) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.mom_completed_projects (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  update_id     UUID REFERENCES public.mom_updates(id) ON DELETE CASCADE NOT NULL,
  project_name  TEXT NOT NULL,
  project_date  DATE,
  description   TEXT,
  outcome       TEXT,
  avenue        TEXT,
  beneficiaries TEXT,
  sort_order    INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mom_completed_update ON public.mom_completed_projects(update_id);

-- ── 4. Upcoming projects (Section 4) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.mom_upcoming_projects (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  update_id            UUID REFERENCES public.mom_updates(id) ON DELETE CASCADE NOT NULL,
  project_name         TEXT NOT NULL,
  project_date         DATE,
  venue                TEXT,
  description          TEXT,
  expected_participants TEXT,
  sort_order           INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mom_upcoming_update ON public.mom_upcoming_projects(update_id);

-- ── 5. Co-host proposals (Section 5) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.mom_cohost_proposals (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  update_id      UUID REFERENCES public.mom_updates(id) ON DELETE CASCADE NOT NULL,
  project_name   TEXT NOT NULL,
  proposal_date  DATE,
  venue          TEXT,
  clubs_needed   INTEGER,
  description    TEXT,
  contact_person TEXT,
  sort_order     INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mom_cohost_update ON public.mom_cohost_proposals(update_id);

-- ── 6. Action items (Section 7) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mom_action_items (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  update_id   UUID REFERENCES public.mom_updates(id) ON DELETE CASCADE NOT NULL,
  task        TEXT NOT NULL,
  assigned_to TEXT,
  due_date    DATE,
  priority    TEXT DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
  status      TEXT DEFAULT 'Open'   CHECK (status IN ('Open','In Progress','Done')),
  sort_order  INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mom_action_update ON public.mom_action_items(update_id);

-- ── RLS (service-role passthrough, same pattern as drc_bookings) ─
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'mom_meetings','mom_updates','mom_completed_projects',
    'mom_upcoming_projects','mom_cohost_proposals','mom_action_items'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "Service role full access" ON public.%I USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;
