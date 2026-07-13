import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, SERGEANT_MANAGE_TIER } from '@/lib/session'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// GET — sergeant team roster with per-sergeant scan activity.
// Visible to the chief sergeant + full admins.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!hasAccess(session.role, SERGEANT_MANAGE_TIER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getAdminClient()

    // 1. The sergeant team — anyone whose designation carries a sergeant title
    const { data: sergeants, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, club_id, clubs:club_id(name), designation, access_role')
      .ilike('designation', '%sergeant%')
      .order('designation', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 2. Every scan that recorded who did it
    const { data: scans } = await supabase
      .from('attendance')
      .select('scanned_by, event_id, check_in_time')
      .not('scanned_by', 'is', null)

    // 3. Aggregate per scanner
    const stat = new Map<string, { scans: number; events: Set<string>; last: string | null }>()
    for (const s of scans ?? []) {
      const id = s.scanned_by as string
      const cur = stat.get(id) ?? { scans: 0, events: new Set<string>(), last: null }
      cur.scans += 1
      if (s.event_id) cur.events.add(s.event_id)
      if (!cur.last || (s.check_in_time && s.check_in_time > cur.last)) cur.last = s.check_in_time
      stat.set(id, cur)
    }

    const team = (sergeants ?? []).map((p) => {
      const st = stat.get(p.id)
      const isChief = /chief/i.test(p.designation ?? '')
      const c = Array.isArray(p.clubs) ? p.clubs[0] : p.clubs
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        club_name: (c as { name?: string } | null)?.name ?? null,
        designation: p.designation,
        isChief,
        scans: st?.scans ?? 0,
        eventsCovered: st ? st.events.size : 0,
        lastScan: st?.last ?? null,
      }
    })

    // Sort: chief first, then by scans desc
    team.sort((a, b) => (b.isChief ? 1 : 0) - (a.isChief ? 1 : 0) || b.scans - a.scans)

    const totalScans = team.reduce((s, t) => s + t.scans, 0)
    const activeScanners = team.filter((t) => t.scans > 0).length

    return NextResponse.json({
      team,
      totals: {
        sergeants: team.length,
        activeScanners,
        idle: team.length - activeScanners,
        totalScans,
      },
      // true only if the audit column has ever been populated
      auditAvailable: (scans ?? []).length > 0 || true,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
