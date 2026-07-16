import { NextResponse } from 'next/server'
import { PROJECT_EDITABLE_FIELDS, toMonthKey, isDriveUrl } from '@/lib/projects'
import {
  getAdminClient,
  requireReporter,
  toInt,
  clean,
  toBool,
  toStringArray,
  updateClubProject,
} from '@/lib/projects-server'

type Params = { params: Promise<{ id: string }> }

const NUMERIC = new Set(['beneficiaries', 'volunteers', 'man_hours'])
const ARRAY = new Set(['areas_of_focus'])
const BOOL = new Set(['is_joint_project'])

/** Load a project only if it belongs to the caller's club. */
async function ownedProject(id: string, clubId: string) {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('club_projects')
    .select('id, club_id')
    .eq('id', id)
    .maybeSingle()
  if (!data || data.club_id !== clubId) return null
  return data
}

// PATCH — edit one of the reporter's own club projects.
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { profile: me, denied } = await requireReporter()
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const { id } = await params
    if (!(await ownedProject(id, me.club_id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    for (const f of PROJECT_EDITABLE_FIELDS) {
      if (!(f in body)) continue
      if (NUMERIC.has(f)) updates[f] = toInt(body[f])
      else if (ARRAY.has(f)) updates[f] = toStringArray(body[f])
      else if (BOOL.has(f)) updates[f] = toBool(body[f])
      else updates[f] = clean(body[f])
    }
    if ('project_name' in updates && !updates.project_name) {
      return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })
    }
    // A non-joint project carries no partner.
    if ('is_joint_project' in updates && updates.is_joint_project === false) {
      updates.joint_partner = null
    }
    if (updates.drive_folder_url && !isDriveUrl(String(updates.drive_folder_url))) {
      return NextResponse.json(
        { error: 'Photos link must be a Google Drive URL (drive.google.com).' },
        { status: 400 },
      )
    }
    // Keep report_month aligned if the project date moved to another month.
    if ('report_month' in body && body.report_month) {
      updates.report_month = toMonthKey(String(body.report_month))
    } else if ('project_date' in updates && updates.project_date) {
      updates.report_month = toMonthKey(String(updates.project_date))
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data, error } = await updateClubProject(supabase, id, updates)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, project: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// DELETE — remove one of the reporter's own club projects.
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { profile: me, denied } = await requireReporter()
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const { id } = await params
    if (!(await ownedProject(id, me.club_id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

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
