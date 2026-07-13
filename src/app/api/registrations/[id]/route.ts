import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAdminClient } from '@/lib/projects-server'
import { requireReviewer, isMissingTable } from '@/lib/registrations-server'
import { sendRegistrationApprovedEmail } from '@/lib/email'

type Params = { params: Promise<{ id: string }> }

// PATCH — approve or reject a pending registration.
//   body: { action: 'approve' } | { action: 'reject', reason?: string }
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { reviewer, denied } = await requireReviewer()
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const { id } = await params
    const body = await request.json()
    const action: string = body.action
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be "approve" or "reject".' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const { data: reg, error: loadErr } = await supabase
      .from('member_registrations')
      .select('id, full_name, email, phone_number, ri_id, club_id, status, clubs:club_id(name)')
      .eq('id', id)
      .maybeSingle()

    if (loadErr && isMissingTable(loadErr)) {
      return NextResponse.json(
        { error: 'The member_registrations table has not been created yet.' },
        { status: 503 },
      )
    }
    if (!reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

    // Club officers may only act on their own club's registrations.
    if (reviewer.clubScope && reg.club_id !== reviewer.clubScope) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }
    if (reg.status !== 'pending') {
      return NextResponse.json(
        { error: `This registration was already ${reg.status}.` },
        { status: 409 },
      )
    }

    const clubJoin = Array.isArray(reg.clubs) ? reg.clubs[0] : reg.clubs
    const clubName = (clubJoin as { name?: string } | null)?.name ?? 'your club'
    const review = { reviewed_by: reviewer.profileId, reviewed_at: new Date().toISOString() }

    /* ── Reject ──────────────────────────────────────────────── */
    if (action === 'reject') {
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) || null : null
      const { error } = await supabase
        .from('member_registrations')
        .update({ status: 'rejected', rejection_reason: reason, ...review })
        .eq('id', id)
        .eq('status', 'pending') // race-safe: only one reviewer wins
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    /* ── Approve → create the real account ───────────────────── */

    // Self-healing: if the email became a member some other way,
    // close this registration instead of failing forever.
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', reg.email)
      .maybeSingle()
    if (existing) {
      await supabase
        .from('member_registrations')
        .update({
          status: 'rejected',
          rejection_reason: 'Email already belongs to an existing member.',
          ...review,
        })
        .eq('id', id)
        .eq('status', 'pending')
      return NextResponse.json(
        { error: 'This email already belongs to a member — registration closed.' },
        { status: 409 },
      )
    }

    // Random throwaway auth password — sign-in uses profiles.password_hash,
    // which the member creates at first login (setup flow).
    const { error: authError } = await supabase.auth.admin.createUser({
      email: reg.email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: reg.full_name },
    })
    if (authError && !authError.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        full_name: reg.full_name,
        phone_number: reg.phone_number,
        ri_id: reg.ri_id,
        club_id: reg.club_id,
        club_position: 'member',
        access_role: 'member',
        membership_status: 'active',
        join_date: new Date().toISOString().slice(0, 10),
      })
      .eq('email', reg.email)
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

    const { error: markErr } = await supabase
      .from('member_registrations')
      .update({ status: 'approved', ...review })
      .eq('id', id)
      .eq('status', 'pending')
    if (markErr) return NextResponse.json({ error: markErr.message }, { status: 500 })

    // Non-blocking: tell the member they're in.
    await sendRegistrationApprovedEmail({
      memberName: reg.full_name,
      memberEmail: reg.email,
      clubName,
    })

    return NextResponse.json({ success: true, status: 'approved', clubName })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
