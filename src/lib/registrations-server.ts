import 'server-only'
import { getSession, hasAccess, ADMIN_TIER, type Session } from '@/lib/session'
import { getAdminClient } from '@/lib/projects-server'

/* ────────────────────────────────────────────────────────────────
 * Who can review member registrations?
 *  - District admins (super_admin / DRR / ADRR) — any club
 *  - Sergeant team (chief_sergeant / sergeant) — any club
 *    (they run the attendance desk and vet who scans in)
 *  - Club President / Secretary — their own club only
 * ────────────────────────────────────────────────────────────── */

export type Reviewer = {
  session: Session
  profileId: string | null
  /** null = may review any club; string = restricted to this club */
  clubScope: string | null
}

export type ReviewerResult =
  | { reviewer: Reviewer; denied?: undefined }
  | { reviewer?: undefined; denied: { status: 401 | 403; error: string } }

export async function requireReviewer(): Promise<ReviewerResult> {
  const session = await getSession()
  if (!session) return { denied: { status: 401, error: 'Not signed in' } }

  const districtWide =
    hasAccess(session.role, ADMIN_TIER) ||
    session.role === 'chief_sergeant' ||
    session.role === 'sergeant'

  if (districtWide) {
    return { reviewer: { session, profileId: session.profileId, clubScope: null } }
  }

  if (session.role === 'president' || session.role === 'secretary') {
    if (!session.email) return { denied: { status: 401, error: 'Not signed in' } }
    const supabase = getAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, club_id')
      .ilike('email', session.email)
      .maybeSingle()
    if (!profile?.club_id) {
      return {
        denied: { status: 403, error: "Your account isn't linked to a club yet." },
      }
    }
    return { reviewer: { session, profileId: profile.id, clubScope: profile.club_id } }
  }

  return { denied: { status: 403, error: 'You cannot review member registrations.' } }
}

/** True when a Supabase/PostgREST error means "table not created yet". */
export function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    /could not find the table|does not exist/i.test(err.message ?? '')
  )
}
