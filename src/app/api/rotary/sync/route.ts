import { NextResponse } from 'next/server'
import { getSession, hasAccess, ADMIN_TIER } from '@/lib/session'
import { getAdminClient } from '@/lib/projects-server'
import { fetchAllRotaractClubs, RotarySessionError } from '@/lib/rotary'

export const dynamic = 'force-dynamic'

/**
 * POST /api/rotary/sync — admin only.
 * Pulls every Rotaract club in the district from the live my.rotary.org
 * API and upserts them into the `rotary_clubs` cache. Run this whenever
 * a fresh session cookie is in place (see rotary-session.txt).
 */
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!hasAccess(session.role, ADMIN_TIER)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const clubs = await fetchAllRotaractClubs()

    if (clubs.length > 0) {
      const rows = clubs.map((c) => ({
        club_id: c.clubId,
        nf_id: c.nfId,
        nf_key: c.nfKey,
        club_name: c.name,
        club_type: c.clubType,
        city: c.city,
        state: c.state,
        country: c.country,
        active_members: c.activeMembers,
        assistant_governor: c.assistantGovernor,
        ag_id: c.agId,
        synced_at: new Date().toISOString(),
      }))

      const supabase = getAdminClient()
      const { error } = await supabase.from('rotary_clubs').upsert(rows, { onConflict: 'club_id' })
      if (error) throw error
    }

    return NextResponse.json({
      ok: true,
      synced: clubs.length,
      totalMembers: clubs.reduce((sum, c) => sum + c.activeMembers, 0),
      syncedAt: new Date().toISOString(),
    })
  } catch (e) {
    // Expired/missing session → tell the user to refresh the cookie (401).
    if (e instanceof RotarySessionError) {
      return NextResponse.json({ error: e.message, needsFreshCookie: true }, { status: 401 })
    }
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
