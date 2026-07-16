import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimited, clientIp } from '@/lib/rate-limit'

/* ────────────────────────────────────────────────────────────────
 * POST /api/auth/forgot — request a password-reset link.
 *
 * Always returns a generic success, so this can't be used to probe
 * which emails have accounts. If a matching profile exists, a
 * single-use token (SHA-256 hashed at rest) is stored and a reset
 * link emailed.
 * ────────────────────────────────────────────────────────────── */

const EXPIRES_MINUTES = 60

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

const GENERIC = {
  success: true,
  message: "If an account exists for that email, we've sent a reset link.",
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email ?? body.identifier ?? '').trim().toLowerCase()

    if (!isEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    // Throttle so this can't be used to spam inboxes or probe accounts.
    if (rateLimited(`forgot:${clientIp(request)}`, 5, 15 * 60_000) || rateLimited(`forgot:${email}`, 3, 15 * 60_000)) {
      return NextResponse.json(GENERIC)
    }

    const supabase = getAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', email)
      .maybeSingle()

    // No account → generic success (don't reveal existence).
    if (!profile?.email) return NextResponse.json(GENERIC)

    const rawToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60_000).toISOString()

    const { error: insErr } = await supabase.from('password_resets').insert({
      profile_id: profile.id,
      token_hash: sha256(rawToken),
      expires_at: expiresAt,
    })
    if (insErr) {
      // Table missing (migration not run) or other DB error — log, stay generic.
      console.error('[forgot] could not store reset token:', insErr.message)
      return NextResponse.json(GENERIC)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.3233vibe.com'
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`

    const sent = await sendPasswordResetEmail({
      name: profile.full_name,
      email: profile.email,
      resetUrl,
      expiresMinutes: EXPIRES_MINUTES,
    })
    if (!sent.success) console.error('[forgot] email send failed:', sent.error)

    return NextResponse.json(GENERIC)
  } catch (error: unknown) {
    console.error('[forgot] error:', error)
    // Still generic — never leak internals on this endpoint.
    return NextResponse.json(GENERIC)
  }
}
