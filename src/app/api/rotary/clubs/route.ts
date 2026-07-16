import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/projects-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/rotary/clubs — public. Reads the cached Rotary clubs from
 * Supabase (populated by POST /api/rotary/sync). Never calls Rotary
 * directly, so it's fast and unaffected by session expiry.
 */
export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('rotary_clubs')
      .select(
        'club_id, nf_id, club_name, club_type, city, state, country, active_members, assistant_governor, synced_at',
      )
      .order('active_members', { ascending: false })

    if (error) throw error

    const clubs = data ?? []
    const syncedAt = clubs.reduce<string | null>((latest, c) => {
      const s = (c as { synced_at?: string | null }).synced_at ?? null
      return s && (!latest || s > latest) ? s : latest
    }, null)

    return NextResponse.json({
      count: clubs.length,
      totalMembers: clubs.reduce(
        (sum, c) => sum + ((c as { active_members?: number }).active_members ?? 0),
        0,
      ),
      syncedAt,
      clubs,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
