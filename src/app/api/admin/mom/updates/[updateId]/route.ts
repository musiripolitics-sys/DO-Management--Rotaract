import { NextResponse } from 'next/server'
import { getSession, hasAccess, MOM_TIER } from '@/lib/session'
import { getMomAdminClient, insertChildren } from '@/lib/mom-server'

async function requireAdmin() {
  const s = await getSession()
  return hasAccess(s?.role, MOM_TIER)
}

type Params = { params: Promise<{ updateId: string }> }

// PATCH — edit a card. Children are replaced (delete-then-insert).
export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { updateId } = await params
    const body = await request.json()
    const supabase = getMomAdminClient()

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.source && ['district', 'avenue', 'group', 'club'].includes(body.source)) {
      patch.source = body.source
    }
    if (body.source_ref) patch.source_ref = String(body.source_ref).trim()
    if ('general_updates' in body) patch.general_updates = body.general_updates?.trim() || null

    const { error: upErr } = await supabase.from('mom_updates').update(patch).eq('id', updateId)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // Replace children
    await Promise.all([
      supabase.from('mom_completed_projects').delete().eq('update_id', updateId),
      supabase.from('mom_upcoming_projects').delete().eq('update_id', updateId),
      supabase.from('mom_cohost_proposals').delete().eq('update_id', updateId),
      supabase.from('mom_action_items').delete().eq('update_id', updateId),
    ])
    await insertChildren(supabase, updateId, body)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// DELETE — remove a card (cascades children).
export async function DELETE(_req: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { updateId } = await params
    const supabase = getMomAdminClient()
    const { error } = await supabase.from('mom_updates').delete().eq('id', updateId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
