-- ════════════════════════════════════════════════════════════════
-- Self-serve password reset.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Stores only a SHA-256 HASH of each reset token, so a DB leak can't
-- be used to reset anyone's password. Raw token lives only in the
-- emailed link. Rows are single-use (used_at) and short-lived
-- (expires_at, ~1h — enforced in the API).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.password_resets (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at     TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_profile ON public.password_resets(profile_id);

-- Server-only table (all access via the service-role key). Lock out
-- the anon/authenticated roles entirely.
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.password_resets;
CREATE POLICY "Service role only" ON public.password_resets
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
