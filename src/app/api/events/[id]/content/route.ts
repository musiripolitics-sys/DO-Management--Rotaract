import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, ADMIN_TIER } from '@/lib/session'

/* ────────────────────────────────────────────────────────────────
 * Landing-page content for an event: description, logo, agenda,
 * speakers. Admin-only. NOT available for DRC events — DRCs run
 * through the club booking flow, so their landing content stays
 * out of this editor by design.
 * ────────────────────────────────────────────────────────────── */

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
  return hasAccess(s?.role, ADMIN_TIER)
}

type Params = { params: Promise<{ id: string }> }

/** "table doesn't exist" — schema_event_page.sql not applied yet. */
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return err.code === '42P01' || err.code === 'PGRST205' || /schema cache/i.test(err.message ?? '')
}

const isDrc = (category: string | null | undefined) => (category ?? '').trim().toLowerCase() === 'drc'

async function loadEvent(id: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Record<string, unknown> | null
}

// ── GET: current landing content ────────────────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const event = await loadEvent(id)
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (isDrc(event.category as string | null)) {
      return NextResponse.json(
        { error: 'Landing-page content is managed for events only, not DRCs.' },
        { status: 403 },
      )
    }

    const supabase = getAdminClient()
    const [agendaRes, speakersRes] = await Promise.all([
      supabase
        .from('event_agenda')
        .select('time_label, title, description')
        .eq('event_id', id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('event_speakers')
        .select('name, designation, photo_url')
        .eq('event_id', id)
        .order('sort_order', { ascending: true }),
    ])

    const tablesReady = !(isMissingTable(agendaRes.error) || isMissingTable(speakersRes.error))
    if (agendaRes.error && !isMissingTable(agendaRes.error)) throw new Error(agendaRes.error.message)
    if (speakersRes.error && !isMissingTable(speakersRes.error)) throw new Error(speakersRes.error.message)

    return NextResponse.json({
      description: (event.description as string | null) ?? '',
      logo_url: (event.logo_url as string | null) ?? '',
      agenda: agendaRes.data ?? [],
      speakers: speakersRes.data ?? [],
      tablesReady,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// ── PUT: replace landing content ────────────────────────────────────────────
export async function PUT(request: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const event = await loadEvent(id)
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (isDrc(event.category as string | null)) {
      return NextResponse.json(
        { error: 'Landing-page content is managed for events only, not DRCs.' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const logoUrl = typeof body.logo_url === 'string' ? body.logo_url.trim() : ''

    type AgendaIn = { time_label?: string; title?: string; description?: string }
    type SpeakerIn = { name?: string; designation?: string; photo_url?: string }

    const agenda = (Array.isArray(body.agenda) ? (body.agenda as AgendaIn[]) : [])
      .map((a) => ({
        time_label: (a.time_label ?? '').trim() || null,
        title: (a.title ?? '').trim(),
        description: (a.description ?? '').trim() || null,
      }))
      .filter((a) => a.title.length > 0)

    const speakers = (Array.isArray(body.speakers) ? (body.speakers as SpeakerIn[]) : [])
      .map((s) => ({
        name: (s.name ?? '').trim(),
        designation: (s.designation ?? '').trim() || null,
        photo_url: (s.photo_url ?? '').trim() || null,
      }))
      .filter((s) => s.name.length > 0)

    const supabase = getAdminClient()

    /* Event fields. logo_url only exists after schema_event_page.sql —
     * retry without it so description edits still work pre-migration. */
    let evErr = (
      await supabase.from('events').update({ description: description || null, logo_url: logoUrl || null }).eq('id', id)
    ).error
    if (evErr && /logo_url/.test(evErr.message)) {
      evErr = (await supabase.from('events').update({ description: description || null }).eq('id', id)).error
    }
    if (evErr) throw new Error(evErr.message)

    /* Replace agenda + speakers wholesale (small lists, simplest correct). */
    for (const [table, rows] of [
      ['event_agenda', agenda.map((a, i) => ({ ...a, event_id: id, sort_order: i + 1 }))],
      ['event_speakers', speakers.map((s, i) => ({ ...s, event_id: id, sort_order: i + 1 }))],
    ] as const) {
      const del = await supabase.from(table).delete().eq('event_id', id)
      if (del.error) {
        if (isMissingTable(del.error)) {
          return NextResponse.json(
            { error: 'Agenda/speaker tables are missing — run supabase/schema_event_page.sql in the Supabase SQL editor first.' },
            { status: 400 },
          )
        }
        throw new Error(del.error.message)
      }
      if (rows.length > 0) {
        const ins = await supabase.from(table).insert(rows)
        if (ins.error) throw new Error(ins.error.message)
      }
    }

    return NextResponse.json({ ok: true, agenda: agenda.length, speakers: speakers.length })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
