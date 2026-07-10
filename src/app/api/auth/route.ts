import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import {
  signSession,
  signSuperAdmin,
  dashboardForRole,
  COOKIE_OPTS,
  SESSION_COOKIE,
  type AccessRole,
} from '@/lib/session'

const scryptAsync = promisify(scrypt)

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Kumar'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234098'

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

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const hashBuf = Buffer.from(hash, 'hex')
    const derived = (await scryptAsync(password, salt, 64)) as Buffer
    return timingSafeEqual(hashBuf, derived)
  } catch {
    return false
  }
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

/* ────────────────────────────────────────────────────────────────
 * POST — one endpoint, three actions:
 *   check  → does this identifier exist & have a password? what role?
 *   setup  → first-time password creation, then sign in
 *   login  → verify password, sign in
 * ────────────────────────────────────────────────────────────── */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action: 'check' | 'setup' | 'login' = body.action
    const identifier: string = (body.identifier ?? '').trim()
    const password: string = body.password ?? ''

    if (!identifier) {
      return NextResponse.json({ error: 'Enter your email or username.' }, { status: 400 })
    }

    // ── Super admin (env-based, not in DB) ─────────────────────────
    if (identifier.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
      if (action === 'check') {
        return NextResponse.json({
          exists: true,
          hasPassword: true, // env password always "set"
          role: 'super_admin' as AccessRole,
          name: 'Super Admin',
        })
      }
      // setup is not applicable to super admin — treat as login
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      const res = NextResponse.json({
        success: true,
        role: 'super_admin',
        dashboard: dashboardForRole('super_admin'),
      })
      res.cookies.set(SESSION_COOKIE, signSuperAdmin(), COOKIE_OPTS)
      return res
    }

    // ── Member accounts ────────────────────────────────────────────
    if (!isEmail(identifier)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    const email = identifier.toLowerCase()

    const supabase = getAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, access_role, password_hash')
      .ilike('email', email)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!profile) {
      return NextResponse.json(
        { error: 'No account found with this email. Contact your district admin.' },
        { status: 404 },
      )
    }

    const role = (profile.access_role ?? 'member') as AccessRole

    if (action === 'check') {
      return NextResponse.json({
        exists: true,
        hasPassword: Boolean(profile.password_hash),
        role,
        name: profile.full_name,
      })
    }

    if (action === 'setup') {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
      }
      if (profile.password_hash) {
        return NextResponse.json(
          { error: 'Password already set. Please sign in instead.' },
          { status: 409 },
        )
      }
      const hash = await hashPassword(password)
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ password_hash: hash })
        .eq('id', profile.id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

      const res = NextResponse.json({
        success: true,
        role,
        name: profile.full_name,
        dashboard: dashboardForRole(role),
      })
      res.cookies.set(SESSION_COOKIE, signSession(profile.email ?? email), COOKIE_OPTS)
      return res
    }

    if (action === 'login') {
      if (!profile.password_hash) {
        return NextResponse.json(
          { error: 'No password set yet. Please create one first.', needsSetup: true },
          { status: 400 },
        )
      }
      const valid = await verifyPassword(password, profile.password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
      }
      const res = NextResponse.json({
        success: true,
        role,
        name: profile.full_name,
        dashboard: dashboardForRole(role),
      })
      res.cookies.set(SESSION_COOKIE, signSession(profile.email ?? email), COOKIE_OPTS)
      return res
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

/* ── DELETE — sign out (clears unified + any legacy cookies) ────── */
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
  for (const legacy of ['vibe_member', 'vibe_admin', 'vibe_sergeant']) {
    res.cookies.set(legacy, '', { path: '/', maxAge: 0 })
  }
  return res
}
