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

async function requireAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('vibe_admin')?.value === '1'
}

type Params = { params: Promise<{ id: string }> }

// ── PATCH: admin edits a member's profile ───────────────────────────────────
export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Admins can change these — but NEVER email (auth identity) or total_points (system)
    const allowed = ['full_name', 'designation', 'club_name', 'ri_id', 'phone_number'] as const
    type AllowedKey = (typeof allowed)[number]

    const updates: Partial<Record<AllowedKey, string | null>> = {}
    for (const key of allowed) {
      if (key in body) {
        const v = body[key]
        updates[key] = typeof v === 'string' && v.trim() !== '' ? v.trim() : null
      }
    }

    if (!updates.full_name) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? 'Update failed' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, member: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
