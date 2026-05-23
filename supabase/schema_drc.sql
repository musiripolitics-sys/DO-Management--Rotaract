-- DRC Bookings table — presidents register their clubs for DRC events
CREATE TABLE IF NOT EXISTS public.drc_bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  booked_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  club_name TEXT NOT NULL,
  attendee_count INTEGER NOT NULL DEFAULT 1,
  contact_name TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, booked_by)
);

ALTER TABLE public.drc_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.drc_bookings
  USING (true) WITH CHECK (true);
