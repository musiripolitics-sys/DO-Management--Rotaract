import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, email: rawEmail, password } = body
    const email = (rawEmail ?? '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, designation, president_password_hash')
      .eq('email', email)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!profile) {
      return NextResponse.json(
        { error: 'No account found with this email. Contact your district admin.' },
        { status: 404 },
      )
    }

    const isPresident = Boolean(profile.designation?.toLowerCase().includes('president'))
    if (!isPresident) {
      return NextResponse.json(
        { error: 'This account does not have president access.' },
        { status: 403 },
      )
    }

    // ── CHECK ──────────────────────────────────────────────────────────────
    if (action === 'check') {
      return NextResponse.json({
        isPresident: true,
        hasPassword: Boolean(profile.president_password_hash),
        name: profile.full_name,
      })
    }

    // ── SETUP (first-time password) ────────────────────────────────────────
    if (action === 'setup') {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters.' },
          { status: 400 },
        )
      }
      if (profile.president_password_hash) {
        return NextResponse.json(
          { error: 'Password already set. Please sign in instead.' },
          { status: 409 },
        )
      }

      const hash = await hashPassword(password)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ president_password_hash: hash })
        .eq('id', profile.id)

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

      const cookieStore = await cookies()
      cookieStore.set('vibe_member', email, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })

      return NextResponse.json({ success: true, name: profile.full_name })
    }

    // ── LOGIN ──────────────────────────────────────────────────────────────
    if (action === 'login') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
      }
      if (!profile.president_password_hash) {
        return NextResponse.json(
          { error: 'No password set yet. Please set up your account first.' },
          { status: 400 },
        )
      }

      const valid = await verifyPassword(password, profile.president_password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
      }

      const cookieStore = await cookies()
      cookieStore.set('vibe_member', email, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })

      return NextResponse.json({ success: true, name: profile.full_name })
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
