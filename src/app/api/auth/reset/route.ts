import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrypt, randomBytes, createHash } from 'crypto'
import { promisify } from 'util'
import {
  signSession,
  dashboardForRole,
  COOKIE_OPTS,
  SESSION_COOKIE,
  type AccessRole,
} from '@/lib/session'
import { rateLimited, clientIp } from '@/lib/rate-limit'

/* ────────────────────────────────────────────────────────────────
 * POST /api/auth/reset — complete a password reset.
 *
 *  action 'verify' → is this token valid & unused? (drives the page)
 *  action 'reset'  → set the new password, consume the token, sign in.
 * ────────────────────────────────────────────────────────────── */

const scryptAsync = promisify(scrypt)

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** Look up a live (unused, unexpired) reset row for a raw token. */
async function findLiveReset(supabase: ReturnType<typeof getAdminClient>, rawToken: string) {
  const { data, error } = await supabase
    .from('password_resets')
    .select('id, profile_id, expires_at, used_at')
    .eq('token_hash', sha256(rawToken))
    .maybeSingle()
  if (error || !data) return null
  if (data.used_at) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null
  return data
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action: 'verify' | 'reset' = body.action ?? 'reset'
    const token = String(body.token ?? '').trim()
    if (!token) return NextResponse.json({ error: 'Missing reset token.' }, { status: 400 })

    if (rateLimited(`reset:${clientIp(request)}`, 20, 15 * 60_000)) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 })
    }

    const supabase = getAdminClient()

    if (action === 'verify') {
      const row = await findLiveReset(supabase, token)
      return NextResponse.json({ valid: Boolean(row) })
    }

    // action === 'reset'
    const password = String(body.password ?? '')
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    const row = await findLiveReset(supabase, token)
    if (!row) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 },
      )
    }

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, access_role')
      .eq('id', row.profile_id)
      .maybeSingle()
    if (pErr || !profile?.email) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    }

    const hash = await hashPassword(password)
    const { error: upErr } = await supabase.from('profiles').update({ password_hash: hash }).eq('id', profile.id)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // Consume this token and invalidate any other outstanding ones for the user.
    await supabase
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('profile_id', profile.id)
      .is('used_at', null)

    const role = (profile.access_role ?? 'member') as AccessRole
    const res = NextResponse.json({
      success: true,
      role,
      name: profile.full_name,
      dashboard: dashboardForRole(role),
    })
    res.cookies.set(SESSION_COOKIE, signSession(profile.email), COOKIE_OPTS)
    return res
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
