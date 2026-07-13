import { NextResponse } from 'next/server'
import { getSession, hasAccess, PROJECTS_TIER } from '@/lib/session'
import { getAdminClient } from '@/lib/projects-server'
import { activeReportMonth, toMonthKey, recentReportMonths } from '@/lib/projects'

type ProjectRow = {
  id: string
  club_id: string
  report_month: string
  project_name: string
  project_date: string | null
  avenue: string | null
  venue: string | null
  description: string | null
  outcome: string | null
  beneficiaries: number | null
  volunteers: number | null
  drive_folder_url: string | null
  created_at: string
  clubs: { name?: string; club_type?: string; status?: string } | { name?: string; club_type?: string; status?: string }[] | null
  submitter: { full_name?: string } | { full_name?: string }[] | null
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

// GET — district-wide project reports for one month (DRS + admins; NOT ADRS).
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!hasAccess(session.role, PROJECTS_TIER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const monthParam = url.searchParams.get('month')
    const month = monthParam ? toMonthKey(monthParam) : activeReportMonth()

    const supabase = getAdminClient()

    const [projectsRes, clubsRes] = await Promise.all([
      supabase
        .from('club_projects')
        .select(
          '*, clubs:club_id(name, club_type, status), submitter:submitted_by(full_name)',
        )
        .eq('report_month', month)
        .order('created_at', { ascending: false }),
      supabase.from('clubs').select('id, name, club_type, status').eq('status', 'active'),
    ])

    if (projectsRes.error) {
      return NextResponse.json({ error: projectsRes.error.message }, { status: 500 })
    }

    const rows = (projectsRes.data ?? []) as ProjectRow[]
    const activeClubs = clubsRes.data ?? []

    // Group projects by club.
    const byClubMap = new Map<
      string,
      { club_id: string; club_name: string; club_type: string | null; projects: unknown[] }
    >()
    let beneficiaries = 0
    let volunteers = 0
    const avenueCount = new Map<string, number>()

    for (const r of rows) {
      const club = one(r.clubs)
      const submitter = one(r.submitter)
      const entry = byClubMap.get(r.club_id) ?? {
        club_id: r.club_id,
        club_name: club?.name ?? 'Unknown club',
        club_type: club?.club_type ?? null,
        projects: [],
      }
      entry.projects.push({
        id: r.id,
        project_name: r.project_name,
        project_date: r.project_date,
        avenue: r.avenue,
        venue: r.venue,
        description: r.description,
        outcome: r.outcome,
        beneficiaries: r.beneficiaries,
        volunteers: r.volunteers,
        drive_folder_url: r.drive_folder_url,
        submitted_by: submitter?.full_name ?? null,
        created_at: r.created_at,
      })
      byClubMap.set(r.club_id, entry)
      beneficiaries += r.beneficiaries ?? 0
      volunteers += r.volunteers ?? 0
      if (r.avenue) avenueCount.set(r.avenue, (avenueCount.get(r.avenue) ?? 0) + 1)
    }

    const submittedIds = new Set(byClubMap.keys())
    const pendingClubs = activeClubs
      .filter((c) => !submittedIds.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, club_type: c.club_type }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const byClub = Array.from(byClubMap.values()).sort((a, b) =>
      a.club_name.localeCompare(b.club_name),
    )

    const totalClubs = activeClubs.length
    const clubsSubmitted = submittedIds.size

    return NextResponse.json({
      month,
      months: recentReportMonths(12),
      stats: {
        totalProjects: rows.length,
        clubsSubmitted,
        totalClubs,
        participationPct: totalClubs ? Math.round((clubsSubmitted / totalClubs) * 100) : 0,
        beneficiaries,
        volunteers,
      },
      avenueBreakdown: Array.from(avenueCount.entries())
        .map(([avenue, count]) => ({ avenue, count }))
        .sort((a, b) => b.count - a.count),
      byClub,
      pendingClubs,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
