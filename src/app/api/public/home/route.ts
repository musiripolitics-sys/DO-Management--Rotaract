import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const supabase = getAdminClient()
    const nowIso = new Date().toISOString()

    const [upcomingRes, leaderboardRes, memberCountRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, location, event_date, start_time')
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(3),
      supabase
        .from('profiles')
        .select('full_name, club_name, total_points')
        .order('total_points', { ascending: false })
        .limit(5),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      upcomingEvents: upcomingRes.data ?? [],
      leaderboard: leaderboardRes.data ?? [],
      memberCount: memberCountRes.count ?? 0,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
