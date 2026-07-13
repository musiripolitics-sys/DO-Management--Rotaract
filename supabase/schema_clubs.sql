-- ═══════════════════════════════════════════════════════════════
-- Club Management — Phase 1
-- Creates the clubs table, seeds college + community clubs, links
-- every member via club_id, and adds officer + member fields.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Clubs table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clubs (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name               TEXT NOT NULL UNIQUE,
  short_name         TEXT,
  club_type          TEXT NOT NULL DEFAULT 'community' CHECK (club_type IN ('college','community')),
  parent_rotary_club TEXT,
  charter_number     TEXT,
  charter_date       DATE,
  institution_name   TEXT,
  logo_url           TEXT,
  banner_url         TEXT,
  description        TEXT,
  email              TEXT,
  phone              TEXT,
  meeting_venue      TEXT,
  meeting_day        TEXT,
  meeting_time       TEXT,
  website            TEXT,
  instagram          TEXT,
  facebook           TEXT,
  linkedin           TEXT,
  x_url              TEXT,
  youtube            TEXT,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.clubs;
CREATE POLICY "Service role full access" ON public.clubs USING (true) WITH CHECK (true);

-- ── 2. Seed — College clubs (institution_name = the college) ─────
INSERT INTO public.clubs (name, club_type, institution_name)
VALUES
  ('Alpha Arts and Science College','college','Alpha Arts and Science College'),
  ('Don Bosco Arts and Science College','college','Don Bosco Arts and Science College'),
  ('Hindustan University','college','Hindustan University'),
  ('Loyola Institute of Technology','college','Loyola Institute of Technology'),
  ('Madras Institute of Hotel Management and Catering Technology','college','Madras Institute of Hotel Management and Catering Technology'),
  ('Saveetha College of Nursing','college','Saveetha College of Nursing'),
  ('Sree Balaji Dental College and Hospital','college','Sree Balaji Dental College and Hospital'),
  ('Kandasamy Naidu College','college','Kandasamy Naidu College'),
  ('KCG College of Technology','college','KCG College of Technology'),
  ('LICET','college','LICET'),
  ('Madras Institute of Technology','college','Madras Institute of Technology'),
  ('Meenakshi College of Nursing','college','Meenakshi College of Nursing'),
  ('Shree Chandraprabhu Jain College','college','Shree Chandraprabhu Jain College'),
  ('Shri Krishnaswamy College For Women','college','Shri Krishnaswamy College For Women'),
  ('Rajalakshmi Engineering College','college','Rajalakshmi Engineering College'),
  ('Saveetha School of Law','college','Saveetha School of Law'),
  ('Soka Ikeda College of Arts and Science for Women','college','Soka Ikeda College of Arts and Science for Women'),
  ('Sri Lalithambigai Medical College & Hospital','college','Sri Lalithambigai Medical College & Hospital'),
  ('SRIHER','college','SRIHER'),
  ('Tagore College of Arts and Science','college','Tagore College of Arts and Science'),
  ('Billroth College of Nursing','college','Billroth College of Nursing'),
  ('Crescent','college','Crescent'),
  ('Dhanraj Baid Jain College','college','Dhanraj Baid Jain College'),
  ('Government Yoga and Naturopathy Medical College','college','Government Yoga and Naturopathy Medical College'),
  ('M.N.M. Jain Engineering College','college','M.N.M. Jain Engineering College'),
  ('Saveetha College of Physiotherapy','college','Saveetha College of Physiotherapy'),
  ('Sri Kannika Parameswari College of Arts & Science','college','Sri Kannika Parameswari College of Arts & Science'),
  ('Government Arts and Science College Dr. R.K. Nagar','college','Government Arts and Science College Dr. R.K. Nagar'),
  ('MGR University','college','MGR University'),
  ('Presidency College','college','Presidency College'),
  ('Rajalakshmi Institute of Technology','college','Rajalakshmi Institute of Technology'),
  ('SRM IST FSH Ramapuram','college','SRM IST FSH Ramapuram'),
  ('Stanley Medical College','college','Stanley Medical College'),
  ('Anand Institute of Higher Technology','college','Anand Institute of Higher Technology'),
  ('Chellammal Women''s College','college','Chellammal Women''s College'),
  ('MEASI Institute of Management','college','MEASI Institute of Management'),
  ('Patrician College of Arts and Science','college','Patrician College of Arts and Science'),
  ('Saveetha College of Allied Health Sciences','college','Saveetha College of Allied Health Sciences'),
  ('SRM IST FSH Vadapalani','college','SRM IST FSH Vadapalani'),
  ('St. Peter''s Institute of Higher Education and Research','college','St. Peter''s Institute of Higher Education and Research'),
  ('Mar Gregorios College of Arts & Science','college','Mar Gregorios College of Arts & Science'),
  ('Prince Shri Balaji Arts & Science College','college','Prince Shri Balaji Arts & Science College'),
  ('Prince Shri Venkateshwara Padmavathy Engineering College','college','Prince Shri Venkateshwara Padmavathy Engineering College'),
  ('R.K.M. Vivekananda College','college','R.K.M. Vivekananda College'),
  ('Sathyabama University','college','Sathyabama University'),
  ('Saveetha Medical College','college','Saveetha Medical College'),
  ('SIMATS Engineering','college','SIMATS Engineering'),
  ('Madras School of Social Work','college','Madras School of Social Work')
ON CONFLICT (name) DO NOTHING;

-- ── 3. Seed — Community clubs ────────────────────────────────────
INSERT INTO public.clubs (name, club_type)
VALUES
  ('Akash','community'),
  ('Chennai Angels','community'),
  ('Chennai Towers','community'),
  ('Chennai Comrades','community'),
  ('Madras Mount','community'),
  ('Phoenix','community'),
  ('Chennai ANVI','community'),
  ('Green Galaxy','community'),
  ('Guindy','community'),
  ('Chennai Asgard','community'),
  ('Dexterous','community'),
  ('Zenith','community'),
  ('Alandur Incredibles','community'),
  ('Madras Cosmos','community'),
  ('Madras T. Nagar','community'),
  ('Chennai Amethyst','community'),
  ('Chennai Radiance Raisers','community'),
  ('Sahas','community'),
  ('Chennai Capital','community'),
  ('Chennai Celebrities','community'),
  ('East Coast Chennai','community'),
  ('Madras Midtown','community')
ON CONFLICT (name) DO NOTHING;

-- ── 4. Auto-create clubs for any existing member club_name not seeded
--     (guarantees a home for every member — no orphans). These are
--     flagged inactive so an admin can review / merge duplicates.
INSERT INTO public.clubs (name, club_type, status)
SELECT DISTINCT TRIM(p.club_name), 'community', 'inactive'
FROM public.profiles p
WHERE p.club_name IS NOT NULL
  AND TRIM(p.club_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE LOWER(c.name) = LOWER(TRIM(p.club_name))
  )
ON CONFLICT (name) DO NOTHING;

-- ── 5. Member columns on profiles ────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS club_position TEXT NOT NULL DEFAULT 'member'
    CHECK (club_position IN ('president','secretary','treasurer','member'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avenue TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rotary_year TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS attendance_percentage NUMERIC;

-- ── 6. Backfill club_id (normalized name match) ──────────────────
UPDATE public.profiles p
SET club_id = c.id
FROM public.clubs c
WHERE p.club_id IS NULL
  AND p.club_name IS NOT NULL
  AND LOWER(TRIM(p.club_name)) = LOWER(c.name);

-- ── 7. Backfill club_position from access_role ───────────────────
UPDATE public.profiles SET club_position = 'president'
  WHERE access_role = 'president' AND club_position = 'member';
UPDATE public.profiles SET club_position = 'secretary'
  WHERE access_role = 'secretary' AND club_position = 'member';

-- ── Verify ───────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.clubs)                                          AS total_clubs,
  (SELECT COUNT(*) FROM public.clubs WHERE club_type = 'college')              AS college_clubs,
  (SELECT COUNT(*) FROM public.clubs WHERE club_type = 'community')            AS community_clubs,
  (SELECT COUNT(*) FROM public.profiles WHERE club_name IS NOT NULL AND club_id IS NULL) AS unlinked_members,
  (SELECT COUNT(*) FROM public.profiles WHERE club_position <> 'member')       AS officers;

-- ── 8. OPTIONAL — drop the legacy text column once the app is
--     confirmed working on club_id (the code no longer reads it).
--     Uncomment and run separately after verifying in production:
-- ALTER TABLE public.profiles DROP COLUMN club_name;
