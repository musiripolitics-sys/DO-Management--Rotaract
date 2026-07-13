-- ═══════════════════════════════════════════════════════════════
-- Member registration approval flow
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Public "Register as member" submissions land here as `pending`.
-- The club's President/Secretary (or the sergeant team / admins)
-- approve or reject. Approval creates the real auth user + profile;
-- the member then signs in, sets a password, and gets their QR
-- identity pass for attendance.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.member_registrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone_number     TEXT NOT NULL,
  ri_id            TEXT,
  club_id          UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_regs_club_status
  ON public.member_registrations(club_id, status);
CREATE INDEX IF NOT EXISTS idx_member_regs_status
  ON public.member_registrations(status);

-- One live application per email — re-submitting while pending is blocked.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_regs_pending_email
  ON public.member_registrations (LOWER(email))
  WHERE status = 'pending';

-- RLS passthrough — access is enforced in the API layer via the
-- service-role client (same pattern as clubs / club_projects).
ALTER TABLE public.member_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.member_registrations;
CREATE POLICY "Service role full access" ON public.member_registrations USING (true) WITH CHECK (true);

-- ── Verify ───────────────────────────────────────────────────────
SELECT COUNT(*) AS member_registrations_rows FROM public.member_registrations;
