import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendBookingConfirmationEmail } from '@/lib/email'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getPresidentProfile() {
  const cookieStore = await cookies()
  const email = cookieStore.get('vibe_member')?.value
  if (!email) return null

  const supabase = getAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, club_name, phone_number, designation')
    .eq('email', email)
    .single()

  if (!profile) return null
  if (!profile.designation?.toLowerCase().includes('president')) return null
  return profile
}

export async function GET() {
  try {
    const profile = await getPresidentProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const [eventsRes, bookingsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, location, event_date, start_time, category')
        .eq('category', 'DRC')
        .order('start_time', { ascending: true }),
      supabase
        .from('drc_bookings')
        .select('id, event_id, club_name, attendee_count, contact_name, contact_phone, notes, created_at')
        .eq('booked_by', profile.id),
    ])

    if (eventsRes.error) {
      return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })
    }

    const bookingsByEvent = Object.fromEntries(
      (bookingsRes.data ?? []).map((b) => [b.event_id, b])
    )
    const bookedIds = new Set(Object.keys(bookingsByEvent))

    const events = (eventsRes.data ?? []).map((e) => ({
      ...e,
      booked: bookedIds.has(e.id),
      booking: bookingsByEvent[e.id] ?? null,
    }))

    return NextResponse.json({ events, profile })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getPresidentProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event_id, club_name, attendee_count, contact_name, contact_phone, notes } = body

    if (!event_id || !club_name || !attendee_count) {
      return NextResponse.json(
        { error: 'event_id, club_name, and attendee_count are required' },
        { status: 400 },
      )
    }

    const supabase = getAdminClient()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, category, location, event_date, start_time')
      .eq('id', event_id)
      .single()

    if (eventError || !event || event.category !== 'DRC') {
      return NextResponse.json({ error: 'Event not found or not a DRC event' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('drc_bookings')
      .insert({
        event_id,
        booked_by: profile.id,
        club_name,
        attendee_count: Number(attendee_count),
        contact_name: contact_name || profile.full_name,
        contact_phone: contact_phone || profile.phone_number,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You have already booked this event' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send confirmation email (non-blocking — log on failure, don't fail the request)
    if (profile.email) {
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
        clubName: club_name,
        attendeeCount: Number(attendee_count),
        contactName: contact_name || profile.full_name,
        contactPhone: contact_phone || profile.phone_number,
      })
    }

    return NextResponse.json({ success: true, booking: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
