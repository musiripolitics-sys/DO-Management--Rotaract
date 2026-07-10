/* ────────────────────────────────────────────────────────────────
 * District team classification — maps a designation to a functional
 * team. Client-safe (no server imports); used by both the API and UI.
 * ────────────────────────────────────────────────────────────── */

export type Team = { key: string; label: string; section: string }

export const TEAMS: Record<string, Team> = {
  leadership: { key: 'leadership', label: 'District Leadership', section: 'Leadership' },
  sergeant: { key: 'sergeant', label: 'Sergeant-At-Arms', section: 'Operations' },
  club: { key: 'club-service', label: 'Club Service', section: 'Service Avenues' },
  community: { key: 'community-service', label: 'Community Service', section: 'Service Avenues' },
  professional: { key: 'professional-service', label: 'Professional Service', section: 'Service Avenues' },
  international: { key: 'international-service', label: 'International Service', section: 'Service Avenues' },
  pro: { key: 'pro', label: 'Public Relations', section: 'Operations' },
  creatives: { key: 'creatives', label: 'Creatives', section: 'Operations' },
  database: { key: 'database', label: 'Data Base', section: 'Operations' },
  blood: { key: 'blood-donation', label: 'Blood Donation', section: 'Operations' },
  editorial: { key: 'editorial', label: 'Editorial Board', section: 'Operations' },
  photography: { key: 'photography', label: 'Photography', section: 'Operations' },
  groups: { key: 'groups', label: 'Group Representatives', section: 'Groups' },
  chairpersons: { key: 'chairpersons', label: 'Chairpersons', section: 'Committees' },
  other: { key: 'other', label: 'Other Officials', section: 'Other' },
}

/** Order sections appear in the directory. */
export const SECTION_ORDER = ['Leadership', 'Service Avenues', 'Operations', 'Groups', 'Committees', 'Other']

/** Classify a designation into a team. Order = most specific first. */
export function teamForDesignation(designation: string | null | undefined): Team {
  const s = (designation || '').toLowerCase().replace(/^do\s*-\s*/, '').trim()
  if (!s) return TEAMS.other

  if (s.includes('sergeant')) return TEAMS.sergeant
  if (s.includes('club service')) return TEAMS.club
  if (s.includes('community service')) return TEAMS.community
  if (s.includes('professional service') || s.includes('professional development')) return TEAMS.professional
  if (s.includes('international service')) return TEAMS.international
  if (/\bpro\b/.test(s) || s.includes('public relation')) return TEAMS.pro
  if (s.includes('creative') || s.includes('video')) return TEAMS.creatives
  if (s.includes('data base') || s.includes('database')) return TEAMS.database
  if (s.includes('blood donation')) return TEAMS.blood
  if (s.includes('editorial')) return TEAMS.editorial
  if (s.includes('photography')) return TEAMS.photography
  if (s.includes('group rotaract') || s.includes('group coordinator')) return TEAMS.groups
  // District leadership / secretariat / treasury / mentors
  if (
    s.includes('representative') ||
    s.includes('secretary') ||
    s.includes('treasurer') ||
    s.includes('learning facilitator') ||
    s.includes('mentor')
  )
    return TEAMS.leadership
  if (s.includes('chairperson') || s.includes('chairman')) return TEAMS.chairpersons
  return TEAMS.other
}

/** Rank within a team for sorting (lead → deputy → associate → member). */
export function roleRank(designation: string | null | undefined): number {
  const s = (designation || '').toLowerCase()
  if (/chief|head|chairperson|chairman|director\b|representative\b|drr|^do - district|pro - chief/.test(s) && !s.includes('associate') && !s.includes('deputy'))
    return 1
  if (s.includes('deputy')) return 2
  if (s.includes('associate') || s.includes('co-chair')) return 3
  return 4
}
