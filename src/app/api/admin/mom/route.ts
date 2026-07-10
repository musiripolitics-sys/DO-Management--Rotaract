import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, MOM_TIER } from '@/lib/session'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireAdmin() {
  const s = await getSession()
  return hasAccess(s?.role, MOM_TIER)
}

// GET — DRC meetings with their MoM status + registered-club count.
export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const supabase = getAdminClient()

    const [eventsRes, momRes, bookingsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, location, event_date, start_time')
        .eq('category', 'DRC')
        .order('start_time', { ascending: false }),
      supabase.from('mom_meetings').select('id, event_id, meeting_number, status, published_at'),
      supabase.from('drc_bookings').select('event_id'),
    ])

    if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })

    const momByEvent = new Map((momRes.data ?? []).map((m) => [m.event_id, m]))
    const clubCounts = new Map<string, number>()
    for (const b of bookingsRes.data ?? []) {
      clubCounts.set(b.event_id, (clubCounts.get(b.event_id) ?? 0) + 1)
    }

    const meetings = (eventsRes.data ?? []).map((e) => ({
      ...e,
      registeredClubs: clubCounts.get(e.id) ?? 0,
      mom: momByEvent.get(e.id) ?? null,
    }))

    return NextResponse.json({ meetings })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// POST — create a MoM for a DRC event.
export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { event_id, meeting_number, venue, chairperson } = await request.json()
    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Verify it's a DRC event
    const { data: event } = await supabase
      .from('events')
      .select('id, category, location')
      .eq('id', event_id)
      .single()
    if (!event || event.category !== 'DRC') {
      return NextResponse.json({ error: 'Event not found or not a DRC event' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('mom_meetings')
      .insert({
        event_id,
        meeting_number: meeting_number?.trim() || null,
        venue: venue?.trim() || event.location || null,
        chairperson: chairperson?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A MoM already exists for this meeting.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, mom: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
