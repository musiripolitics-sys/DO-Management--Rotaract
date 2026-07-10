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

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!hasAccess(session.role, MOM_TIER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getAdminClient()

    // ── Parallel base fetches ────────────────────────────────────────────────
    const [
      membersRes,
      eventsRes,
      allAttendanceRes,
      profilesClubRes,
      recentScansRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),

      supabase
        .from('events')
        .select('id, name, location, event_date, start_time, category')
        .order('start_time', { ascending: false })
        .limit(12),

      supabase
        .from('attendance')
        .select(
          'id, event_id, check_in_time, status, points_awarded, profiles!user_id(id, full_name, club_name)',
        ),

      supabase.from('profiles').select('club_name'),

      supabase
        .from('attendance')
        .select(
          'id, status, check_in_time, points_awarded, profiles!user_id(full_name, email), events(name)',
        )
        .order('check_in_time', { ascending: false })
        .limit(10),
    ])

    const totalMembers = membersRes.count ?? 0
    const events = eventsRes.data ?? []

    // ── DRC bookings (graceful if table missing) ─────────────────────────────
    const drcEventIds = events
      .filter((e) => e.category === 'DRC')
      .map((e) => e.id)

    let drcBookings: Array<{
      id: string
      event_id: string
      club_name: string
      attendee_count: number
      contact_name: string | null
    }> = []

    let totalDrcBookings = 0

    if (drcEventIds.length > 0) {
      try {
        const res = await supabase
          .from('drc_bookings')
          .select('id, event_id, club_name, attendee_count, contact_name')
          .in('event_id', drcEventIds)
        if (!res.error) {
          drcBookings = res.data ?? []
          totalDrcBookings = drcBookings.length
        }
      } catch {
        // table may not exist yet
      }
    }

    // ── Feedback stats (graceful if table missing) ───────────────────────────
    const feedbackByEvent = new Map<string, { totalRating: number; count: number }>()

    try {
      const { data: feedbackRows, error: fbErr } = await supabase
        .from('event_feedback')
        .select('event_id, rating')
      if (!fbErr && feedbackRows) {
        for (const row of feedbackRows) {
          const cur = feedbackByEvent.get(row.event_id) ?? { totalRating: 0, count: 0 }
          feedbackByEvent.set(row.event_id, {
            totalRating: cur.totalRating + row.rating,
            count: cur.count + 1,
          })
        }
      }
    } catch {
      // table may not exist yet
    }

    // ── Group attendance by event ────────────────────────────────────────────
    const attendanceByEvent = new Map<string, typeof allAttendanceRes.data>()
    for (const row of allAttendanceRes.data ?? []) {
      const list = attendanceByEvent.get(row.event_id) ?? []
      list.push(row)
      attendanceByEvent.set(row.event_id, list)
    }

    // ── Group DRC bookings by event ──────────────────────────────────────────
    const bookingsByEvent = new Map<string, typeof drcBookings>()
    for (const b of drcBookings) {
      const list = bookingsByEvent.get(b.event_id) ?? []
      list.push(b)
      bookingsByEvent.set(b.event_id, list)
    }

    // ── Event insights ───────────────────────────────────────────────────────
    const eventInsights = events.map((event) => {
      const scanners = attendanceByEvent.get(event.id) ?? []
      return {
        ...event,
        scanCount: scanners.length,
        notScannedCount: Math.max(0, totalMembers - scanners.length),
        attendanceRate:
          totalMembers > 0 ? Math.round((scanners.length / totalMembers) * 100) : 0,
        scanners: scanners.slice(0, 10).map((s) => ({
          id: s.id,
          full_name: one<{ id: string; full_name: string | null; club_name: string | null }>(s.profiles as any)?.full_name ?? null,
          club_name: one<{ id: string; full_name: string | null; club_name: string | null }>(s.profiles as any)?.club_name ?? null,
          status: s.status,
          points_awarded: s.points_awarded,
          check_in_time: s.check_in_time,
        })),
        totalScanners: scanners.length,
        drcBookings: bookingsByEvent.get(event.id) ?? [],
        feedbackCount: feedbackByEvent.get(event.id)?.count ?? 0,
        avgRating: feedbackByEvent.has(event.id)
          ? Math.round((feedbackByEvent.get(event.id)!.totalRating / feedbackByEvent.get(event.id)!.count) * 10) / 10
          : null,
      }
    })

    // ── Club stats ───────────────────────────────────────────────────────────
    const clubScanMap = new Map<string, number>()
    for (const row of allAttendanceRes.data ?? []) {
      const club =
        one<{ id: string; full_name: string | null; club_name: string | null }>(row.profiles as any)
          ?.club_name ?? 'Unknown'
      clubScanMap.set(club, (clubScanMap.get(club) ?? 0) + 1)
    }

    const membersByClub = new Map<string, number>()
    for (const p of profilesClubRes.data ?? []) {
      const club = p.club_name ?? 'Unknown'
      membersByClub.set(club, (membersByClub.get(club) ?? 0) + 1)
    }

    const totalClubs = new Set(
      (profilesClubRes.data ?? []).map((p) => p.club_name).filter(Boolean),
    ).size

    const clubStats = Array.from(clubScanMap.entries())
      .map(([club_name, scan_count]) => ({
        club_name,
        scan_count,
        member_count: membersByClub.get(club_name) ?? 0,
      }))
      .sort((a, b) => b.scan_count - a.scan_count)
      .slice(0, 8)

    // ── Totals ───────────────────────────────────────────────────────────────
    const totalScans = allAttendanceRes.data?.length ?? 0
    const totalPoints =
      allAttendanceRes.data?.reduce((s, r) => s + (r.points_awarded || 0), 0) ?? 0

    return NextResponse.json({
      stats: {
        totalMembers,
        totalEvents: events.length,
        totalScans,
        pointsAwarded: totalPoints,
        drcBookings: totalDrcBookings,
        totalClubs,
      },
      eventInsights,
      recentScans: recentScansRes.data ?? [],
      clubStats,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
