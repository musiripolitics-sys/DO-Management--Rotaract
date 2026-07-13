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
