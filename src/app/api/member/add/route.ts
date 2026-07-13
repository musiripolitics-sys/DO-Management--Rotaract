import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email'
import { getSession } from '@/lib/session'

const DEFAULT_PASSWORD = 'Rotaract@3233'

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }
    if (session.role !== 'president') {
      return NextResponse.json({ error: 'Only Presidents can add members.' }, { status: 403 })
    }

    const supabase = getAdminClient()

    // Caller's own club (new members inherit it)
    const { data: callerProfile, error: callerError } = await supabase
      .from('profiles')
      .select('id, designation, club_id, clubs:club_id(name)')
      .ilike('email', session.email ?? '')
      .maybeSingle()

    if (callerError || !callerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, memberEmail, phone, riId, referredByName, referredByRiId } = body

    // 2. Validate — all fields mandatory
    const missing: string[] = []
    if (!name) missing.push('Full Name')
    if (!memberEmail) missing.push('Email')
    if (!phone) missing.push('Phone')
    if (!riId) missing.push('RI ID')
    if (!referredByName) missing.push('Referrer Name')
    if (!referredByRiId) missing.push('Referrer RI ID')

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Required: ${missing.join(', ')}` },
        { status: 400 },
      )
    }

    // 3. Look up the referrer by RI ID (so the referral link & points still work)
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, ri_id')
      .eq('ri_id', referredByRiId.trim())
      .maybeSingle()

    if (!referrerProfile) {
      return NextResponse.json(
        {
          error: `No member found with RI ID "${referredByRiId.trim()}". Please verify the referrer's RI ID.`,
        },
        { status: 404 },
      )
    }

    // 4. Create the auth user (triggers profile row creation via DB trigger)
    const { error: authError } = await supabase.auth.admin.createUser({
      email: memberEmail.trim().toLowerCase(),
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already exists')) {
        return NextResponse.json(
          { error: 'A member with this email already exists.' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 5. Update the created profile with all fields (inherit caller's club)
    const callerClub = one<{ name: string | null }>(callerProfile.clubs)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        phone_number: phone.trim(),
        ri_id: riId.trim(),
        referred_by: referrerProfile.id,
        club_id: callerProfile.club_id ?? null,
      })
      .eq('email', memberEmail.trim().toLowerCase())

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 6. Send welcome email with login credentials (non-blocking — log failures, don't fail the request)
    const emailResult = await sendWelcomeEmail({
      memberName: name,
      memberEmail: memberEmail.trim().toLowerCase(),
      tempPassword: DEFAULT_PASSWORD,
      referredByName: referrerProfile.full_name ?? 'A district official',
      clubName: callerClub?.name ?? null,
    })

    return NextResponse.json({
      success: true,
      message: `${name} added successfully. Referred by ${referrerProfile.full_name}.${
        emailResult.success ? ' Welcome email sent.' : ''
      }`,
      emailSent: emailResult.success,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
