import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const email = cookieStore.get('vibe_member')?.value
    if (!email) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: attendance } = await supabase
      .from('attendance')
      .select('id, event_id, points_awarded, status, check_in_time, events(name, event_date)')
      .eq('user_id', profile.id)
      .order('check_in_time', { ascending: false })
      .limit(10)

    const { data: rankRow } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .gt('total_points', profile.total_points || 0)

    const rank = (rankRow ? rankRow.length : 0) + 1

    // Upcoming events (next 8, not yet started)
    const { data: upcomingEvents } = await supabase
      .from('events')
      .select('id, name, location, event_date, start_time, end_date, category')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(8)

    return NextResponse.json({
      profile,
      attendance: attendance ?? [],
      rank,
      upcomingEvents: upcomingEvents ?? [],
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// ── PATCH: update editable profile fields ────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const email = cookieStore.get('vibe_member')?.value
    if (!email) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = await request.json()

    // Only allow members to update these fields — never designation, club, points, etc.
    const allowed = [
      'full_name',
      'phone_number',
      'address',
      'date_of_birth',
      't_shirt_size',
      'blood_group',
      'willing_to_donate_blood',
    ] as const

    type AllowedKey = (typeof allowed)[number]

    const updates: Partial<Record<AllowedKey, string | null>> = {}
    for (const key of allowed) {
      if (key in body) {
        const val = body[key]
        updates[key] = typeof val === 'string' && val.trim() !== '' ? val.trim() : null
      }
    }

    if (!updates.full_name) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('email', email)
      .select('*')
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: error?.message ?? 'Update failed' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, profile })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
