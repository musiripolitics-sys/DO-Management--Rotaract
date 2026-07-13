/* ────────────────────────────────────────────────────────────────
 * Club constants + types. Client-safe (no server imports).
 * ────────────────────────────────────────────────────────────── */

export type ClubType = 'college' | 'community'
export type ClubStatus = 'active' | 'inactive'
export type ClubPosition = 'president' | 'secretary' | 'treasurer' | 'member'

export const CLUB_TYPES: ClubType[] = ['college', 'community']
export const CLUB_STATUSES: ClubStatus[] = ['active', 'inactive']
export const OFFICER_POSITIONS: Exclude<ClubPosition, 'member'>[] = [
  'president',
  'secretary',
  'treasurer',
]

export const POSITION_LABEL: Record<ClubPosition, string> = {
  president: 'President',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  member: 'Member',
}

export type Club = {
  id: string
  name: string
  short_name: string | null
  club_type: ClubType
  parent_rotary_club: string | null
  charter_number: string | null
  charter_date: string | null
  institution_name: string | null
  logo_url: string | null
  banner_url: string | null
  description: string | null
  email: string | null
  phone: string | null
  meeting_venue: string | null
  meeting_day: string | null
  meeting_time: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  linkedin: string | null
  x_url: string | null
  youtube: string | null
  status: ClubStatus
  created_at?: string
  updated_at?: string
}

export type ClubOfficer = {
  id: string
  full_name: string | null
  email: string | null
  position: ClubPosition
}

export type ClubMemberLite = {
  id: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  avenue: string | null
  club_position: ClubPosition
  designation: string | null
}

/** Editable club fields the admin form writes (everything except id/timestamps). */
export const CLUB_EDITABLE_FIELDS = [
  'name',
  'short_name',
  'club_type',
  'parent_rotary_club',
  'charter_number',
  'charter_date',
  'institution_name',
  'logo_url',
  'banner_url',
  'description',
  'email',
  'phone',
  'meeting_venue',
  'meeting_day',
  'meeting_time',
  'website',
  'instagram',
  'facebook',
  'linkedin',
  'x_url',
  'youtube',
  'status',
] as const

export type ClubEditableField = (typeof CLUB_EDITABLE_FIELDS)[number]

/** Reference seed lists (the canonical district clubs). */
export const COMMUNITY_CLUBS = [
  'Akash', 'Chennai Angels', 'Chennai Towers', 'Chennai Comrades', 'Madras Mount',
  'Phoenix', 'Chennai ANVI', 'Green Galaxy', 'Guindy', 'Chennai Asgard', 'Dexterous',
  'Zenith', 'Alandur Incredibles', 'Madras Cosmos', 'Madras T. Nagar', 'Chennai Amethyst',
  'Chennai Radiance Raisers', 'Sahas', 'Chennai Capital', 'Chennai Celebrities',
  'East Coast Chennai', 'Madras Midtown',
] as const

export function initialsFor(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}
