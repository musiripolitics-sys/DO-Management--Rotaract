import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { getSession } from '@/lib/session'
import { isBookingClosed, BOOKING_CLOSED_MESSAGE } from '@/lib/drc'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getPresidentProfile() {
  const session = await getSession()
  if (!session || session.role !== 'president' || !session.email) return null
  const supabase = getAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, designation')
    .ilike('email', session.email)
    .maybeSingle()
  return profile ?? null
}

type Params = { params: Promise<{ id: string }> }

// ── PATCH: update an existing booking ────────────────────────────────────────
export async function PATCH(request: Request, { params }: Params) {
  try {
    const profile = await getPresidentProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { club_name, attendee_count, contact_name, contact_phone, notes } = body

    if (!club_name || !attendee_count) {
      return NextResponse.json(
        { error: 'club_name and attendee_count are required' },
        { status: 400 },
      )
    }
    if (Number(attendee_count) < 1) {
      return NextResponse.json({ error: 'Attendee count must be at least 1' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Verify ownership: the booking must belong to this president
    const { data: existing } = await supabase
      .from('drc_bookings')
      .select('id, booked_by, event_id')
      .eq('id', id)
      .single()

    if (!existing || existing.booked_by !== profile.id) {
      return NextResponse.json(
        { error: 'Booking not found or not yours to edit' },
        { status: 404 },
      )
    }

    // A closed event freezes its bookings — edits go through the Chief Sergeant.
    if (await isBookingClosed(supabase, existing.event_id)) {
      return NextResponse.json({ error: BOOKING_CLOSED_MESSAGE }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('drc_bookings')
      .update({
        club_name: club_name.trim(),
        attendee_count: Number(attendee_count),
        contact_name: contact_name?.trim() || null,
        contact_phone: contact_phone?.trim() || null,
        notes: notes?.trim() || null,
      })
      .eq('id', id)
      .select('id, event_id, club_name, attendee_count, contact_name, contact_phone, notes')
      .single()

    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })

    // Send update confirmation email
    if (profile.email) {
      const { data: event } = await supabase
        .from('events')
        .select('name, location, event_date, start_time')
        .eq('id', data.event_id)
        .single()
      if (event) {
        const dt = new Date(event.start_time)
        const eventDate = `${new Date(event.event_date).toLocaleDateString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
        })} · ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

        await sendBookingConfirmationEmail({
          presidentName: profile.full_name ?? 'President',
          presidentEmail: profile.email,
          eventName: event.name,
          eventDate,
          eventLocation: event.location,
          clubName: data.club_name,
          attendeeCount: data.attendee_count,
          contactName: data.contact_name,
          contactPhone: data.contact_phone,
          isUpdate: true,
        })
      }
    }

    return NextResponse.json({ success: true, booking: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// ── DELETE: cancel a booking ────────────────────────────────────────────────
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const profile = await getPresidentProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getAdminClient()

    // Verify ownership
    const { data: existing } = await supabase
      .from('drc_bookings')
      .select('id, booked_by, event_id')
      .eq('id', id)
      .single()

    if (!existing || existing.booked_by !== profile.id) {
      return NextResponse.json(
        { error: 'Booking not found or not yours to cancel' },
        { status: 404 },
      )
    }

    // A closed event freezes its bookings — cancellations go through the Chief Sergeant.
    if (await isBookingClosed(supabase, existing.event_id)) {
      return NextResponse.json({ error: BOOKING_CLOSED_MESSAGE }, { status: 403 })
    }

    const { error } = await supabase.from('drc_bookings').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
