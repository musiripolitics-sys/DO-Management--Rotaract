import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { COMMUNITY_CLUBS } from '@/lib/clubs'

/* ────────────────────────────────────────────────────────────────
 * Public landing-page analytics. No PII beyond what the public
 * leaderboard already shows (names + clubs + points). Aggregates
 * are computed server-side; the payload is cached for 5 minutes.
 * ────────────────────────────────────────────────────────────── */

export const revalidate = 300

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

const normName = (s: string | null | undefined) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export async function GET() {
  try {
    const supabase = getAdminClient()
    const nowIso = new Date().toISOString()

    const [upcomingRes, leaderboardRes, memberCountRes, clubsRes, eventsHeldRes, attendanceRes, profilesClubRes, rotaryRes, clubTypesRes] =
      await Promise.all([
        supabase
          .from('events')
          .select('id, name, location, event_date, start_time, category')
          .gte('start_time', nowIso)
          .order('start_time', { ascending: true })
          .limit(6),
        supabase
          .from('profiles')
          .select('full_name, total_points, clubs:club_id(name)')
          .order('total_points', { ascending: false })
          .limit(5),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('clubs').select('club_type').eq('status', 'active'),
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .lte('start_time', nowIso),
        supabase
          .from('attendance')
          .select('user_id, check_in_time, points_awarded, profiles!user_id(clubs:club_id(name))'),
        supabase.from('profiles').select('clubs:club_id(name)'),
        supabase.from('rotary_clubs').select('club_name, active_members'),
        supabase.from('clubs').select('name, club_type'),
      ])

    /* ── Leaderboard (top members) ── */
    const leaderboard = (leaderboardRes.data ?? []).map((p) => {
      const c = one(p.clubs)
      return {
        full_name: p.full_name,
        total_points: p.total_points,
        club_name: (c as { name?: string } | null)?.name ?? null,
      }
    })

    /* ── Clubs ── */
    const clubRows = clubsRes.data ?? []
    const clubs = {
      total: clubRows.length,
      college: clubRows.filter((c) => c.club_type === 'college').length,
      community: clubRows.filter((c) => c.club_type === 'community').length,
    }

    /* ── Official Rotary analytics: member counts × college/community type.
     *    Classification comes from our own clubs table (authoritative),
     *    with the canonical seed list as fallback. ── */
    const typeByName = new Map<string, string>()
    for (const c of clubTypesRes.data ?? []) {
      if (c.name) typeByName.set(normName(c.name), c.club_type)
    }
    const communitySeed = new Set(COMMUNITY_CLUBS.map(normName))
    const classifyClub = (name: string): 'college' | 'community' => {
      const t = typeByName.get(normName(name))
      if (t === 'college' || t === 'community') return t
      return communitySeed.has(normName(name)) ? 'community' : 'college'
    }
    const rankedClubs = (rotaryRes.data ?? [])
      .map((c) => ({
        name: c.club_name as string,
        members: (c.active_members as number) ?? 0,
        type: classifyClub(c.club_name as string),
      }))
      .sort((a, b) => b.members - a.members)

    const sumMembers = (arr: { members: number }[]) => arr.reduce((s, c) => s + c.members, 0)
    const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0)
    const catBlock = (type: 'college' | 'community') => {
      const arr = rankedClubs.filter((c) => c.type === type)
      const total = sumMembers(arr)
      return {
        clubs: arr.length,
        members: total,
        top: arr.slice(0, 8).map((c) => ({
          name: c.name,
          members: c.members,
          share: pct(c.members, total), // share of this category
        })),
      }
    }
    const rotaryTotal = sumMembers(rankedClubs)
    const rotary = rankedClubs.length
      ? {
          totalClubs: rankedClubs.length,
          totalMembers: rotaryTotal,
          avgMembers: Math.round(rotaryTotal / rankedClubs.length),
          largest: { ...rankedClubs[0], share: pct(rankedClubs[0].members, rotaryTotal) },
          college: catBlock('college'),
          community: catBlock('community'),
        }
      : null

    /* ── Attendance aggregates ── */
    const attendance = attendanceRes.data ?? []
    const clubNameOf = (p: unknown): string | null => {
      const prof = one(p as { clubs?: unknown } | { clubs?: unknown }[] | null)
      const club = one((prof as { clubs?: { name?: string } | { name?: string }[] } | null)?.clubs)
      return club?.name ?? null
    }

    let totalPoints = 0
    const scansByClub = new Map<string, number>()
    const byMonth = new Map<string, number>() // 'YYYY-MM' → scans
    for (const row of attendance) {
      totalPoints += row.points_awarded ?? 0
      const club = clubNameOf(row.profiles)
      if (club) scansByClub.set(club, (scansByClub.get(club) ?? 0) + 1)
      if (row.check_in_time) {
        const key = String(row.check_in_time).slice(0, 7)
        byMonth.set(key, (byMonth.get(key) ?? 0) + 1)
      }
    }

    // Last 6 calendar months, oldest → newest.
    const now = new Date()
    const activityByMonth = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return {
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        count: byMonth.get(key) ?? 0,
      }
    })

    /* ── Engagement: participation depth + month-over-month momentum ── */
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const engagement = {
      participants: new Set(
        attendance.map((r) => (r as { user_id?: string }).user_id).filter(Boolean),
      ).size,
      thisMonth: byMonth.get(monthKey(now)) ?? 0,
      lastMonth: byMonth.get(monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))) ?? 0,
      peak: activityByMonth.reduce((best, m) => (m.count > best.count ? m : best), activityByMonth[0]),
    }

    /* ── Members per club (for the club board) ── */
    const membersByClub = new Map<string, number>()
    for (const p of profilesClubRes.data ?? []) {
      const club = one(p.clubs as { name?: string } | { name?: string }[] | null)?.name
      if (club) membersByClub.set(club, (membersByClub.get(club) ?? 0) + 1)
    }

    const topClubs = Array.from(scansByClub.entries())
      .map(([name, scans]) => ({
        name,
        scans,
        members: membersByClub.get(name) ?? 0,
        type: classifyClub(name),
        share: pct(scans, attendance.length), // share of all check-ins
      }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 5)

    /* ── Service impact (secretary module) — graceful if absent ── */
    let impact: { projects: number; beneficiaries: number; volunteers: number } | null = null
    try {
      const { data: projects, error } = await supabase
        .from('club_projects')
        .select('beneficiaries, volunteers')
      if (!error && projects) {
        impact = {
          projects: projects.length,
          beneficiaries: projects.reduce((s, p) => s + (p.beneficiaries ?? 0), 0),
          volunteers: projects.reduce((s, p) => s + (p.volunteers ?? 0), 0),
        }
      }
    } catch {
      // table may not exist yet
    }

    return NextResponse.json({
      upcomingEvents: upcomingRes.data ?? [],
      leaderboard,
      memberCount: memberCountRes.count ?? 0,
      stats: {
        members: memberCountRes.count ?? 0,
        clubs,
        eventsHeld: eventsHeldRes.count ?? 0,
        totalCheckIns: attendance.length,
        totalPoints,
      },
      activityByMonth,
      engagement,
      topClubs,
      rotary,
      impact,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
