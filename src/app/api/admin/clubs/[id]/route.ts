import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, hasAccess, ADMIN_TIER } from '@/lib/session'
import { CLUB_EDITABLE_FIELDS } from '@/lib/clubs'

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

// GET — club detail + officers + members.
export async function GET(_req: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const supabase = getAdminClient()

    const { data: club, error } = await supabase.from('clubs').select('*').eq('id', id).single()
    if (error || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const { data: members } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, phone_number, avenue, club_position, designation, total_points, ri_id, gender, date_of_birth, membership_type, join_date, rotary_year, membership_status',
      )
      .eq('club_id', id)
      .order('club_position', { ascending: true })
      .order('full_name', { ascending: true })

    const list = members ?? []
    const officers = {
      president: list.find((m) => m.club_position === 'president') ?? null,
      secretary: list.find((m) => m.club_position === 'secretary') ?? null,
      treasurer: list.find((m) => m.club_position === 'treasurer') ?? null,
    }

    return NextResponse.json({ club, members: list, officers, memberCount: list.length })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// PATCH — edit club fields.
export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const f of CLUB_EDITABLE_FIELDS) {
      if (f in body) {
        const v = body[f]
        updates[f] = typeof v === 'string' && v.trim() === '' ? null : v
      }
    }
    if ('name' in updates && !String(updates.name ?? '').trim()) {
      return NextResponse.json({ error: 'Club name is required' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase.from('clubs').update(updates).eq('id', id).select().single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A club with this name already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, club: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// DELETE — remove a club only if it has no members (else block).
export async function DELETE(_req: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const supabase = getAdminClient()

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', id)
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `This club has ${count} member(s). Reassign or set it inactive instead of deleting.` },
        { status: 409 },
      )
    }

    const { error } = await supabase.from('clubs').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
