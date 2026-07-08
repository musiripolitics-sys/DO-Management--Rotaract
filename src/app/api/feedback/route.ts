import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionEmail } from '@/lib/session'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getCallerProfile() {
  const email = await getSessionEmail()
  if (!email) return null
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()
  return data ?? null
}

// ── GET: fetch the signed-in member's own feedback records ───────────────────
export async function GET() {
  try {
    const profile = await getCallerProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('event_feedback')
      .select('event_id, rating, comment')
      .eq('user_id', profile.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ feedbacks: data ?? [] })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// ── POST: submit or update feedback ─────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const profile = await getCallerProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = await request.json()
    const { event_id, rating, comment } = body

    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Only members who attended can leave feedback
    const { data: attendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', profile.id)
      .eq('event_id', event_id)
      .maybeSingle()

    if (!attendance) {
      return NextResponse.json(
        { error: 'You can only rate events you attended.' },
        { status: 403 },
      )
    }

    // Upsert: one feedback per member per event
    const { data, error } = await supabase
      .from('event_feedback')
      .upsert(
        {
          event_id,
          user_id: profile.id,
          rating,
          comment: comment?.trim() || null,
        },
        { onConflict: 'event_id,user_id' },
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, feedback: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
