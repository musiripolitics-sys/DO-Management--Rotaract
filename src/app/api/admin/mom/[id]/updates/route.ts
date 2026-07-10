import { NextResponse } from 'next/server'
import { getSession, hasAccess, MOM_TIER } from '@/lib/session'
import { getMomAdminClient, insertChildren } from '@/lib/mom-server'

async function requireAdmin() {
  const s = await getSession()
  return hasAccess(s?.role, MOM_TIER)
}

type Params = { params: Promise<{ id: string }> }

// POST — add an update card (parent + children) to a MoM.
export async function POST(request: Request, { params }: Params) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id: momId } = await params
    const body = await request.json()

    if (!['district', 'avenue', 'group', 'club'].includes(body.source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }
    if (!body.source_ref || !String(body.source_ref).trim()) {
      return NextResponse.json({ error: 'Please choose who this update is from.' }, { status: 400 })
    }

    const supabase = getMomAdminClient()

    const { data: update, error } = await supabase
      .from('mom_updates')
      .insert({
        mom_id: momId,
        source: body.source,
        source_ref: String(body.source_ref).trim(),
        general_updates: body.general_updates?.trim() || null,
      })
      .select()
      .single()
    if (error || !update) {
      return NextResponse.json({ error: error?.message ?? 'Could not save update' }, { status: 500 })
    }

    await insertChildren(supabase, update.id, body)

    return NextResponse.json({ success: true, updateId: update.id })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
