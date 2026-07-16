import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, MOM_TIER } from '@/lib/session'
import { sendMomPublishedEmail } from '@/lib/email'
import {
  computeCompletion,
  computeStats,
  type MomUpdate,
  type UpdateSource,
} from '@/lib/mom'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireAdmin() {
  const s = await getSession()
  return hasAccess(s?.role, MOM_TIER)
}

type Params = { params: Promise<{ id: string }> }

// GET — full MoM: meeting + updates (nested) + completion + stats.
export async function GET(_req: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const supabase = getAdminClient()

    const { data: meeting, error: mErr } = await supabase
      .from('mom_meetings')
      .select('*, event:events(name, event_date, start_time, location)')
      .eq('id', id)
      .single()
    if (mErr || !meeting) {
      return NextResponse.json({ error: 'MoM not found' }, { status: 404 })
    }

    const { data: updateRows } = await supabase
      .from('mom_updates')
      .select('*')
      .eq('mom_id', id)
      .order('created_at', { ascending: true })

    const updateIds = (updateRows ?? []).map((u) => u.id)

    // Fetch all children in bulk
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

    // Registered clubs for this DRC meeting = drc_bookings for the event
    const { count: registeredClubs } = await supabase
      .from('drc_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', meeting.event_id)

    return NextResponse.json({
      meeting,
      updates,
      completion: computeCompletion(updates, registeredClubs ?? 0),
      stats: computeStats(updates),
      registeredClubs: registeredClubs ?? 0,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// PATCH — edit meeting meta / publish / unpublish.
export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const supabase = getAdminClient()

    /* Current status — so we email presidents only on the draft→published edge. */
    const { data: before } = await supabase
      .from('mom_meetings')
      .select('status, event:events(name, event_date)')
      .eq('id', id)
      .maybeSingle()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('meeting_number' in body) updates.meeting_number = body.meeting_number?.trim() || null
    if ('venue' in body) updates.venue = body.venue?.trim() || null
    if ('chairperson' in body) updates.chairperson = body.chairperson?.trim() || null
    if ('status' in body) {
      if (!['draft', 'published'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
      updates.published_at = body.status === 'published' ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from('mom_meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    /* Notify all club presidents when the MoM goes live (non-blocking failure). */
    let emailed = 0
    if (body.status === 'published' && before?.status !== 'published') {
      const { data: presidents } = await supabase
        .from('profiles')
        .select('email')
        .eq('access_role', 'president')
        .not('email', 'is', null)
      const emails = Array.from(new Set((presidents ?? []).map((p) => p.email as string).filter(Boolean)))
      if (emails.length > 0) {
        const ev = Array.isArray(before?.event) ? before?.event[0] : before?.event
        const result = await sendMomPublishedEmail({
          momId: id,
          eventName: (ev as { name?: string } | null)?.name ?? 'DRC Meeting',
          eventDate: (ev as { event_date?: string } | null)?.event_date
            ? new Date((ev as { event_date: string }).event_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : null,
          meetingNumber: (data.meeting_number as string | null) ?? null,
          venue: (data.venue as string | null) ?? null,
          presidentEmails: emails,
        })
        if (result.success) emailed = emails.length
        else console.error('[mom] publish email failed:', result.error)
      }
    }

    return NextResponse.json({ success: true, mom: data, emailed })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// DELETE — remove the MoM (cascades to all updates + children).
export async function DELETE(_req: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const supabase = getAdminClient()
    const { error } = await supabase.from('mom_meetings').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
