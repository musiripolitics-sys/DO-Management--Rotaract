'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AVENUES } from '@/lib/mom'
import { POSITION_LABEL, type ClubPosition } from '@/lib/clubs'

export type ClubMember = {
  id: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  ri_id: string | null
  gender: string | null
  date_of_birth: string | null
  avenue: string | null
  membership_type: string | null
  join_date: string | null
  rotary_year: string | null
  membership_status: string | null
  club_position: ClubPosition
  total_points?: number
  designation?: string | null
}

const MEMBERSHIP_TYPES = ['Active', 'Honorary', 'Alumni', 'Guest']
const STATUSES = ['active', 'inactive']

type Form = {
  full_name: string
  email: string
  ri_id: string
  phone_number: string
  gender: string
  date_of_birth: string
  avenue: string
  membership_type: string
  join_date: string
  rotary_year: string
  membership_status: string
  club_position: ClubPosition
}

function fromMember(m: ClubMember | null): Form {
  return {
    full_name: m?.full_name ?? '',
    email: m?.email ?? '',
    ri_id: m?.ri_id ?? '',
    phone_number: m?.phone_number ?? '',
    gender: m?.gender ?? '',
    date_of_birth: m?.date_of_birth ?? '',
    avenue: m?.avenue ?? '',
    membership_type: m?.membership_type ?? '',
    join_date: m?.join_date ?? '',
    rotary_year: m?.rotary_year ?? '',
    membership_status: m?.membership_status ?? 'active',
    club_position: m?.club_position ?? 'member',
  }
}

const inp =
  'w-full bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40'

export default function MemberForm({
  clubId,
  existing,
  onSaved,
  onCancel,
}: {
  clubId: string
  existing: ClubMember | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Form>(fromMember(existing))
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const isEdit = !!existing

  const save = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return }
    if (!isEdit && !form.email.trim()) { toast.error('Email is required'); return }
    setSaving(true)
    try {
      const url = isEdit ? `/api/admin/members/${existing.id}` : '/api/admin/members'
      const method = isEdit ? 'PATCH' : 'POST'
      const payload = isEdit ? { ...form, club_id: clubId } : { ...form, club_id: clubId }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      toast.success(isEdit ? 'Member updated' : 'Member added')
      onSaved()
      onCancel()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && !saving) onCancel() }}>
      <div className="w-full max-w-lg h-full bg-[#FAFAF9] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-[#1A1815]/8 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1815]">{isEdit ? 'Edit member' : 'Add member'}</h2>
          <button onClick={() => !saving && onCancel()} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/50 hover:bg-[#1A1815]/5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-6">
          <Section title="Identity">
            <F label="Full name *"><input className={inp} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Rtr. …" /></F>
            <F label="Email *"><input className={inp} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="member@example.com" disabled={isEdit} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="RI Member ID"><input className={inp} value={form.ri_id} onChange={(e) => set('ri_id', e.target.value)} placeholder="12345678" /></F>
              <F label="Phone"><input className={inp} value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} placeholder="+91 …" /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Gender">
                <select className={inp} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </F>
              <F label="Date of birth"><input type="date" className={`${inp} [color-scheme:light]`} value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} /></F>
            </div>
          </Section>

          <Section title="Club membership">
            <div className="grid grid-cols-2 gap-3">
              <F label="Avenue">
                <select className={inp} value={form.avenue} onChange={(e) => set('avenue', e.target.value)}>
                  <option value="">—</option>{AVENUES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </F>
              <F label="Membership type">
                <select className={inp} value={form.membership_type} onChange={(e) => set('membership_type', e.target.value)}>
                  <option value="">—</option>{MEMBERSHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Join date"><input type="date" className={`${inp} [color-scheme:light]`} value={form.join_date} onChange={(e) => set('join_date', e.target.value)} /></F>
              <F label="Rotary year"><input className={inp} value={form.rotary_year} onChange={(e) => set('rotary_year', e.target.value)} placeholder="2025-26" /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Status">
                <select className={inp} value={form.membership_status} onChange={(e) => set('membership_status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s === 'active' ? 'Active' : 'Inactive'}</option>)}
                </select>
              </F>
              <F label="Position">
                <select className={inp} value={form.club_position} onChange={(e) => set('club_position', e.target.value as ClubPosition)}>
                  {(['member', 'president', 'secretary', 'treasurer'] as ClubPosition[]).map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
                </select>
              </F>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#1A1815]/8 px-6 py-4 flex gap-3">
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save changes' : 'Add member'}
          </button>
          <button onClick={() => !saving && onCancel()} className="py-2.5 px-5 rounded-xl border border-[#1A1815]/12 text-[#1A1815]/65 hover:bg-[#1A1815]/5 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#1A1815]/45 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/45 block mb-1">{label}</label>{children}</div>
}
