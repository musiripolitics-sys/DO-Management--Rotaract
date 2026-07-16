import { NextResponse } from 'next/server'
import { activeReportMonth, toMonthKey, isDriveUrl } from '@/lib/projects'
import {
  getAdminClient,
  requireReporter,
  toInt,
  clean,
  toBool,
  toStringArray,
  insertClubProject,
} from '@/lib/projects-server'

// GET — the reporter's club profile + all its projects.
export async function GET() {
  try {
    const { profile: me, denied } = await requireReporter()
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const supabase = getAdminClient()
    const [projectsRes, membersRes] = await Promise.all([
      supabase
        .from('club_projects')
        .select('*')
        .eq('club_id', me.club_id)
        .order('report_month', { ascending: false })
        .order('project_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', me.club_id),
    ])

    if (projectsRes.error) {
      return NextResponse.json({ error: projectsRes.error.message }, { status: 500 })
    }

    return NextResponse.json({
      profile: me,
      activeMonth: activeReportMonth(),
      projects: projectsRes.data ?? [],
      memberCount: membersRes.count ?? 0,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

// POST — reporter logs a completed project for their club.
export async function POST(request: Request) {
  try {
    const { profile: me, denied } = await requireReporter()
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const body = await request.json()
    const projectName = clean(body.project_name)
    if (!projectName) {
      return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })
    }
    const driveUrl = clean(body.drive_folder_url)
    if (driveUrl && !isDriveUrl(driveUrl)) {
      return NextResponse.json(
        { error: 'Photos link must be a Google Drive URL (drive.google.com).' },
        { status: 400 },
      )
    }

    // Reporting month: explicit → project_date's month → active (last) month.
    const reportMonth = body.report_month
      ? toMonthKey(String(body.report_month))
      : body.project_date
        ? toMonthKey(String(body.project_date))
        : activeReportMonth()

    const isJoint = toBool(body.is_joint_project)

    const supabase = getAdminClient()
    const { data, error } = await insertClubProject(supabase, {
      club_id: me.club_id,
      submitted_by: me.id,
      report_month: reportMonth,
      project_name: projectName,
      project_date: clean(body.project_date),
      end_date: clean(body.end_date),
      group_no: clean(body.group_no),
      chairperson_name: clean(body.chairperson_name),
      secretary_name: clean(body.secretary_name),
      avenue: clean(body.avenue),
      venue: clean(body.venue),
      man_hours: toInt(body.man_hours),
      areas_of_focus: toStringArray(body.areas_of_focus),
      description: clean(body.description),
      outcome: clean(body.outcome),
      beneficiaries: toInt(body.beneficiaries),
      volunteers: toInt(body.volunteers),
      drive_folder_url: driveUrl,
      social_media_url: clean(body.social_media_url),
      is_joint_project: isJoint,
      joint_partner: isJoint ? clean(body.joint_partner) : null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, project: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
