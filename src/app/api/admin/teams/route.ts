import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, ADMIN_TIER } from '@/lib/session'
import { teamForDesignation, roleRank } from '@/lib/teams'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// GET — all district officials tagged with their functional team,
// plus a per-team summary. Admin tier only.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!hasAccess(session.role, ADMIN_TIER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getAdminClient()

    // District officials = designation prefixed "DO -"
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, club_id, clubs:club_id(name), designation')
      .ilike('designation', 'DO -%')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const members = (data ?? []).map((p) => {
      const team = teamForDesignation(p.designation)
      const c = Array.isArray(p.clubs) ? p.clubs[0] : p.clubs
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone_number: p.phone_number,
        club_name: (c as { name?: string } | null)?.name ?? null,
        designation: (p.designation ?? '').replace(/^DO - /, ''),
        teamKey: team.key,
        teamLabel: team.label,
        section: team.section,
        rank: roleRank(p.designation),
      }
    })

    // Summary: one entry per team with a count
    const summary = new Map<string, { key: string; label: string; section: string; count: number }>()
    for (const m of members) {
      const cur = summary.get(m.teamKey) ?? { key: m.teamKey, label: m.teamLabel, section: m.section, count: 0 }
      cur.count += 1
      summary.set(m.teamKey, cur)
    }

    return NextResponse.json({
      members,
      teams: Array.from(summary.values()),
      total: members.length,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
