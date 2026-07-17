import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, OVERSIGHT_TIER, SERGEANT_MANAGE_TIER } from '@/lib/session'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

// GET — DRC events with their club registrations. Visible to the scan tier
// (sergeant team) as well as admin tier.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!hasAccess(session.role, OVERSIGHT_TIER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getAdminClient()

    // 1. DRC-category events (booking_closed arrives with
    //    schema_drc_booking_lock.sql — fall back gracefully without it)
    let events: Array<Record<string, unknown>> | null = null
    {
      const withLock = await supabase
        .from('events')
        .select('id, name, location, event_date, start_time, booking_closed')
        .eq('category', 'DRC')
        .order('start_time', { ascending: true })
      if (!withLock.error) {
        events = withLock.data
      } else {
        const bare = await supabase
          .from('events')
          .select('id, name, location, event_date, start_time')
          .eq('category', 'DRC')
          .order('start_time', { ascending: true })
        if (bare.error) return NextResponse.json({ error: bare.error.message }, { status: 500 })
        events = (bare.data ?? []).map((e) => ({ ...e, booking_closed: false }))
      }
    }

    const eventIds = (events ?? []).map((e) => e.id as string)

    // 2. Bookings for those events (graceful if the table is missing)
    type Booking = {
      id: string
      event_id: string
      club_name: string
      attendee_count: number
      contact_name: string | null
      contact_phone: string | null
      notes: string | null
      created_at: string
      profiles: { full_name: string | null } | { full_name: string | null }[] | null
    }
    let bookings: Booking[] = []
    if (eventIds.length > 0) {
      try {
        const res = await supabase
          .from('drc_bookings')
          .select(
            'id, event_id, club_name, attendee_count, contact_name, contact_phone, notes, created_at, profiles:booked_by(full_name)',
          )
          .in('event_id', eventIds)
          .order('created_at', { ascending: true })
        if (!res.error) bookings = (res.data ?? []) as Booking[]
      } catch {
        // table may not exist yet
      }
    }

    // 3. Group bookings under each event
    const byEvent = new Map<string, Booking[]>()
    for (const b of bookings) {
      const list = byEvent.get(b.event_id) ?? []
      list.push(b)
      byEvent.set(b.event_id, list)
    }

    const result = (events ?? []).map((e) => {
      const list = byEvent.get(e.id as string) ?? []
      return {
        ...e,
        totalClubs: list.length,
        totalAttendees: list.reduce((s, b) => s + (b.attendee_count || 0), 0),
        bookings: list.map((b) => ({
          id: b.id,
          club_name: b.club_name,
          attendee_count: b.attendee_count,
          contact_name: b.contact_name,
          contact_phone: b.contact_phone,
          notes: b.notes,
          booked_by_name: one<{ full_name: string | null }>(b.profiles)?.full_name ?? null,
          created_at: b.created_at,
        })),
      }
    })

    return NextResponse.json({
      events: result,
      // Chief sergeant + full admins may open/close slot booking.
      canManageBooking: hasAccess(session.role, SERGEANT_MANAGE_TIER),
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// PATCH — open/close slot booking for a DRC event.
// Restricted to the chief sergeant and full admins.
export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!hasAccess(session.role, SERGEANT_MANAGE_TIER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const eventId = typeof body.event_id === 'string' ? body.event_id : null
    if (!eventId || typeof body.booking_closed !== 'boolean') {
      return NextResponse.json(
        { error: 'event_id and booking_closed (boolean) are required' },
        { status: 400 },
      )
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('events')
      .update({ booking_closed: body.booking_closed })
      .eq('id', eventId)
      .eq('category', 'DRC')
      .select('id, booking_closed')
      .maybeSingle()

    if (error) {
      const missingColumn = error.code === '42703' || /booking_closed/.test(error.message)
      return NextResponse.json(
        {
          error: missingColumn
            ? 'Run supabase/schema_drc_booking_lock.sql first — the booking_closed column is missing.'
            : error.message,
        },
        { status: 500 },
      )
    }
    if (!data) {
      return NextResponse.json({ error: 'DRC event not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, event: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
