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

export async function GET() {
  try {
    const cookieStore = await cookies()
    if (cookieStore.get('vibe_admin')?.value !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()
    const nowIso = new Date().toISOString()

    const [membersRes, eventsRes, activeEventsRes, attendanceCountRes, pointsRes, recentScansRes, upcomingEventsRes] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('start_time', nowIso),
        supabase.from('attendance').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('points_awarded'),
        supabase
          .from('attendance')
          .select('id, status, check_in_time, points_awarded, profiles(full_name, email), events(name)')
          .order('check_in_time', { ascending: false })
          .limit(8),
        supabase
          .from('events')
          .select('id, name, location, event_date, start_time')
          .gte('start_time', nowIso)
          .order('start_time', { ascending: true })
          .limit(5),
      ])

    const totalPoints =
      pointsRes.data?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) ?? 0

    return NextResponse.json({
      stats: {
        totalMembers: membersRes.count ?? 0,
        totalEvents: eventsRes.count ?? 0,
        activeEvents: activeEventsRes.count ?? 0,
        totalScans: attendanceCountRes.count ?? 0,
        pointsAwarded: totalPoints,
      },
      recentScans: recentScansRes.data ?? [],
      upcomingEvents: upcomingEventsRes.data ?? [],
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
