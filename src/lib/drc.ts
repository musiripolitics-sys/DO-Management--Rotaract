import type { SupabaseClient } from '@supabase/supabase-js'

/* DRC slot-booking lock (events.booking_closed, added by
 * supabase/schema_drc_booking_lock.sql). While closed, presidents cannot
 * create, edit, or cancel a booking for the event — changes go through the
 * Chief Sergeant. Missing column (migration not run) reads as open. */

export const BOOKING_CLOSED_MESSAGE =
  'Slot booking for this event is closed. Please contact the Chief Sergeant.'

export async function isBookingClosed(
  supabase: SupabaseClient,
  eventId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('events')
    .select('booking_closed')
    .eq('id', eventId)
    .maybeSingle()
  if (error) return false
  return Boolean((data as { booking_closed?: boolean } | null)?.booking_closed)
}
