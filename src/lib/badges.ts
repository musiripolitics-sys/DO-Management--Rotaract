export type BadgeType = {
  name: string
  color: string
  threshold: number
  description: string
}

export const REFERRAL_BADGES: BadgeType[] = [
  { name: 'Membership Titan', threshold: 50, color: 'from-amber-400 to-orange-600', description: 'Added 50+ members' },
  { name: 'Growth Champion', threshold: 25, color: 'from-purple-400 to-indigo-600', description: 'Added 25+ members' },
  { name: 'Community Builder', threshold: 10, color: 'from-blue-400 to-cyan-600', description: 'Added 10+ members' },
  { name: 'Rising Leader', threshold: 5, color: 'from-emerald-400 to-teal-600', description: 'Added 5+ members' },
  { name: 'Starter Recruiter', threshold: 1, color: 'from-slate-400 to-slate-600', description: 'Added your first member' },
  { name: 'No Badge', threshold: 0, color: 'from-gray-600 to-gray-800', description: 'Start recruiting to earn badges' },
]

export function getBadgeForCount(count: number): BadgeType {
  return REFERRAL_BADGES.find(b => count >= b.threshold) || REFERRAL_BADGES[REFERRAL_BADGES.length - 1]
}

export function getNextBadge(currentCount: number): BadgeType | null {
  for (let i = REFERRAL_BADGES.length - 1; i >= 0; i--) {
    if (REFERRAL_BADGES[i].threshold > currentCount) {
      return REFERRAL_BADGES[i]
    }
  }
  return null
}
