import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimited, clientIp } from '@/lib/rate-limit'
import { isMissingTable } from '@/lib/registrations-server'

/* ────────────────────────────────────────────────────────────────
 * Public self-registration — "Register as a member".
 *
 * Submissions are NOT accounts. They land in member_registrations
 * as `pending`, and the club's President/Secretary (or the sergeant
 * team / district admins) approve them. Approval creates the auth
 * user + profile; the member then signs in, sets a password, and
 * gets their QR identity pass for attendance.
 * ────────────────────────────────────────────────────────────── */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export async function POST(request: Request) {
  try {
    // Spam speed bump — self-registration is public.
    if (rateLimited(`register:${clientIp(request)}`, 5, 60 * 60_000)) {
      return NextResponse.json(
        { error: 'Too many registrations from this connection. Try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const fullName = String(body.full_name ?? '').trim().slice(0, 120)
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 254)
    const phone = String(body.phone_number ?? '').trim().slice(0, 20)
    const clubId = String(body.club_id ?? '').trim().slice(0, 40)
    const riId = String(body.ri_id ?? '').trim().slice(0, 20)

    if (!fullName || !email || !phone || !clubId) {
      return NextResponse.json(
        { error: 'Name, email, phone, and club are required.' },
        { status: 400 },
      )
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Club must exist and be active.
    const { data: club } = await supabase
      .from('clubs')
      .select('id, name, status')
      .eq('id', clubId)
      .maybeSingle()
    if (!club || club.status !== 'active') {
      return NextResponse.json({ error: 'Please pick a valid club.' }, { status: 400 })
    }

    // Already a member? Just sign in.
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: 'This email already belongs to a member. Just sign in instead.' },
        { status: 409 },
      )
    }

    const { data: registration, error } = await supabase
      .from('member_registrations')
      .insert({
        full_name: fullName,
        email,
        phone_number: phone,
        ri_id: riId || null,
        club_id: club.id,
      })
      .select('id, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error:
              'You already have a registration awaiting approval. Your club officers will review it soon.',
          },
          { status: 409 },
        )
      }
      if (isMissingTable(error)) {
        return NextResponse.json(
          { error: 'Registration is temporarily unavailable. Please try again later.' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      clubName: club.name,
      status: 'pending',
      message: `Submitted! ${club.name}'s officers will review your registration.`,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
