/* ────────────────────────────────────────────────────────────────
 * Profile completion — shared, client-safe.
 *
 * After a member sets their password on first login, the app gates
 * them behind a "complete your profile" step until every required
 * field is filled. Temp-login DOs (seeded with an @vibetemp.in
 * address) must replace it with a real email to reach 100%.
 * ────────────────────────────────────────────────────────────── */

export const TEMP_EMAIL_DOMAIN = 'vibetemp.in'

export function isTempEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().trim().endsWith('@' + TEMP_EMAIL_DOMAIN)
}

export type ProfileForCompletion = {
  full_name?: string | null
  email?: string | null
  phone_number?: string | null
  date_of_birth?: string | null
  gender?: string | null
  club_id?: string | null
}

const REQUIRED: { key: keyof ProfileForCompletion; label: string }[] = [
  { key: 'full_name', label: 'Full name' },
  { key: 'email', label: 'Email address' },
  { key: 'phone_number', label: 'Phone number' },
  { key: 'date_of_birth', label: 'Date of birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'club_id', label: 'Club' },
]

export type CompletionField = { key: string; label: string; filled: boolean }
export type Completion = {
  fields: CompletionField[]
  percent: number
  isComplete: boolean
  missing: string[]
}

export function computeCompletion(p: ProfileForCompletion): Completion {
  const fields: CompletionField[] = REQUIRED.map((f) => {
    let filled = !!(p[f.key] && String(p[f.key]).trim())
    // A temporary login email does not count as a real email.
    if (f.key === 'email' && isTempEmail(p.email)) filled = false
    return { key: f.key as string, label: f.label, filled }
  })
  const done = fields.filter((f) => f.filled).length
  return {
    fields,
    percent: Math.round((done / fields.length) * 100),
    isComplete: done === fields.length,
    missing: fields.filter((f) => !f.filled).map((f) => f.label),
  }
}
