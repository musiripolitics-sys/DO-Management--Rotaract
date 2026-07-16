-- ────────────────────────────────────────────────────────────────
-- 24-hour event reminder emails: dedupe marker.
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- /api/cron/event-reminders stamps this when a reminder is sent so
-- each booking is reminded exactly once. Without the column the
-- endpoint falls back to a 23–24h window heuristic.
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.drc_bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.drc_bookings.reminder_sent_at
  IS 'Set by /api/cron/event-reminders after the 24h reminder email is sent.';
