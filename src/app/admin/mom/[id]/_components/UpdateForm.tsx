'use client'

import { useMemo, useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Search,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import RichText from '@/components/RichText'
import {
  AVENUES,
  DISTRICT_ROLES,
  GROUPS,
  PRIORITIES,
  ACTION_STATUSES,
  refOptionsFor,
  type UpdateSource,
  type MomUpdate,
  type CompletedProject,
  type UpcomingProject,
  type CohostProposal,
  type ActionItem,
} from '@/lib/mom'

const inputCls =
  'w-full bg-white border border-[#1A1815]/15 rounded-lg px-3 py-2 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 focus:border-[#6D28D9]/40'

const emptyCompleted = (): CompletedProject => ({ project_name: '', project_date: '', description: '', outcome: '', avenue: '', beneficiaries: '' })
const emptyUpcoming = (): UpcomingProject => ({ project_name: '', project_date: '', venue: '', description: '', expected_participants: '' })
const emptyCohost = (): CohostProposal => ({ project_name: '', proposal_date: '', venue: '', clubs_needed: null, description: '', contact_person: '' })
const emptyAction = (): ActionItem => ({ task: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Open' })

type Props = {
  momId: string
  clubs: string[]
  existing?: MomUpdate | null
  onSaved: () => void
  onCancel: () => void
}

export default function UpdateForm({ momId, clubs, existing, onSaved, onCancel }: Props) {
  const [source, setSource] = useState<UpdateSource>(existing?.source ?? 'club')
  const [sourceRef, setSourceRef] = useState(existing?.source_ref ?? '')
  const [general, setGeneral] = useState(existing?.general_updates ?? '')
  const [completed, setCompleted] = useState<CompletedProject[]>(existing?.completed_projects?.length ? existing.completed_projects : [])
  const [upcoming, setUpcoming] = useState<UpcomingProject[]>(existing?.upcoming_projects?.length ? existing.upcoming_projects : [])
  const [cohost, setCohost] = useState<CohostProposal[]>(existing?.cohost_proposals?.length ? existing.cohost_proposals : [])
  const [actions, setActions] = useState<ActionItem[]>(existing?.action_items?.length ? existing.action_items : [])
  const [saving, setSaving] = useState(false)
  const [clubSearch, setClubSearch] = useState('')
  const [clubOpen, setClubOpen] = useState(false)

  const refOptions = refOptionsFor(source)
  const filteredClubs = useMemo(
    () => clubs.filter((c) => c.toLowerCase().includes(clubSearch.toLowerCase())),
    [clubs, clubSearch],
  )

  const buildPayload = () => ({
    source,
    source_ref: sourceRef,
    general_updates: general,
    completed_projects: completed,
    upcoming_projects: upcoming,
    cohost_proposals: cohost,
    action_items: actions,
  })

  const save = async (addAnother: boolean) => {
    if (!sourceRef.trim()) {
      toast.error('Please choose who this update is from.')
      return
    }
    setSaving(true)
    try {
      const url = existing ? `/api/admin/mom/updates/${existing.id}` : `/api/admin/mom/${momId}/updates`
      const method = existing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save update')
      toast.success(existing ? 'Update saved' : 'Update added')
      if (addAnother && !existing) {
        // reset for a fresh card
        setSourceRef(''); setGeneral(''); setCompleted([]); setUpcoming([]); setCohost([]); setActions([])
        onSaved()
      } else {
        onSaved()
        onCancel()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && !saving) onCancel() }}>
      <div className="w-full max-w-2xl h-full bg-[#FAFAF9] shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#1A1815]/8 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1815]">{existing ? 'Edit Update' : 'Add Update'}</h2>
          <button onClick={() => !saving && onCancel()} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/50 hover:bg-[#1A1815]/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-7">
          {/* Section 1 + 2: Source */}
          <Section title="Update Source">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <select
                  value={source}
                  onChange={(e) => { setSource(e.target.value as UpdateSource); setSourceRef('') }}
                  className={inputCls}
                >
                  <option value="district">District</option>
                  <option value="avenue">Avenue</option>
                  <option value="group">Group</option>
                  <option value="club">Club</option>
                </select>
              </div>
              <div>
                <Label>{source === 'club' ? 'Club' : source === 'district' ? 'District Role' : source === 'avenue' ? 'Avenue' : 'Group'}</Label>
                {source === 'club' ? (
                  <div className="relative">
                    <button type="button" onClick={() => setClubOpen((v) => !v)} className={`${inputCls} flex items-center justify-between text-left`}>
                      <span className={sourceRef ? 'text-[#1A1815]' : 'text-[#1A1815]/35'}>{sourceRef || 'Select a club…'}</span>
                      <ChevronDown className="w-4 h-4 text-[#1A1815]/40" />
                    </button>
                    {clubOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-[#1A1815]/12 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-[#1A1815]/8">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#1A1815]/30" />
                            <input autoFocus value={clubSearch} onChange={(e) => setClubSearch(e.target.value)} placeholder="Search clubs…"
                              className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-lg py-1.5 pl-8 pr-2 text-sm focus:outline-none" />
                          </div>
                        </div>
                        <ul className="max-h-52 overflow-y-auto py-1">
                          {filteredClubs.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-[#1A1815]/40 text-center">No match</li>
                          ) : filteredClubs.map((c) => (
                            <li key={c}>
                              <button type="button" onClick={() => { setSourceRef(c); setClubOpen(false); setClubSearch('') }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F5F3FF] ${sourceRef === c ? 'bg-[#F5F3FF] text-[#6D28D9]' : 'text-[#1A1815]'}`}>
                                {c}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <select value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {refOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
            </div>
          </Section>

          {/* Section 3: Completed Projects */}
          <RepeatSection
            title="Completed Projects"
            items={completed}
            onAdd={() => setCompleted([...completed, emptyCompleted()])}
            onRemove={(i) => setCompleted(completed.filter((_, x) => x !== i))}
            addLabel="Add Completed Project"
            render={(p, i) => (
              <>
                <input className={inputCls} placeholder="Project name *" value={p.project_name} onChange={(e) => setCompleted(upd(completed, i, { project_name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className={`${inputCls} [color-scheme:light]`} value={p.project_date ?? ''} onChange={(e) => setCompleted(upd(completed, i, { project_date: e.target.value }))} />
                  <select className={inputCls} value={p.avenue ?? ''} onChange={(e) => setCompleted(upd(completed, i, { avenue: e.target.value }))}>
                    <option value="">Avenue…</option>
                    {AVENUES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <textarea className={inputCls} rows={2} placeholder="Description" value={p.description ?? ''} onChange={(e) => setCompleted(upd(completed, i, { description: e.target.value }))} />
                <input className={inputCls} placeholder="Outcome" value={p.outcome ?? ''} onChange={(e) => setCompleted(upd(completed, i, { outcome: e.target.value }))} />
                <input className={inputCls} placeholder="Beneficiaries (optional)" value={p.beneficiaries ?? ''} onChange={(e) => setCompleted(upd(completed, i, { beneficiaries: e.target.value }))} />
              </>
            )}
          />

          {/* Section 4: Upcoming Projects */}
          <RepeatSection
            title="Upcoming Projects"
            items={upcoming}
            onAdd={() => setUpcoming([...upcoming, emptyUpcoming()])}
            onRemove={(i) => setUpcoming(upcoming.filter((_, x) => x !== i))}
            addLabel="Add Upcoming Project"
            render={(p, i) => (
              <>
                <input className={inputCls} placeholder="Project name *" value={p.project_name} onChange={(e) => setUpcoming(upd(upcoming, i, { project_name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className={`${inputCls} [color-scheme:light]`} value={p.project_date ?? ''} onChange={(e) => setUpcoming(upd(upcoming, i, { project_date: e.target.value }))} />
                  <input className={inputCls} placeholder="Venue" value={p.venue ?? ''} onChange={(e) => setUpcoming(upd(upcoming, i, { venue: e.target.value }))} />
                </div>
                <textarea className={inputCls} rows={2} placeholder="Description" value={p.description ?? ''} onChange={(e) => setUpcoming(upd(upcoming, i, { description: e.target.value }))} />
                <input className={inputCls} placeholder="Expected participants (optional)" value={p.expected_participants ?? ''} onChange={(e) => setUpcoming(upd(upcoming, i, { expected_participants: e.target.value }))} />
              </>
            )}
          />

          {/* Section 5: Co-host Proposals */}
          <RepeatSection
            title="Co-host Proposals"
            items={cohost}
            onAdd={() => setCohost([...cohost, emptyCohost()])}
            onRemove={(i) => setCohost(cohost.filter((_, x) => x !== i))}
            addLabel="Add Proposal"
            render={(p, i) => (
              <>
                <input className={inputCls} placeholder="Project name *" value={p.project_name} onChange={(e) => setCohost(upd(cohost, i, { project_name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className={`${inputCls} [color-scheme:light]`} value={p.proposal_date ?? ''} onChange={(e) => setCohost(upd(cohost, i, { proposal_date: e.target.value }))} />
                  <input className={inputCls} placeholder="Venue" value={p.venue ?? ''} onChange={(e) => setCohost(upd(cohost, i, { venue: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="1" className={inputCls} placeholder="Clubs needed" value={p.clubs_needed ?? ''} onChange={(e) => setCohost(upd(cohost, i, { clubs_needed: e.target.value === '' ? null : Number(e.target.value) }))} />
                  <input className={inputCls} placeholder="Contact person" value={p.contact_person ?? ''} onChange={(e) => setCohost(upd(cohost, i, { contact_person: e.target.value }))} />
                </div>
                <textarea className={inputCls} rows={2} placeholder="Description" value={p.description ?? ''} onChange={(e) => setCohost(upd(cohost, i, { description: e.target.value }))} />
              </>
            )}
          />

          {/* Section 6: General Updates */}
          <Section title="General Updates">
            <RichText value={general} onChange={setGeneral} placeholder="Membership updates, announcements, awards, notices…" />
          </Section>

          {/* Section 7: Action Items */}
          <RepeatSection
            title="Action Items"
            items={actions}
            onAdd={() => setActions([...actions, emptyAction()])}
            onRemove={(i) => setActions(actions.filter((_, x) => x !== i))}
            addLabel="Add Action Item"
            render={(p, i) => (
              <>
                <input className={inputCls} placeholder="Task *" value={p.task} onChange={(e) => setActions(upd(actions, i, { task: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} placeholder="Assigned to" value={p.assigned_to ?? ''} onChange={(e) => setActions(upd(actions, i, { assigned_to: e.target.value }))} />
                  <input type="date" className={`${inputCls} [color-scheme:light]`} value={p.due_date ?? ''} onChange={(e) => setActions(upd(actions, i, { due_date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className={inputCls} value={p.priority} onChange={(e) => setActions(upd(actions, i, { priority: e.target.value }))}>
                    {PRIORITIES.map((x) => <option key={x} value={x}>{x} priority</option>)}
                  </select>
                  <select className={inputCls} value={p.status} onChange={(e) => setActions(upd(actions, i, { status: e.target.value }))}>
                    {ACTION_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </>
            )}
          />
        </div>

        {/* Footer buttons */}
        <div className="sticky bottom-0 bg-white border-t border-[#1A1815]/8 px-6 py-4 flex flex-wrap gap-3">
          <button onClick={() => save(false)} disabled={saving}
            className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Update'}
          </button>
          {!existing && (
            <button onClick={() => save(true)} disabled={saving}
              className="flex-1 min-w-[140px] py-2.5 rounded-xl border border-[#6D28D9]/40 text-[#6D28D9] hover:bg-[#F5F3FF] disabled:opacity-40 text-sm font-semibold">
              Save &amp; Add Another
            </button>
          )}
          <button onClick={() => !saving && onCancel()} className="py-2.5 px-5 rounded-xl border border-[#1A1815]/12 text-[#1A1815]/65 hover:bg-[#1A1815]/5 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── helpers ── */
function upd<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((item, x) => (x === i ? { ...item, ...patch } : item))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-[#1A1815] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/45 block mb-1">{children}</label>
}

function RepeatSection<T>({
  title, items, onAdd, onRemove, addLabel, render,
}: {
  title: string
  items: T[]
  onAdd: () => void
  onRemove: (i: number) => void
  addLabel: string
  render: (item: T, i: number) => React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#1A1815]">{title}</h3>
        {items.length > 0 && <span className="text-[11px] text-[#1A1815]/45 font-medium">{items.length}</span>}
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-white border border-[#1A1815]/10 rounded-xl p-3 space-y-2 relative">
            <button onClick={() => onRemove(i)} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg text-[#1A1815]/40 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="pr-8 space-y-2">{render(item, i)}</div>
          </div>
        ))}
      </div>
      <button onClick={onAdd} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#6D28D9] hover:text-[#5B21B6]">
        <Plus className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  )
}
