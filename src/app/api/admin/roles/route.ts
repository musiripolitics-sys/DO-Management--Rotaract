import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, ASSIGNABLE_ROLES, type AccessRole } from '@/lib/session'

/* ────────────────────────────────────────────────────────────────
 * Role manager — SUPER ADMIN ONLY.
 * The super admin (env account) can reassign any member's
 * access_role. `super_admin` itself is env-based and can never be
 * granted to a DB profile.
 * ────────────────────────────────────────────────────────────── */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireSuperAdmin() {
  const s = await getSession()
  return s?.role === 'super_admin'
}

// GET — all profiles with their current access role.
export async function GET() {
  try {
    if (!(await requireSuperAdmin())) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, designation, access_role, clubs:club_id(name)')
      .order('full_name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const members = (data ?? []).map((p) => {
      const c = Array.isArray(p.clubs) ? p.clubs[0] : p.clubs
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        designation: p.designation,
        access_role: p.access_role ?? 'member',
        club_name: (c as { name?: string } | null)?.name ?? null,
      }
    })

    return NextResponse.json({ members, roles: ASSIGNABLE_ROLES })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// PATCH — change one member's access role, or reset their password.
export async function PATCH(request: Request) {
  try {
    if (!(await requireSuperAdmin())) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const body = await request.json()
    const id: string = body.id
    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // ── Password reset: clear the hash → member re-creates it on next sign-in.
    if (body.reset_password === true) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ password_hash: null })
        .eq('id', id)
        .select('id, full_name')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, member: data, reset: true })
    }

    // ── Role change ─────────────────────────────────────────────────
    const role: string = body.access_role
    if (!role) {
      return NextResponse.json({ error: 'access_role is required.' }, { status: 400 })
    }
    if (!ASSIGNABLE_ROLES.includes(role as AccessRole)) {
      return NextResponse.json({ error: `"${role}" is not an assignable role.` }, { status: 400 })
    }

    // Granting a club-officer role also claims the club seat (exclusive):
    // the current holder in that club is demoted, and the target's
    // club_position follows. Granting district roles leaves seats alone —
    // a DRR can still be their club's president in the directory.
    const updates: Record<string, string> = { access_role: role }
    if (role === 'president' || role === 'secretary') {
      const { data: target } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('id', id)
        .single()
      if (target?.club_id) {
        await supabase
          .from('profiles')
          .update({ access_role: 'member' })
          .eq('club_id', target.club_id)
          .eq('club_position', role)
          .eq('access_role', role)
          .neq('id', id)
        await supabase
          .from('profiles')
          .update({ club_position: 'member' })
          .eq('club_id', target.club_id)
          .eq('club_position', role)
          .neq('id', id)
        updates.club_position = role
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, full_name, access_role')
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
