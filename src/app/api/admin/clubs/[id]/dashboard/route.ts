import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, ADMIN_TIER } from '@/lib/session'

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

type Params = { params: Promise<{ id: string }> }

// GET — per-club dashboard analytics.
export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!hasAccess(session.role, ADMIN_TIER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = getAdminClient()

    const [membersRes, eventsCountRes, upcomingRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, club_position, membership_status, avenue, total_points, join_date, created_at')
        .eq('club_id', id),
      // Only events that have already started can have attendance —
      // counting future events would understate the percentage.
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .lte('start_time', new Date().toISOString()),
      supabase
        .from('events')
        .select('id, name, location, event_date, start_time, category')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5),
    ])

    const members = membersRes.data ?? []
    const memberIds = members.map((m) => m.id)
    const totalEvents = eventsCountRes.count ?? 0

    // Attendance for this club's members (+ event name for the recent feed)
    let attendance: Array<{
      user_id: string
      check_in_time: string
      points_awarded: number
      events: { name: string | null } | { name: string | null }[] | null
    }> = []
    if (memberIds.length > 0) {
      const { data } = await supabase
        .from('attendance')
        .select('user_id, check_in_time, points_awarded, events(name)')
        .in('user_id', memberIds)
        .order('check_in_time', { ascending: false })
      attendance = data ?? []
    }

    // ── KPIs ──
    const totalMembers = members.length
    const activeMembers = members.filter((m) => (m.membership_status ?? 'active') === 'active').length
    const officerCount = members.filter((m) => m.club_position && m.club_position !== 'member').length
    const rewardPoints = members.reduce((s, m) => s + (m.total_points || 0), 0)

    const scanCountByMember = new Map<string, number>()
    for (const a of attendance) {
      scanCountByMember.set(a.user_id, (scanCountByMember.get(a.user_id) ?? 0) + 1)
    }
    const avgAttendance =
      totalMembers > 0 && totalEvents > 0
        ? Math.round(
            (members.reduce((s, m) => s + (scanCountByMember.get(m.id) ?? 0) / totalEvents, 0) /
              totalMembers) *
              100,
          )
        : 0

    // ── Officers ──
    const officers = {
      president: members.find((m) => m.club_position === 'president')?.full_name ?? null,
      secretary: members.find((m) => m.club_position === 'secretary')?.full_name ?? null,
      treasurer: members.find((m) => m.club_position === 'treasurer')?.full_name ?? null,
    }

    // ── Growth: cumulative members by month (last 6 months) ──
    const now = new Date()
    const months: { label: string; key: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        count: 0,
      })
    }
    for (const m of members) {
      const joined = m.join_date || m.created_at
      if (!joined) continue
      const d = new Date(joined)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      // cumulative: increment this month and all later buckets
      for (const bucket of months) {
        if (bucket.key >= key) bucket.count += 1
      }
    }

    // ── Avenue breakdown ──
    const avenueMap = new Map<string, number>()
    for (const m of members) {
      const a = m.avenue || 'Unassigned'
      avenueMap.set(a, (avenueMap.get(a) ?? 0) + 1)
    }
    const avenueBreakdown = Array.from(avenueMap.entries())
      .map(([avenue, count]) => ({ avenue, count }))
      .sort((a, b) => b.count - a.count)

    // ── Recent activity ──
    const nameById = new Map(members.map((m) => [m.id, m.full_name]))
    const recentActivity = attendance.slice(0, 8).map((a) => ({
      member: nameById.get(a.user_id) ?? '—',
      event: one<{ name: string | null }>(a.events)?.name ?? 'Event',
      points: a.points_awarded,
      time: a.check_in_time,
    }))

    return NextResponse.json({
      stats: { totalMembers, activeMembers, officerCount, rewardPoints, avgAttendance },
      officers,
      growth: months.map((m) => ({ label: m.label, count: m.count })),
      avenueBreakdown,
      recentActivity,
      upcomingEvents: upcomingRes.data ?? [],
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
