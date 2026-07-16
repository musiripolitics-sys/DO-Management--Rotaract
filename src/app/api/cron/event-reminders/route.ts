import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEventReminderEmail } from '@/lib/email'

/* ────────────────────────────────────────────────────────────────
 * 24-hour event reminders.
 *
 * Called hourly by the Vercel cron declared in vercel.json. Vercel signs
 * cron requests with `Authorization: Bearer $CRON_SECRET` automatically,
 * which is what the auth check below expects.
 *
 * Finds bookings for events that start within the next 24 hours and
 * emails the officer who booked, once per booking:
 *
 *  - Normal mode: dedupes via drc_bookings.reminder_sent_at
 *    (added by supabase/schema_event_emails.sql).
 *  - Fallback mode (column missing): only processes events starting
 *    23–24h out, so an hourly schedule still sends roughly once.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` or `?key=$CRON_SECRET`.
 * Dry run: `?dry=1` reports what would be sent without sending.
 * ────────────────────────────────────────────────────────────── */

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

const missingColumn = (msg: string | undefined) => /reminder_sent_at/i.test(msg ?? '')

export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
    }
    const url = new URL(request.url)
    const provided =
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('key') ?? ''
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const dryRun = url.searchParams.get('dry') === '1'

    const supabase = getAdminClient()
    const now = Date.now()
    const in24h = new Date(now + 24 * 3600_000).toISOString()
    const nowIso = new Date(now).toISOString()

    /* Events entering the reminder window. */
    const { data: events, error: evErr } = await supabase
      .from('events')
      .select('id, name, location, event_date, start_time')
      .gt('start_time', nowIso)
      .lte('start_time', in24h)
    if (evErr) throw new Error(evErr.message)
    if (!events || events.length === 0) {
      return NextResponse.json({ ok: true, dryRun, events: 0, sent: 0, skipped: 0, failures: 0 })
    }

    /* Bookings still needing a reminder. Try the dedupe column first. */
    const eventIds = events.map((e) => e.id)
    let mode: 'tracked' | 'fallback-window' = 'tracked'
    let bookings: {
      id: string
      event_id: string
      club_name: string
      attendee_count: number
      profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
    }[] = []

    const tracked = await supabase
      .from('drc_bookings')
      .select('id, event_id, club_name, attendee_count, profiles!booked_by(full_name, email)')
      .in('event_id', eventIds)
      .is('reminder_sent_at', null)

    if (tracked.error) {
      if (!missingColumn(tracked.error.message)) throw new Error(tracked.error.message)
      /* Column not migrated yet — narrow to the 23–24h window instead. */
      mode = 'fallback-window'
      const in23h = new Date(now + 23 * 3600_000).toISOString()
      const windowIds = events.filter((e) => e.start_time > in23h).map((e) => e.id)
      if (windowIds.length > 0) {
        const fb = await supabase
          .from('drc_bookings')
          .select('id, event_id, club_name, attendee_count, profiles!booked_by(full_name, email)')
          .in('event_id', windowIds)
        if (fb.error) throw new Error(fb.error.message)
        bookings = fb.data ?? []
      }
    } else {
      bookings = tracked.data ?? []
    }

    const eventById = new Map(events.map((e) => [e.id, e]))
    let sent = 0
    let skipped = 0
    let failures = 0
    const preview: { to: string; event: string; club: string }[] = []

    for (const b of bookings) {
      const ev = eventById.get(b.event_id)
      const officer = one(b.profiles)
      if (!ev || !officer?.email) {
        skipped++
        continue
      }

      if (dryRun) {
        preview.push({ to: officer.email, event: ev.name, club: b.club_name })
        continue
      }

      const dt = new Date(ev.start_time)
      const eventDate = `${new Date(ev.event_date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })} · ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

      const result = await sendEventReminderEmail({
        recipientName: officer.full_name ?? 'Officer',
        recipientEmail: officer.email,
        eventId: ev.id,
        eventName: ev.name,
        eventDate,
        eventLocation: ev.location,
        clubName: b.club_name,
        attendeeCount: b.attendee_count,
      })

      if (result.success) {
        sent++
        if (mode === 'tracked') {
          await supabase
            .from('drc_bookings')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', b.id)
        }
      } else {
        failures++
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      mode,
      events: events.length,
      candidates: bookings.length,
      sent,
      skipped,
      failures,
      ...(dryRun ? { wouldSend: preview } : {}),
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
