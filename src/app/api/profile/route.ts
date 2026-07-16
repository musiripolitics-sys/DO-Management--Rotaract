import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getSession,
  dashboardForRole,
  signSession,
  SESSION_COOKIE,
  COOKIE_OPTS,
} from '@/lib/session'
import { computeCompletion } from '@/lib/profile-completion'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const clean = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

const PROFILE_SELECT =
  'id, full_name, email, phone_number, date_of_birth, gender, club_id, ri_id, avenue, address, blood_group, t_shirt_size'

// GET — the signed-in member's profile + completion + club options.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    // Super admin has no DB profile and never needs completion.
    if (session.role === 'super_admin' || !session.email) {
      return NextResponse.json({
        superAdmin: true,
        completion: { fields: [], percent: 100, isComplete: true, missing: [] },
        dashboard: dashboardForRole(session.role),
      })
    }

    const supabase = getAdminClient()
    const [{ data: profile }, { data: clubs }] = await Promise.all([
      supabase.from('profiles').select(PROFILE_SELECT).ilike('email', session.email).maybeSingle(),
      supabase.from('clubs').select('id, name, club_type').eq('status', 'active').order('name'),
    ])
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    return NextResponse.json({
      profile,
      clubs: clubs ?? [],
      completion: computeCompletion(profile),
      dashboard: dashboardForRole(session.role),
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// PATCH — member self-updates their own profile (the completion form).
export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session?.email || session.role === 'super_admin') {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const supabase = getAdminClient()
    const { data: cur } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', session.email)
      .maybeSingle()
    if (!cur) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Plain self-editable fields.
    for (const k of ['full_name', 'phone_number', 'date_of_birth', 'gender', 'ri_id', 'avenue', 'address', 'blood_group', 't_shirt_size']) {
      if (k in body) updates[k] = clean(body[k])
    }
    if ('full_name' in updates && !updates.full_name) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    }

    // Club selection — must reference a real club.
    if ('club_id' in body) {
      const cid = body.club_id || null
      if (cid) {
        const { data: club } = await supabase.from('clubs').select('id').eq('id', cid).maybeSingle()
        if (!club) return NextResponse.json({ error: 'Please pick a valid club.' }, { status: 400 })
      }
      updates.club_id = cid
    }

    // Email change (e.g. temp login → real email): update auth.users too.
    let newEmail: string | null = null
    if ('email' in body) {
      const e = String(body.email ?? '').trim().toLowerCase()
      if (e && e !== (cur.email ?? '').toLowerCase()) {
        if (!isEmail(e)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', e)
          .neq('id', cur.id)
          .maybeSingle()
        if (taken) return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 })

        const { error: authErr } = await supabase.auth.admin.updateUserById(cur.id, {
          email: e,
          email_confirm: true,
        })
        if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })
        updates.email = e
        newEmail = e
      }
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', cur.id)
      .select('full_name, email, phone_number, date_of_birth, gender, club_id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const completion = computeCompletion(updated)
    const res = NextResponse.json({
      success: true,
      completion,
      dashboard: dashboardForRole(session.role),
    })
    // The session cookie is keyed by email — re-issue it if the email changed,
    // otherwise the next request can't resolve the (now-renamed) profile.
    if (newEmail) res.cookies.set(SESSION_COOKIE, signSession(newEmail), COOKIE_OPTS)
    return res
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
