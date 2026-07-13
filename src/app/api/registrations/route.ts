import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/projects-server'
import { requireReviewer, isMissingTable } from '@/lib/registrations-server'

// GET — registrations visible to the caller.
//   ?status=pending|approved|rejected|all   (default pending)
//   ?club_id=…                              (district-wide reviewers only)
export async function GET(request: Request) {
  try {
    const { reviewer, denied } = await requireReviewer()
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? 'pending'
    const clubParam = url.searchParams.get('club_id')

    const supabase = getAdminClient()
    let query = supabase
      .from('member_registrations')
      .select(
        'id, full_name, email, phone_number, ri_id, club_id, status, reviewed_at, rejection_reason, created_at, clubs:club_id(name, club_type), reviewer:reviewed_by(full_name)',
      )
      .order('created_at', { ascending: false })
      .limit(200)

    // Club officers only ever see their own club.
    const clubScope = reviewer.clubScope ?? clubParam
    if (clubScope) query = query.eq('club_id', clubScope)
    if (status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          { error: 'The member_registrations table has not been created yet.' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const one = <T,>(v: T | T[] | null | undefined): T | null =>
      !v ? null : Array.isArray(v) ? (v[0] ?? null) : v

    const registrations = (data ?? []).map((r) => {
      const club = one(r.clubs as { name?: string; club_type?: string } | null)
      const rev = one(r.reviewer as { full_name?: string } | null)
      return {
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        phone_number: r.phone_number,
        ri_id: r.ri_id,
        club_id: r.club_id,
        status: r.status,
        reviewed_at: r.reviewed_at,
        rejection_reason: r.rejection_reason,
        created_at: r.created_at,
        club_name: club?.name ?? null,
        club_type: club?.club_type ?? null,
        reviewed_by_name: rev?.full_name ?? null,
      }
    })

    return NextResponse.json({
      registrations,
      pendingCount: registrations.filter((r) => r.status === 'pending').length,
      scope: reviewer.clubScope ? 'club' : 'district',
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
