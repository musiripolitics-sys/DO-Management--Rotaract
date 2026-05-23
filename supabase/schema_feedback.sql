-- Event feedback / ratings
CREATE TABLE IF NOT EXISTS public.event_feedback (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id     UUID REFERENCES public.events(id)   ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating       INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.event_feedback
  USING (true)
  WITH CHECK (true);
