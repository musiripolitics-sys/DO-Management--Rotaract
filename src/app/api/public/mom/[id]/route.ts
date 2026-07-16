import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  computeCompletion,
  computeStats,
  type MomUpdate,
  type UpdateSource,
} from '@/lib/mom'

/* ────────────────────────────────────────────────────────────────
 * Public read of a PUBLISHED Minutes of Meeting — powers /mom/[id],
 * linked from the homepage and the presidents' notification email.
 * Drafts stay invisible (404).
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

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const supabase = getAdminClient()

    const { data: meeting, error: mErr } = await supabase
      .from('mom_meetings')
      .select('*, event:events(name, event_date, start_time, location)')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle()
    if (mErr || !meeting) {
      return NextResponse.json({ error: 'Minutes not found' }, { status: 404 })
    }

    const { data: updateRows } = await supabase
      .from('mom_updates')
      .select('*')
      .eq('mom_id', id)
      .order('created_at', { ascending: true })

    const updateIds = (updateRows ?? []).map((u) => u.id)

    const [completed, upcoming, cohost, actions] = await Promise.all([
      updateIds.length
        ? supabase.from('mom_completed_projects').select('*').in('update_id', updateIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      updateIds.length
        ? supabase.from('mom_upcoming_projects').select('*').in('update_id', updateIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      updateIds.length
        ? supabase.from('mom_cohost_proposals').select('*').in('update_id', updateIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      updateIds.length
        ? supabase.from('mom_action_items').select('*').in('update_id', updateIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ])

    const group = <T extends { update_id: string }>(rows: T[] | null | undefined) => {
      const m = new Map<string, T[]>()
      for (const r of rows ?? []) {
        const list = m.get(r.update_id) ?? []
        list.push(r)
        m.set(r.update_id, list)
      }
      return m
    }
    const cMap = group(completed.data as { update_id: string }[])
    const uMap = group(upcoming.data as { update_id: string }[])
    const hMap = group(cohost.data as { update_id: string }[])
    const aMap = group(actions.data as { update_id: string }[])

    const updates: MomUpdate[] = (updateRows ?? []).map((u) => ({
      id: u.id,
      mom_id: u.mom_id,
      source: u.source as UpdateSource,
      source_ref: u.source_ref,
      general_updates: u.general_updates,
      sort_order: u.sort_order,
      completed_projects: (cMap.get(u.id) ?? []) as unknown as MomUpdate['completed_projects'],
      upcoming_projects: (uMap.get(u.id) ?? []) as unknown as MomUpdate['upcoming_projects'],
      cohost_proposals: (hMap.get(u.id) ?? []) as unknown as MomUpdate['cohost_proposals'],
      action_items: (aMap.get(u.id) ?? []) as unknown as MomUpdate['action_items'],
    }))

    const { count: registeredClubs } = await supabase
      .from('drc_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', meeting.event_id)

    return NextResponse.json({
      meeting,
      updates,
      completion: computeCompletion(updates, registeredClubs ?? 0),
      stats: computeStats(updates),
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
