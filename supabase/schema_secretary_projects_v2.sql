-- ═══════════════════════════════════════════════════════════════
-- Secretary project reports — enhanced fields (v2).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Adds the richer project-report fields (group, start/end dates,
-- chairperson/secretary, man-hours, areas of focus, social link)
-- plus joint-project capture. Existing columns are untouched;
-- project_date now represents the project START date.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.club_projects
  ADD COLUMN IF NOT EXISTS group_no          TEXT,
  ADD COLUMN IF NOT EXISTS end_date          DATE,
  ADD COLUMN IF NOT EXISTS chairperson_name  TEXT,
  ADD COLUMN IF NOT EXISTS secretary_name    TEXT,
  ADD COLUMN IF NOT EXISTS man_hours         INTEGER,
  ADD COLUMN IF NOT EXISTS areas_of_focus    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS social_media_url  TEXT,
  ADD COLUMN IF NOT EXISTS is_joint_project  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS joint_partner     TEXT;

COMMENT ON COLUMN public.club_projects.project_date IS 'Project START date (report_month is derived from it).';
COMMENT ON COLUMN public.club_projects.end_date IS 'Project END date (optional; single-day projects leave it null).';
COMMENT ON COLUMN public.club_projects.areas_of_focus IS 'Rotary areas of focus this project addressed.';
COMMENT ON COLUMN public.club_projects.joint_partner IS 'Host/Co-host club name with district number, when is_joint_project.';
