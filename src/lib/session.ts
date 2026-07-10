import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/* ────────────────────────────────────────────────────────────────
 * Unified signed session.
 *
 * One cookie — `vibe_session` — holds `payload.hmac`, where payload
 * is either a member email or the super-admin sentinel. The HMAC is
 * computed with a server-side secret; a forged cookie fails
 * verification and is treated as signed-out.
 *
 * Role is ALWAYS re-derived from the DB (profiles.access_role) on
 * each request — never trusted from the cookie — so role edits take
 * effect immediately.
 * ────────────────────────────────────────────────────────────── */

export type AccessRole =
  | 'super_admin'
  | 'drr'
  | 'adrr'
  | 'drs'
  | 'adrs'
  | 'chief_sergeant'
  | 'sergeant'
  | 'president'
  | 'district_official'
  | 'secretary'
  | 'member'

export type Session = {
  email: string | null
  role: AccessRole
  profileId: string | null
  fullName: string | null
  clubName: string | null
  designation: string | null
}

export const SESSION_COOKIE = 'vibe_session'
const SUPER_ADMIN_PAYLOAD = '__super_admin__'

export const COOKIE_OPTS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  sameSite: 'lax' as const,
  httpOnly: true,
}

/* ── Role tiers ──────────────────────────────────────────────── */

// Full admins — manage everything (events, members, teams, etc.)
export const ADMIN_TIER: AccessRole[] = ['super_admin', 'drr', 'adrr']
// Can manage Minutes of Meeting (full admins + the district secretariat)
export const MOM_TIER: AccessRole[] = [...ADMIN_TIER, 'drs', 'adrs']
// Can operate the scanner + write attendance
export const SCAN_TIER: AccessRole[] = [...ADMIN_TIER, 'chief_sergeant', 'sergeant']
// Can manage the sergeant team (chief sergeant + full admins)
export const SERGEANT_MANAGE_TIER: AccessRole[] = [...ADMIN_TIER, 'chief_sergeant']
// Read access to event-facing data (Overview / DRC / Attendance) — everyone operational
export const OVERSIGHT_TIER: AccessRole[] = [
  ...ADMIN_TIER,
  'drs',
  'adrs',
  'chief_sergeant',
  'sergeant',
]

export function hasAccess(role: AccessRole | null | undefined, allowed: AccessRole[]): boolean {
  return !!role && allowed.includes(role)
}

export function dashboardForRole(role: AccessRole): string {
  if (ADMIN_TIER.includes(role)) return '/admin'
  if (role === 'drs' || role === 'adrs') return '/admin/mom'
  if (role === 'chief_sergeant') return '/admin/sergeant-team'
  if (role === 'sergeant') return '/admin/scanner'
  if (role === 'president') return '/portal'
  if (role === 'district_official') return '/do-portal'
  return '/dashboard' // secretary + member
}

/* ── HMAC signing ────────────────────────────────────────────── */

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('Missing SESSION_SECRET')
  return s
}

function hmac(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

/** Sign a session payload (member email, lowercased, or the super-admin sentinel). */
export function signSession(payload: string): string {
  const canonical = payload.trim().toLowerCase()
  return `${canonical}.${hmac(canonical)}`
}

export function signSuperAdmin(): string {
  return `${SUPER_ADMIN_PAYLOAD}.${hmac(SUPER_ADMIN_PAYLOAD)}`
}

/** Return the verified payload (email or sentinel), or null if missing/forged. */
export function verifySession(value: string | null | undefined): string | null {
  if (!value) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  if (!safeEqual(sig, hmac(payload))) return null
  return payload
}

/* ── Session resolution (with DB role lookup) ────────────────── */

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Resolve the current request's session, or null if not signed in.
 * Super admin (env) resolves without a DB row; members resolve their
 * access_role from profiles.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const payload = verifySession(store.get(SESSION_COOKIE)?.value)
  if (!payload) return null

  if (payload === SUPER_ADMIN_PAYLOAD) {
    return {
      email: null,
      role: 'super_admin',
      profileId: null,
      fullName: 'Super Admin',
      clubName: null,
      designation: null,
    }
  }

  const supabase = adminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, club_name, designation, access_role')
    .ilike('email', payload)
    .maybeSingle()

  if (!profile) return null

  return {
    email: profile.email,
    role: (profile.access_role ?? 'member') as AccessRole,
    profileId: profile.id,
    fullName: profile.full_name ?? null,
    clubName: profile.club_name ?? null,
    designation: profile.designation ?? null,
  }
}
