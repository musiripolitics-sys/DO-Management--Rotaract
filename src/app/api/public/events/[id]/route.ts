import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ────────────────────────────────────────────────────────────────
 * Public event landing-page payload: event details, club
 * registration leaderboard (from drc_bookings), agenda, speakers.
 * Agenda/speaker tables may not exist yet (see
 * supabase/schema_event_page.sql) — treated as empty.
 * ────────────────────────────────────────────────────────────── */

export const revalidate = 60

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const normName = (s: string | null | undefined) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** "table doesn't exist" — schema_event_page.sql not applied yet. */
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return err.code === '42P01' || err.code === 'PGRST205' || /schema cache/i.test(err.message ?? '')
}

type ClubRow = { name: string; attendees: number; bookings: number; share: number }

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const [eventRes, bookingsRes, clubTypesRes, agendaRes, speakersRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).maybeSingle(),
      supabase.from('drc_bookings').select('club_name, attendee_count').eq('event_id', id),
      supabase.from('clubs').select('name, club_type'),
      supabase
        .from('event_agenda')
        .select('time_label, title, description, sort_order')
        .eq('event_id', id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('event_speakers')
        .select('name, designation, photo_url, sort_order')
        .eq('event_id', id)
        .order('sort_order', { ascending: true }),
    ])

    if (eventRes.error) {
      return NextResponse.json({ error: eventRes.error.message }, { status: 500 })
    }
    if (!eventRes.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const ev = eventRes.data as Record<string, unknown>
    const event = {
      id: ev.id,
      name: ev.name,
      description: ev.description ?? null,
      category: ev.category ?? null,
      location: ev.location ?? null,
      event_date: ev.event_date,
      end_date: ev.end_date ?? null,
      start_time: ev.start_time,
      end_time: ev.end_time ?? null,
      logo_url: (ev.logo_url as string | undefined) ?? null,
    }

    /* ── Registration leaderboard: aggregate bookings per club,
     *    split by official club type. ── */
    const typeByName = new Map<string, string>()
    for (const c of clubTypesRes.data ?? []) {
      if (c.name) typeByName.set(normName(c.name), c.club_type ?? 'community')
    }

    const byClub = new Map<string, { name: string; attendees: number; bookings: number }>()
    for (const b of bookingsRes.data ?? []) {
      const key = normName(b.club_name)
      if (!key) continue
      const cur = byClub.get(key) ?? { name: b.club_name, attendees: 0, bookings: 0 }
      cur.attendees += b.attendee_count ?? 0
      cur.bookings += 1
      byClub.set(key, cur)
    }

    const college: ClubRow[] = []
    const community: ClubRow[] = []
    let totalAttendees = 0
    for (const [key, row] of byClub) {
      totalAttendees += row.attendees
      const bucket = typeByName.get(key) === 'college' ? college : community
      bucket.push({ ...row, share: 0 })
    }
    const rank = (rows: ClubRow[]) => {
      rows.sort((a, b) => b.attendees - a.attendees)
      const segTotal = rows.reduce((s, r) => s + r.attendees, 0)
      return rows.slice(0, 5).map((r) => ({
        ...r,
        share: segTotal ? Math.round((r.attendees / segTotal) * 100) : 0,
      }))
    }

    const leaderboard = {
      college: rank(college),
      community: rank(community),
      totals: {
        clubs: byClub.size,
        attendees: totalAttendees,
        collegeClubs: college.length,
        communityClubs: community.length,
      },
    }

    /* ── Agenda + speakers (tables may not exist yet) ── */
    const agenda = agendaRes.error
      ? isMissingTable(agendaRes.error)
        ? []
        : (() => {
            throw new Error(agendaRes.error.message)
          })()
      : (agendaRes.data ?? [])

    const speakers = speakersRes.error
      ? isMissingTable(speakersRes.error)
        ? []
        : (() => {
            throw new Error(speakersRes.error.message)
          })()
      : (speakersRes.data ?? [])

    return NextResponse.json({ event, leaderboard, agenda, speakers })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
