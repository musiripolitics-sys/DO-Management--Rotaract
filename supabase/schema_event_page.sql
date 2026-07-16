-- ────────────────────────────────────────────────────────────────
-- Event landing pages: agenda + speakers + event logo
-- Run this in the Supabase SQL editor. Safe to re-run.
-- ────────────────────────────────────────────────────────────────

-- Events get a logo shown in the landing-page hero
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Agenda items, ordered by sort_order
CREATE TABLE IF NOT EXISTS public.event_agenda (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  time_label TEXT,          -- display label, e.g. '09:00 AM'
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_agenda_event ON public.event_agenda(event_id, sort_order);

ALTER TABLE public.event_agenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agenda viewable by everyone" ON public.event_agenda;
CREATE POLICY "Agenda viewable by everyone" ON public.event_agenda
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role writes agenda" ON public.event_agenda;
CREATE POLICY "Service role writes agenda" ON public.event_agenda
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Speakers, ordered by sort_order
CREATE TABLE IF NOT EXISTS public.event_speakers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  designation TEXT,         -- e.g. 'District Rotaract Representative'
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_speakers_event ON public.event_speakers(event_id, sort_order);

ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Speakers viewable by everyone" ON public.event_speakers;
CREATE POLICY "Speakers viewable by everyone" ON public.event_speakers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role writes speakers" ON public.event_speakers;
CREATE POLICY "Service role writes speakers" ON public.event_speakers
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────────
-- SAMPLE agenda for "Vibe DRC 01" so the landing page has content.
-- Edit the items before/after running, or delete and re-add from
-- the SQL editor. Re-running replaces the sample rows.
-- ────────────────────────────────────────────────────────────────
DELETE FROM public.event_agenda
WHERE event_id IN (SELECT id FROM public.events WHERE name = 'Vibe DRC 01');

INSERT INTO public.event_agenda (event_id, sort_order, time_label, title, description)
SELECT e.id, v.sort_order, v.time_label, v.title, v.description
FROM public.events e,
(VALUES
  (1, '08:30 AM', 'Registration & scan-in',      'QR check-in opens — arrive early for the punctuality bonus.'),
  (2, '09:15 AM', 'Inaugural session',            'Flag salutation, invocation and welcome address.'),
  (3, '10:00 AM', 'District council briefing',    'Term plan, district calendar and club expectations.'),
  (4, '11:30 AM', 'Club presidents roundtable',   'Open floor — one win and one blocker per club.'),
  (5, '01:00 PM', 'Lunch & networking',           NULL),
  (6, '02:00 PM', 'Valediction',                  'Recognitions, group photo and closing remarks.')
) AS v(sort_order, time_label, title, description)
WHERE e.name = 'Vibe DRC 01';

-- Speakers: uncomment and fill with the real lineup, then run.
-- INSERT INTO public.event_speakers (event_id, sort_order, name, designation, photo_url)
-- SELECT id, 1, 'Rtr. Full Name', 'District Rotaract Representative', 'https://…/photo.jpg'
-- FROM public.events WHERE name = 'Vibe DRC 01';
