-- ═══════════════════════════════════════════════════════════════
-- Secretary Module — monthly club project reports
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Each row is one completed project a club secretary reports for a
-- given month. Every month by the 5th, secretaries upload LAST
-- month's completed projects. DRS/ADRS view them district-wide.
-- Images are NOT stored — a Google Drive folder link is captured.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.club_projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  submitted_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- First day of the month being reported (e.g. 2026-06-01 for June).
  report_month     DATE NOT NULL,

  project_name     TEXT NOT NULL,
  project_date     DATE,                 -- the day the project happened
  avenue           TEXT,                 -- Rotaract avenue
  venue            TEXT,                 -- where it happened
  description      TEXT,
  outcome          TEXT,                 -- impact / result
  beneficiaries    INTEGER,              -- people served
  volunteers       INTEGER,              -- members involved
  drive_folder_url TEXT,                 -- Google Drive images folder link

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_projects_club       ON public.club_projects(club_id);
CREATE INDEX IF NOT EXISTS idx_club_projects_month      ON public.club_projects(report_month);
CREATE INDEX IF NOT EXISTS idx_club_projects_club_month ON public.club_projects(club_id, report_month);

-- Keep updated_at fresh on edits.
CREATE OR REPLACE FUNCTION public.touch_club_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_club_projects_updated_at ON public.club_projects;
CREATE TRIGGER trg_club_projects_updated_at
  BEFORE UPDATE ON public.club_projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_club_projects_updated_at();

-- RLS passthrough — the app talks to this table only via the
-- service-role client, which enforces access in the API layer
-- (secretary = own club; DRS/ADRS/admin = read all). Mirrors clubs.
ALTER TABLE public.club_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.club_projects;
CREATE POLICY "Service role full access" ON public.club_projects USING (true) WITH CHECK (true);

-- ── Verify ───────────────────────────────────────────────────────
SELECT COUNT(*) AS club_projects_rows FROM public.club_projects;
