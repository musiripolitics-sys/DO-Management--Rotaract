import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, SCAN_TIER } from '@/lib/session'

const POINTS_ON_TIME = 150        // before start time
const POINTS_WITHIN_15_MIN = 125  // 0–15 min after start
const POINTS_WITHIN_30_MIN = 100  // 15–30 min after start
const POINTS_LATE = 50            // more than 30 min after start

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: Request) {
  try {
    // 1. Must be admin-tier OR sergeant to use the scanner
    const session = await getSession()
    if (!hasAccess(session?.role, SCAN_TIER)) {
      return NextResponse.json({ error: 'Unauthorized scan attempt' }, { status: 401 })
    }

    const body = await request.json()
    const { qr_identity, email, event_id } = body

    if (!event_id || (!qr_identity && !email)) {
      return NextResponse.json({ error: 'Missing qr_identity/email or event_id' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Look up by qr_identity first (preferred), fall back to email (legacy QR codes)
    let query = supabase
      .from('profiles')
      .select('id, full_name, email')

    if (qr_identity) {
      query = query.eq('qr_identity', String(qr_identity).toLowerCase())
    } else {
      // ilike = case-insensitive — handles emails stored with mixed case
      query = query.ilike('email', String(email).trim())
    }

    const { data: profile, error: profileError } = await query.maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Member not found — invalid QR code' }, { status: 404 })
    }

    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', profile.id)
      .eq('event_id', event_id)
      .maybeSingle()

    if (existingAttendance) {
      return NextResponse.json({ error: `${profile.full_name || profile.email} has already checked in` }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('start_time')
      .eq('id', event_id)
      .single()

    let pointsAwarded = POINTS_LATE
    let status: 'on-time' | 'within-15' | 'within-30' | 'late' = 'late'

    if (event && !eventError) {
      const now = new Date().getTime()
      const startTime = new Date(event.start_time).getTime()
      const minutesAfterStart = (now - startTime) / 60000

      if (minutesAfterStart <= 0) {
        pointsAwarded = POINTS_ON_TIME
        status = 'on-time'
      } else if (minutesAfterStart <= 15) {
        pointsAwarded = POINTS_WITHIN_15_MIN
        status = 'within-15'
      } else if (minutesAfterStart <= 30) {
        pointsAwarded = POINTS_WITHIN_30_MIN
        status = 'within-30'
      } else {
        pointsAwarded = POINTS_LATE
        status = 'late'
      }
    }

    const { error: insertError } = await supabase.from('attendance').insert({
      user_id: profile.id,
      event_id,
      check_in_time: new Date().toISOString(),
      points_awarded: pointsAwarded,
      status,
      // Audit: record the scanning official's profile id (null for super admin)
      ...(session?.profileId ? { scanned_by: session.profileId } : {}),
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await supabase.rpc('increment_user_points', {
      p_user_id: profile.id,
      p_points: pointsAwarded,
    })

    return NextResponse.json({
      success: true,
      points: pointsAwarded,
      status,
      member: profile.full_name || profile.email,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
