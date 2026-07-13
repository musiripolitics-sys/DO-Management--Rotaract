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

// GET — all clubs with member count + the three officers.
export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const supabase = getAdminClient()

    const [clubsRes, membersRes] = await Promise.all([
      supabase.from('clubs').select('*').order('name', { ascending: true }),
      supabase.from('profiles').select('id, full_name, club_id, club_position'),
    ])
    if (clubsRes.error) return NextResponse.json({ error: clubsRes.error.message }, { status: 500 })

    const counts = new Map<string, number>()
    const officers = new Map<string, { president?: string; secretary?: string; treasurer?: string }>()
    for (const m of membersRes.data ?? []) {
      if (!m.club_id) continue
      counts.set(m.club_id, (counts.get(m.club_id) ?? 0) + 1)
      if (m.club_position && m.club_position !== 'member') {
        const o = officers.get(m.club_id) ?? {}
        o[m.club_position as 'president' | 'secretary' | 'treasurer'] = m.full_name ?? '—'
        officers.set(m.club_id, o)
      }
    }

    const clubs = (clubsRes.data ?? []).map((c) => ({
      ...c,
      member_count: counts.get(c.id) ?? 0,
      officers: officers.get(c.id) ?? {},
    }))

    // Distinct parent rotary clubs for the filter dropdown
    const parents = Array.from(
      new Set((clubsRes.data ?? []).map((c) => c.parent_rotary_club).filter(Boolean)),
    ).sort() as string[]

    return NextResponse.json({ clubs, parents, total: clubs.length })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// POST — create a club.
export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'Club name is required' }, { status: 400 })
    }

    const insert: Record<string, unknown> = {}
    for (const f of CLUB_EDITABLE_FIELDS) {
      if (f in body) {
        const v = body[f]
        insert[f] = typeof v === 'string' && v.trim() === '' ? null : v
      }
    }
    insert.name = String(body.name).trim()
    if (!insert.club_type) insert.club_type = 'community'
    if (!insert.status) insert.status = 'active'

    const supabase = getAdminClient()
    const { data, error } = await supabase.from('clubs').insert(insert).select().single()
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
