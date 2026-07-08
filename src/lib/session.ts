import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

/* ────────────────────────────────────────────────────────────────
 * Signed session cookies.
 *
 * The old cookies were forgeable: `vibe_member` was a plaintext
 * email and `vibe_admin` was the literal string '1' — anyone could
 * set either in DevTools and impersonate a president or the admin.
 *
 * Now every cookie value is `payload.hmac` where the HMAC is
 * computed with a server-side secret. A forged cookie without the
 * secret fails verification and is treated as signed-out.
 * ────────────────────────────────────────────────────────────── */

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

/* ── Member / president session ─────────────────────────────── */

export function signSession(email: string): string {
  const canonical = email.trim().toLowerCase()
  return `${canonical}.${hmac(canonical)}`
}

export function verifySession(value: string | null | undefined): string | null {
  if (!value) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const email = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  if (!safeEqual(sig, hmac(email))) return null
  return email
}

/** Email of the signed-in member, or null if missing/forged. */
export async function getSessionEmail(): Promise<string | null> {
  const store = await cookies()
  return verifySession(store.get('vibe_member')?.value)
}

export const MEMBER_COOKIE_OPTS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
  sameSite: 'lax' as const,
  httpOnly: true,
}

/* ── Admin session ───────────────────────────────────────────── */

const ADMIN_PAYLOAD = 'vibe-admin-v1'

export function signAdminToken(): string {
  return `${ADMIN_PAYLOAD}.${hmac(ADMIN_PAYLOAD)}`
}

export function verifyAdminToken(value: string | null | undefined): boolean {
  if (!value) return false
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return false
  const payload = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  return payload === ADMIN_PAYLOAD && safeEqual(sig, hmac(payload))
}

/** True if the request carries a validly signed admin cookie. */
export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies()
  return verifyAdminToken(store.get('vibe_admin')?.value)
}

export const ADMIN_COOKIE_OPTS = {
  path: '/',
  maxAge: 60 * 60 * 24, // 24 h
  sameSite: 'lax' as const,
  httpOnly: true,
}

/* ── Role rules ──────────────────────────────────────────────────
 * District Officials have designations like "DO - Home Club
 * President". The DO prefix must win: a DO is never treated as a
 * club President even if their role title contains the word.
 * ────────────────────────────────────────────────────────────── */

export function isDODesignation(designation: string | null | undefined): boolean {
  return !!designation && /^DO\s*-/i.test(designation)
}

export function isPresidentDesignation(designation: string | null | undefined): boolean {
  if (!designation || isDODesignation(designation)) return false
  return designation.toLowerCase().includes('president')
}
