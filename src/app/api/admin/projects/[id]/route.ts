import { NextResponse } from 'next/server'
import { getSession, hasAccess, PROJECTS_TIER } from '@/lib/session'
import { PROJECT_EDITABLE_FIELDS, toMonthKey, isDriveUrl } from '@/lib/projects'
import { getAdminClient, toInt, clean } from '@/lib/projects-server'

type Params = { params: Promise<{ id: string }> }

const NUMERIC = new Set(['beneficiaries', 'volunteers'])

async function requireProjectsTier() {
  const s = await getSession()
  if (!s) return { status: 401 as const, error: 'Not signed in' }
  if (!hasAccess(s.role, PROJECTS_TIER)) return { status: 403 as const, error: 'Forbidden' }
  return null
}

// PATCH — DRS/admin curates any club's project entry.
export async function PATCH(request: Request, { params }: Params) {
  try {
    const denied = await requireProjectsTier()
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    for (const f of PROJECT_EDITABLE_FIELDS) {
      if (f in body) updates[f] = NUMERIC.has(f) ? toInt(body[f]) : clean(body[f])
    }
    if ('project_name' in updates && !updates.project_name) {
      return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })
    }
    if (updates.drive_folder_url && !isDriveUrl(String(updates.drive_folder_url))) {
      return NextResponse.json(
        { error: 'Photos link must be a Google Drive URL (drive.google.com).' },
        { status: 400 },
      )
    }
    if ('report_month' in body && body.report_month) {
      updates.report_month = toMonthKey(String(body.report_month))
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('club_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, project: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// DELETE — DRS/admin removes a project entry.
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const denied = await requireProjectsTier()
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const { id } = await params
    const supabase = getAdminClient()
    const { error } = await supabase.from('club_projects').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
