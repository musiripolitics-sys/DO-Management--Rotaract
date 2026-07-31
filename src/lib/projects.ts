/* ────────────────────────────────────────────────────────────────
 * Secretary Module — shared types + monthly-reporting date math.
 * Client-safe (no server-only imports).
 *
 * Reporting rhythm: every month, a club secretary uploads LAST
 * month's completed projects. The deadline is the 5th of the
 * current month. `report_month` is the first day of the reported
 * month (e.g. 2026-06-01 = "June 2026").
 * ────────────────────────────────────────────────────────────── */

export type ClubProject = {
  id: string
  club_id: string
  submitted_by: string | null
  report_month: string // 'YYYY-MM-01'
  project_name: string
  project_date: string | null // project START date
  end_date: string | null // project END date (optional)
  group_no: string | null
  chairperson_name: string | null
  secretary_name: string | null
  avenue: string | null
  venue: string | null
  man_hours: number | null
  areas_of_focus: string[] | null
  description: string | null
  outcome: string | null
  beneficiaries: number | null
  volunteers: number | null
  drive_folder_url: string | null
  social_media_url: string | null
  is_joint_project: boolean | null
  joint_partner: string | null
  created_at: string
  updated_at: string
}

/** Fields a secretary may set when creating/editing a project. */
export const PROJECT_EDITABLE_FIELDS = [
  'project_name',
  'project_date',
  'end_date',
  'group_no',
  'chairperson_name',
  'secretary_name',
  'avenue',
  'venue',
  'man_hours',
  'areas_of_focus',
  'description',
  'outcome',
  'beneficiaries',
  'volunteers',
  'drive_folder_url',
  'social_media_url',
  'is_joint_project',
  'joint_partner',
] as const

export type ProjectField = (typeof PROJECT_EDITABLE_FIELDS)[number]

/** Project form option sets (mirror the district's project report). */
export const PROJECT_GROUPS = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5'] as const

export const PROJECT_AVENUES = [
  'Club Service',
  'Community Service',
  'Professional Service',
  'International Service',
  'Multi Avenue',
] as const

export const AREAS_OF_FOCUS = [
  'Peacebuilding and conflict prevention',
  'Disease prevention and treatment',
  'Water, sanitation, and hygiene',
  'Maternal and child health',
  'Basic education and literacy',
  'Community economic development',
  'Protecting our environment',
] as const

/* ── Month-key helpers (a "month key" is always 'YYYY-MM-01') ────
 * All "now"-derived math is anchored to IST (UTC+5:30) so the
 * server (UTC) and district members (IST) always agree on
 * the current reporting month and deadline — even in the hours
 * around a month boundary. */

const IST_OFFSET_MS = 330 * 60_000 // +05:30

/** Calendar month of an instant, read in IST. */
export function monthKeyOf(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number)
  return { year: y, month: m } // month is 1-12
}

/** Normalise any 'YYYY-MM-DD' (or key) to the first of that month. */
export function toMonthKey(dateish: string): string {
  const [y, m] = dateish.split('-')
  return `${y}-${String(Number(m)).padStart(2, '0')}-01`
}

/** Pure calendar arithmetic — no Date roundtrip, no timezone. */
export function addMonths(key: string, n: number): string {
  const { year, month } = parseMonthKey(key)
  const idx = year * 12 + (month - 1) + n
  const y = Math.floor(idx / 12)
  const m = ((idx % 12) + 12) % 12 + 1
  return `${y}-${String(m).padStart(2, '0')}-01`
}

/**
 * The month the report UI opens on — the current calendar month, so a
 * secretary can report the month in progress (earlier months stay
 * selectable via recentReportMonths). The deadline for any given month is
 * still the 5th of the following month (see deadlineFor).
 */
export function activeReportMonth(now: Date = new Date()): string {
  return monthKeyOf(now)
}

/** "June 2026" for a month key. */
export function periodLabel(key: string): string {
  const { year, month } = parseMonthKey(key)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

/** "Jun 2026" (short). */
export function periodLabelShort(key: string): string {
  const { year, month } = parseMonthKey(key)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}

/** Last `n` report months, most recent first, starting from the active month. */
export function recentReportMonths(n = 6, now: Date = new Date()): string[] {
  const start = activeReportMonth(now)
  return Array.from({ length: n }, (_, i) => addMonths(start, -i))
}

/* ── Deadline: the 5th of the month AFTER the reported month ───── */

export type DeadlineStatus = 'open' | 'due-soon' | 'overdue'

/** End of the 5th (23:59:59.999 IST) of the month following `reportMonthKey`. */
export function deadlineFor(reportMonthKey: string): Date {
  const next = parseMonthKey(addMonths(reportMonthKey, 1))
  // Midnight IST of the 6th, minus 1ms — expressed as a real instant.
  return new Date(Date.UTC(next.year, next.month - 1, 6) - IST_OFFSET_MS - 1)
}

/**
 * Status of a reporting window relative to `now`.
 *  - overdue  : past the 5th → `days` = days overdue
 *  - due-soon : within 3 days of the 5th → `days` = days left
 *  - open     : more than 3 days out → `days` = days left
 */
export function deadlineState(
  reportMonthKey: string,
  now: Date = new Date(),
): { status: DeadlineStatus; deadline: Date; days: number } {
  const deadline = deadlineFor(reportMonthKey)
  const ms = deadline.getTime() - now.getTime()
  const dayMs = 86_400_000
  if (ms < 0) return { status: 'overdue', deadline, days: Math.floor(-ms / dayMs) }
  const days = Math.ceil(ms / dayMs)
  return { status: days <= 3 ? 'due-soon' : 'open', deadline, days }
}

export const DEADLINE_LABEL: Record<DeadlineStatus, string> = {
  open: 'On track',
  'due-soon': 'Due soon',
  overdue: 'Overdue',
}

/* ── Google Drive link validation ─────────────────────────────── */

/** Loose check that a URL points at Google Drive (folder or file). */
export function isDriveUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return h === 'drive.google.com' || h.endsWith('.google.com')
  } catch {
    return false
  }
}
