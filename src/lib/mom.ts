/* ────────────────────────────────────────────────────────────────
 * MoM shared constants, types, and completion math.
 * Client-safe — no server-only imports (usable in both UI and API).
 * ────────────────────────────────────────────────────────────── */

export type UpdateSource = 'district' | 'avenue' | 'group' | 'club'

export const DISTRICT_ROLES = [
  'DRR',
  'DRC',
  'District Secretary',
  'District Treasurer',
  'District Executive Secretary',
  'District Public Relations',
  'Other District Officials',
] as const

export const AVENUES = [
  'Club Service',
  'Community Service',
  'Professional Development',
  'International Service',
] as const

export const GROUPS = [
  'Group 1',
  'Group 2',
  'Group 3',
  'Group 4',
  'Group 5',
  'Group 6',
  'Group 7',
] as const

export const PRIORITIES = ['Low', 'Medium', 'High'] as const
export const ACTION_STATUSES = ['Open', 'In Progress', 'Done'] as const

export const SOURCE_LABEL: Record<UpdateSource, string> = {
  district: 'District',
  avenue: 'Avenue',
  group: 'Group',
  club: 'Club',
}

/** Options for the dependent second dropdown, given a source. Clubs load from the DB. */
export function refOptionsFor(source: UpdateSource): readonly string[] {
  switch (source) {
    case 'district':
      return DISTRICT_ROLES
    case 'avenue':
      return AVENUES
    case 'group':
      return GROUPS
    default:
      return []
  }
}

/* ── Types (mirror the DB rows) ──────────────────────────────── */

export type CompletedProject = {
  id?: string
  project_name: string
  project_date: string | null
  description: string | null
  outcome: string | null
  avenue: string | null
  beneficiaries: string | null
}

export type UpcomingProject = {
  id?: string
  project_name: string
  project_date: string | null
  venue: string | null
  description: string | null
  expected_participants: string | null
}

export type CohostProposal = {
  id?: string
  project_name: string
  proposal_date: string | null
  venue: string | null
  clubs_needed: number | null
  description: string | null
  contact_person: string | null
}

export type ActionItem = {
  id?: string
  task: string
  assigned_to: string | null
  due_date: string | null
  priority: string
  status: string
}

export type MomUpdate = {
  id: string
  mom_id?: string
  source: UpdateSource
  source_ref: string
  general_updates: string | null
  sort_order?: number
  completed_projects: CompletedProject[]
  upcoming_projects: UpcomingProject[]
  cohost_proposals: CohostProposal[]
  action_items: ActionItem[]
}

export type MomMeeting = {
  id: string
  event_id: string
  meeting_number: string | null
  venue: string | null
  chairperson: string | null
  status: 'draft' | 'published'
  published_at: string | null
  event?: {
    name: string
    event_date: string
    start_time: string
    location: string | null
  } | null
}

/* ── Completion + stats ──────────────────────────────────────── */

export type Completion = {
  clubs: { done: number; total: number }
  groups: { done: number; total: number }
  avenues: { done: number; total: number }
  district: { done: number; total: number }
}

export type MomStats = {
  totalUpdates: number
  completedProjects: number
  upcomingProjects: number
  cohostProposals: number
  actionItems: number
  clubsUpdated: number
}

/**
 * Completion is measured against the fixed lists (district roles, avenues,
 * groups) and the number of clubs that registered for the DRC meeting.
 */
export function computeCompletion(
  updates: Pick<MomUpdate, 'source' | 'source_ref'>[],
  registeredClubCount: number,
): Completion {
  const distinct = (src: UpdateSource) =>
    new Set(updates.filter((u) => u.source === src).map((u) => u.source_ref.trim().toLowerCase())).size

  return {
    clubs: { done: distinct('club'), total: Math.max(registeredClubCount, distinct('club')) },
    groups: { done: distinct('group'), total: GROUPS.length },
    avenues: { done: distinct('avenue'), total: AVENUES.length },
    district: { done: distinct('district'), total: DISTRICT_ROLES.length },
  }
}

export function computeStats(updates: MomUpdate[]): MomStats {
  return {
    totalUpdates: updates.length,
    completedProjects: updates.reduce((s, u) => s + u.completed_projects.length, 0),
    upcomingProjects: updates.reduce((s, u) => s + u.upcoming_projects.length, 0),
    cohostProposals: updates.reduce((s, u) => s + u.cohost_proposals.length, 0),
    actionItems: updates.reduce((s, u) => s + u.action_items.length, 0),
    clubsUpdated: new Set(
      updates.filter((u) => u.source === 'club').map((u) => u.source_ref.trim().toLowerCase()),
    ).size,
  }
}

/** Deterministic (non-AI) executive summary built from the real numbers. */
export function buildExecutiveSummary(
  meeting: MomMeeting,
  completion: Completion,
  stats: MomStats,
): string {
  const bits: string[] = []
  bits.push(
    `This report captures the minutes of ${meeting.event?.name ?? 'the DRC meeting'}${
      meeting.meeting_number ? ` (Meeting ${meeting.meeting_number})` : ''
    }${meeting.venue ? `, held at ${meeting.venue}` : ''}.`,
  )
  bits.push(
    `${completion.clubs.done} of ${completion.clubs.total} registered clubs submitted updates, alongside ${completion.district.done} district and ${completion.avenues.done} avenue reports across ${completion.groups.done} of ${completion.groups.total} groups.`,
  )
  bits.push(
    `In total, ${stats.completedProjects} completed project${stats.completedProjects === 1 ? '' : 's'} and ${stats.upcomingProjects} upcoming project${
      stats.upcomingProjects === 1 ? '' : 's'
    } were reported, with ${stats.cohostProposals} co-host opportunit${
      stats.cohostProposals === 1 ? 'y' : 'ies'
    } and ${stats.actionItems} action item${stats.actionItems === 1 ? '' : 's'} recorded for follow-up.`,
  )
  return bits.join(' ')
}

/** Bullet highlights from the stats. */
export function buildHighlights(completion: Completion, stats: MomStats): string[] {
  const pct =
    completion.clubs.total > 0
      ? Math.round((completion.clubs.done / completion.clubs.total) * 100)
      : 0
  return [
    `${completion.clubs.done}/${completion.clubs.total} registered clubs updated (${pct}% participation).`,
    `${stats.completedProjects} completed and ${stats.upcomingProjects} upcoming projects across the district.`,
    `${stats.cohostProposals} co-host opportunities open for collaboration.`,
    `${stats.actionItems} action items tracked for the next meeting.`,
  ]
}
