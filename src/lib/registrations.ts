/* Client-safe types for the member-registration approval flow. */

export type RegistrationStatus = 'pending' | 'approved' | 'rejected'

export type MemberRegistration = {
  id: string
  full_name: string
  email: string
  phone_number: string
  ri_id: string | null
  club_id: string
  status: RegistrationStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  club_name?: string | null
  reviewed_by_name?: string | null
}

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Declined',
}
