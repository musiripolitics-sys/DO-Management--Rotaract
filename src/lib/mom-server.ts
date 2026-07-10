import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getMomAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type Row = Record<string, unknown>

/** Insert the four child arrays for a MoM update card. */
export async function insertChildren(
  supabase: SupabaseClient,
  updateId: string,
  body: Row,
) {
  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const clean = (v: unknown) => {
    const s = typeof v === 'string' ? v.trim() : ''
    return s === '' ? null : s
  }
  const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : [])

  const completed = arr(body.completed_projects)
    .filter((p) => clean(p.project_name))
    .map((p, i) => ({
      update_id: updateId,
      project_name: clean(p.project_name),
      project_date: clean(p.project_date),
      description: clean(p.description),
      outcome: clean(p.outcome),
      avenue: clean(p.avenue),
      beneficiaries: clean(p.beneficiaries),
      sort_order: i,
    }))

  const upcoming = arr(body.upcoming_projects)
    .filter((p) => clean(p.project_name))
    .map((p, i) => ({
      update_id: updateId,
      project_name: clean(p.project_name),
      project_date: clean(p.project_date),
      venue: clean(p.venue),
      description: clean(p.description),
      expected_participants: clean(p.expected_participants),
      sort_order: i,
    }))

  const cohost = arr(body.cohost_proposals)
    .filter((p) => clean(p.project_name))
    .map((p, i) => ({
      update_id: updateId,
      project_name: clean(p.project_name),
      proposal_date: clean(p.proposal_date),
      venue: clean(p.venue),
      clubs_needed: num(p.clubs_needed),
      description: clean(p.description),
      contact_person: clean(p.contact_person),
      sort_order: i,
    }))

  const actions = arr(body.action_items)
    .filter((p) => clean(p.task))
    .map((p, i) => ({
      update_id: updateId,
      task: clean(p.task),
      assigned_to: clean(p.assigned_to),
      due_date: clean(p.due_date),
      priority: clean(p.priority) ?? 'Medium',
      status: clean(p.status) ?? 'Open',
      sort_order: i,
    }))

  if (completed.length) await supabase.from('mom_completed_projects').insert(completed)
  if (upcoming.length) await supabase.from('mom_upcoming_projects').insert(upcoming)
  if (cohost.length) await supabase.from('mom_cohost_proposals').insert(cohost)
  if (actions.length) await supabase.from('mom_action_items').insert(actions)
}
