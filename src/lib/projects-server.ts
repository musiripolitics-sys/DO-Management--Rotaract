import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/session'

/** Service-role client — bypasses RLS; server-only. */
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type SecretaryProfile = {
  id: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  club_id: string
  club_name: string | null
  club_type: string | null
  role: 'secretary' | 'president'
}

export type ReporterResult =
  | { profile: SecretaryProfile; denied?: undefined }
  | { profile?: undefined; denied: { status: 401 | 403; error: string } }

/**
 * The signed-in club reporter + their club.
 * Secretaries own monthly reporting; presidents are the secondary
 * reporter for their club (backup when the secretary is unavailable).
 * Distinguishes "not signed in" (401) from "signed in but not linked
 * to a club" (403) so the UI can show the right message.
 */
export async function requireReporter(): Promise<ReporterResult> {
  const session = await getSession()
  if (!session || !session.email) {
    return { denied: { status: 401, error: 'Not signed in' } }
  }
  if (session.role !== 'secretary' && session.role !== 'president') {
    return { denied: { status: 403, error: 'Only club secretaries and presidents can manage reports.' } }
  }

  const supabase = getAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number, club_id, clubs:club_id(name, club_type)')
    .ilike('email', session.email)
    .maybeSingle()

  if (!profile) {
    return { denied: { status: 401, error: 'Profile not found' } }
  }
  if (!profile.club_id) {
    return {
      denied: {
        status: 403,
        error: "Your account isn't linked to a club yet — ask your district admin to link it, then try again.",
      },
    }
  }

  const c = Array.isArray(profile.clubs) ? profile.clubs[0] : profile.clubs
  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone_number: profile.phone_number,
      club_id: profile.club_id,
      club_name: (c as { name?: string } | null)?.name ?? null,
      club_type: (c as { club_type?: string } | null)?.club_type ?? null,
      role: session.role,
    },
  }
}

export const toInt = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export const clean = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

export const toBool = (v: unknown): boolean => v === true || v === 'true' || v === 'yes' || v === 1 || v === '1'

/* ── Resilient project writes ──────────────────────────────────────
 * The v2 columns (schema_secretary_projects_v2.sql) may not be
 * applied yet. If a write fails because a column is missing, retry
 * without the v2 fields so the core report still saves. */

const V2_COLUMNS = [
  'end_date',
  'group_no',
  'chairperson_name',
  'secretary_name',
  'man_hours',
  'areas_of_focus',
  'social_media_url',
  'is_joint_project',
  'joint_partner',
] as const

function isMissingColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  const blob = `${err.code ?? ''} ${err.message ?? ''}`
  return /42703|PGRST204|column .* does not exist|could not find the .* column/i.test(blob)
}

function stripV2<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out = { ...row }
  for (const k of V2_COLUMNS) delete out[k]
  return out
}

type WriteResult = { data: Record<string, unknown> | null; error: { message: string } | null }

export async function insertClubProject(
  supabase: ReturnType<typeof getAdminClient>,
  row: Record<string, unknown>,
): Promise<WriteResult> {
  let res = await supabase.from('club_projects').insert(row).select().single()
  if (res.error && isMissingColumn(res.error)) {
    res = await supabase.from('club_projects').insert(stripV2(row)).select().single()
  }
  return res
}

export async function updateClubProject(
  supabase: ReturnType<typeof getAdminClient>,
  id: string,
  updates: Record<string, unknown>,
): Promise<WriteResult> {
  let res = await supabase.from('club_projects').update(updates).eq('id', id).select().single()
  if (res.error && isMissingColumn(res.error)) {
    const reduced = stripV2(updates)
    if (Object.keys(reduced).length === 0) return res
    res = await supabase.from('club_projects').update(reduced).eq('id', id).select().single()
  }
  return res
}

/** Normalize a checkbox group to a clean string array (trimmed, de-duped). */
export const toStringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return []
  const out = new Set<string>()
  for (const item of v) {
    const s = typeof item === 'string' ? item.trim() : ''
    if (s) out.add(s)
  }
  return [...out]
}
