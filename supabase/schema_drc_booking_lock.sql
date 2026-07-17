-- DRC slot-booking lock.
-- When events.booking_closed is true, presidents can no longer create,
-- edit, or cancel bookings for that event from the portal — the booking
-- button is disabled and they are told to contact the Chief Sergeant.
-- Toggled from /admin/drc by the chief sergeant or a full admin.
-- Safe to re-run.

alter table public.events
  add column if not exists booking_closed boolean not null default false;
