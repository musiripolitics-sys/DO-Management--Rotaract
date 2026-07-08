import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { signSession, isPresidentDesignation, MEMBER_COOKIE_OPTS } from '@/lib/session'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = (body.email || '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, designation')
      .ilike('email', email)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!profile) {
      return NextResponse.json(
        { error: 'No member found with this email. Contact your district admin.' },
        { status: 404 }
      )
    }

    // Block Presidents from email-only login — they must use the password flow.
    // (DO-prefixed designations like "DO - Home Club President" are NOT presidents.)
    if (isPresidentDesignation(profile.designation)) {
      return NextResponse.json(
        {
          error: 'Presidents must sign in using the "President login" button (top right) with their password.',
          requiresPresidentLogin: true,
        },
        { status: 403 },
      )
    }

    const cookieStore = await cookies()
    cookieStore.set('vibe_member', signSession(profile.email ?? email), MEMBER_COOKIE_OPTS)

    return NextResponse.json({ success: true, member: profile })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.set('vibe_member', '', { ...MEMBER_COOKIE_OPTS, maxAge: 0 })
  return NextResponse.json({ success: true })
}
