import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/session'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireAdmin() {
  return isAdminRequest()
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const [profilesRes, attendanceRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, full_name, email, designation, club_name, total_points, ri_id, phone_number, created_at',
        )
        .order('total_points', { ascending: false, nullsFirst: false }),
      supabase.from('attendance').select('user_id'),
    ])

    if (profilesRes.error) {
      return NextResponse.json({ error: profilesRes.error.message }, { status: 500 })
    }

    // Count attendance per member
    const attMap = new Map<string, number>()
    for (const row of attendanceRes.data ?? []) {
      attMap.set(row.user_id, (attMap.get(row.user_id) ?? 0) + 1)
    }

    const members = (profilesRes.data ?? []).map((p) => ({
      ...p,
      attendance_count: attMap.get(p.id) ?? 0,
    }))

    // Unique clubs for filter dropdown
    const clubs = Array.from(
      new Set(members.map((m) => m.club_name).filter(Boolean)),
    ).sort() as string[]

    return NextResponse.json({ members, clubs, total: members.length })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
