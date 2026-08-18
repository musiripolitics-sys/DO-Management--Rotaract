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

// Reset-password and account-delete are super-admin-only, not the whole
// admin tier (DRR/ADRR can edit members but not wipe accounts).
async function requireSuperAdmin() {
  const s = await getSession()
  return s?.role === 'super_admin'
}

type Params = { params: Promise<{ id: string }> }

// ── POST: super-admin account actions (reset password / delete user) ────────
export async function POST(request: Request, { params }: Params) {
  try {
    if (!(await requireSuperAdmin())) {
      return NextResponse.json({ error: 'Only the super admin can do this.' }, { status: 403 })
    }
    const { id } = await params
    const { action } = await request.json()
    const supabase = getAdminClient()

    if (action === 'reset_password') {
      // Clearing the hash sends the user through "create a new password" at
      // their next sign-in — no email/link needed.
      const { error } = await supabase.from('profiles').update({ password_hash: null }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      // Clear the two references that would otherwise block the delete
      // (events.created_by and profiles.referred_by have no ON DELETE rule).
      // Everything else (attendance, bookings, feedback, reset tokens)
      // cascades or nulls automatically.
      await supabase.from('events').update({ created_by: null }).eq('created_by', id)
      await supabase.from('profiles').update({ referred_by: null }).eq('referred_by', id)
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// ── PATCH: admin edits a member's profile ───────────────────────────────────
export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Admins can change these — but NEVER email (auth identity) or total_points (system)
    const allowed = [
      'full_name', 'designation', 'ri_id', 'phone_number', 'avenue',
      'gender', 'date_of_birth', 'membership_type', 'join_date', 'rotary_year', 'membership_status',
    ] as const
    type AllowedKey = (typeof allowed)[number]

    const updates: Record<string, string | null> = {}
    for (const key of allowed) {
      if (key in body) {
        const v = body[key]
        updates[key] = typeof v === 'string' && v.trim() !== '' ? v.trim() : null
      }
    }

    // Club + officer position (nullable club_id moves a member out of a club)
    if ('club_id' in body) updates.club_id = body.club_id || null
    if ('club_position' in body) {
      const pos = body.club_position
      if (!['president', 'secretary', 'treasurer', 'member'].includes(pos)) {
        return NextResponse.json({ error: 'Invalid club position' }, { status: 400 })
      }
      updates.club_position = pos
    }

    if ('full_name' in updates && !updates.full_name) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const newPos = updates.club_position
    if (newPos) {
      const { data: cur } = await supabase
        .from('profiles')
        .select('club_id, access_role')
        .eq('id', id)
        .single()

      // Keep access_role in sync with the club seat — but only within the
      // member/president/secretary band. District/sergeant roles are managed
      // in the Role Manager and are never clobbered from here.
      const syncBand = ['member', 'president', 'secretary']
      if (syncBand.includes(cur?.access_role ?? 'member')) {
        updates.access_role =
          newPos === 'president' ? 'president' : newPos === 'secretary' ? 'secretary' : 'member'
      }

      // Officer positions are exclusive per club: setting a President/Secretary/
      // Treasurer demotes whoever currently holds that seat in the same club —
      // including their portal access if it came from that seat.
      if (newPos !== 'member') {
        const clubId = (updates.club_id as string | undefined) ?? cur?.club_id ?? undefined
        if (clubId) {
          if (newPos === 'president' || newPos === 'secretary') {
            await supabase
              .from('profiles')
              .update({ access_role: 'member' })
              .eq('club_id', clubId)
              .eq('club_position', newPos)
              .eq('access_role', newPos)
              .neq('id', id)
          }
          await supabase
            .from('profiles')
            .update({ club_position: 'member' })
            .eq('club_id', clubId)
            .eq('club_position', newPos)
            .neq('id', id)
        }
      }
    }

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

// ── DELETE: remove a member from their club (keeps the account) ──────────────
export async function DELETE(_req: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const supabase = getAdminClient()

    // Removing a member from their club also revokes club-seat access —
    // a president/secretary without a club has nothing to manage.
    const { data: cur } = await supabase.from('profiles').select('access_role').eq('id', id).single()
    const demote = cur?.access_role === 'president' || cur?.access_role === 'secretary'

    const { error } = await supabase
      .from('profiles')
      .update({
        club_id: null,
        club_position: 'member',
        ...(demote ? { access_role: 'member' } : {}),
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
