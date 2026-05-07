import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function ensureAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('vibe_admin')?.value === '1'
}

export async function GET(req: Request) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const eventId = url.searchParams.get('event_id')
    const supabase = getAdminClient()

    if (eventId) {
      const [eventRes, attendanceRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, name, location, event_date, start_time, end_time, category')
          .eq('id', eventId)
          .single(),
        supabase
          .from('attendance')
          .select(
            'id, check_in_time, status, points_awarded, profiles(id, full_name, email, club_name, designation)',
          )
          .eq('event_id', eventId)
          .order('check_in_time', { ascending: true }),
      ])

      if (eventRes.error) {
        return NextResponse.json({ error: eventRes.error.message }, { status: 404 })
      }

      return NextResponse.json({
        event: eventRes.data,
        attendees: attendanceRes.data ?? [],
      })
    }

    const [eventsRes, countsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, location, event_date, start_time, category')
        .order('start_time', { ascending: false })
        .limit(200),
      supabase.from('attendance').select('event_id'),
    ])

    if (eventsRes.error) {
      return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })
    }

    const counts = new Map<string, number>()
    for (const row of countsRes.data ?? []) {
      const key = (row as { event_id: string }).event_id
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const events = (eventsRes.data ?? []).map((e) => ({
      ...e,
      attendee_count: counts.get(e.id) ?? 0,
    }))

    return NextResponse.json({ events })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
