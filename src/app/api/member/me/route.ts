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
      .select('id, points_awarded, status, check_in_time, events(name, event_date)')
      .eq('user_id', profile.id)
      .order('check_in_time', { ascending: false })
      .limit(10)

    const { data: rankRow } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: false })
      .gt('total_points', profile.total_points || 0)

    const rank = (rankRow ? rankRow.length : 0) + 1

    return NextResponse.json({ profile, attendance: attendance ?? [], rank })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
