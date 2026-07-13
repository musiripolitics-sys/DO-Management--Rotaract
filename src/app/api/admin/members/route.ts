import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, ADMIN_TIER } from '@/lib/session'

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
          'id, full_name, email, designation, club_id, club_position, clubs:club_id(name), total_points, ri_id, phone_number, created_at',
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

    const clubName = (v: unknown): string | null => {
      const c = Array.isArray(v) ? v[0] : v
      return (c as { name?: string } | null)?.name ?? null
    }

    const members = (profilesRes.data ?? []).map((p) => ({
      ...p,
      club_name: clubName(p.clubs),
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

const DEFAULT_PASSWORD = 'Rotaract@3233'

// POST — admin creates a member (optionally inside a club).
export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const email = (body.email ?? '').trim().toLowerCase()
    const fullName = (body.full_name ?? '').trim()
    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required.' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { error: authError } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (authError) {
      if (authError.message.toLowerCase().includes('already exists')) {
        return NextResponse.json({ error: 'A member with this email already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const clean = (v: unknown) => {
      const s = typeof v === 'string' ? v.trim() : ''
      return s === '' ? null : s
    }
    const update: Record<string, unknown> = {
      full_name: fullName,
      ri_id: clean(body.ri_id),
      phone_number: clean(body.phone_number),
      gender: clean(body.gender),
      date_of_birth: clean(body.date_of_birth),
      avenue: clean(body.avenue),
      membership_type: clean(body.membership_type),
      join_date: clean(body.join_date),
      rotary_year: clean(body.rotary_year),
      membership_status: clean(body.membership_status) ?? 'active',
      club_id: body.club_id || null,
      club_position: ['president', 'secretary', 'treasurer', 'member'].includes(body.club_position)
        ? body.club_position
        : 'member',
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('email', email)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, member: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
