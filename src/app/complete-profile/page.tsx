'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  Loader2, Check, UserCircle, AlertTriangle, ChevronDown, LogOut, PartyPopper,
} from 'lucide-react'
import { toast } from 'sonner'
import { AVENUES } from '@/lib/mom'
import { computeCompletion, isTempEmail, type ProfileForCompletion } from '@/lib/profile-completion'

type Club = { id: string; name: string; club_type: 'college' | 'community' }
type Form = {
  full_name: string
  email: string
  phone_number: string
  date_of_birth: string
  gender: string
  club_id: string
  ri_id: string
  avenue: string
  address: string
  blood_group: string
  t_shirt_size: string
}
const EMPTY: Form = {
  full_name: '', email: '', phone_number: '', date_of_birth: '', gender: '',
  club_id: '', ri_id: '', avenue: '', address: '', blood_group: '', t_shirt_size: '',
}

const inp =
  'w-full bg-white border border-[#1A1815]/15 rounded-xl px-3.5 py-3 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 transition-all'
const lbl = 'text-[11px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/50 block mb-1.5'

export default function CompleteProfilePage() {
  const [form, setForm] = useState<Form>(EMPTY)
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [dashboard, setDashboard] = useState('/dashboard')
  const [wasTemp, setWasTemp] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (d.superAdmin || d.completion?.isComplete) { window.location.href = d.dashboard || '/dashboard'; return }
        const p = d.profile ?? {}
        setWasTemp(isTempEmail(p.email))
        setForm({
          full_name: p.full_name ?? '', email: isTempEmail(p.email) ? '' : (p.email ?? ''),
          phone_number: p.phone_number ?? '', date_of_birth: p.date_of_birth ?? '',
          gender: p.gender ?? '', club_id: p.club_id ?? '', ri_id: p.ri_id ?? '',
          avenue: p.avenue ?? '', address: p.address ?? '', blood_group: p.blood_group ?? '',
          t_shirt_size: p.t_shirt_size ?? '',
        })
        setClubs(d.clubs ?? [])
        setDashboard(d.dashboard ?? '/dashboard')
        setLoading(false)
      })
      .catch(() => { window.location.href = '/' })
  }, [])

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Live completion — mirrors the server rule (email must be real, not temp).
  const completion = useMemo(
    () => computeCompletion(form as ProfileForCompletion),
    [form],
  )

  const grouped = useMemo(() => ({
    community: clubs.filter((c) => c.club_type === 'community'),
    college: clubs.filter((c) => c.club_type === 'college'),
  }), [clubs])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      if (data.completion?.isComplete) {
        toast.success('Profile complete — welcome aboard! 🎉')
        setTimeout(() => { window.location.href = data.dashboard || dashboard }, 700)
      } else {
        toast.success('Saved. Still needed: ' + (data.completion?.missing ?? []).join(', '))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const signOut = async () => { await fetch('/api/auth', { method: 'DELETE' }); window.location.href = '/' }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" />
      </div>
    )
  }

  const R = 26, C = 2 * Math.PI * R

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1A1815]">
      <header className="bg-white border-b border-[#1A1815]/8">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Image src="/vibe-logo.jpg" alt="VIBE" width={2480} height={610} className="h-8 w-auto" />
          <button onClick={signOut} className="inline-flex items-center gap-1.5 text-xs text-[#1A1815]/50 hover:text-[#1A1815] border border-[#1A1815]/12 hover:border-[#1A1815]/25 rounded-full px-3 py-1.5">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Hero + progress ring */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={R} fill="none" stroke="#1A18150F" strokeWidth="6" />
              <circle cx="32" cy="32" r={R} fill="none" stroke={completion.isComplete ? '#16a34a' : '#6D28D9'} strokeWidth="6"
                strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - completion.percent / 100)}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold" style={{ color: completion.isComplete ? '#16a34a' : '#6D28D9' }}>
              {completion.percent}%
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight inline-flex items-center gap-2">
              {completion.isComplete ? <><PartyPopper className="w-5 h-5 text-emerald-600" /> All set!</> : <><UserCircle className="w-5 h-5 text-[#6D28D9]" /> Complete your profile</>}
            </h1>
            <p className="text-sm text-[#1A1815]/55 mt-0.5">
              {completion.isComplete ? 'Everything looks good — continue to the app.' : 'Fill the required details below to start using VIBE.'}
            </p>
          </div>
        </div>

        {wasTemp && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              You signed in with a <b>temporary email</b>. Enter your real email below — it becomes your new login and your QR identity pass.
            </p>
          </div>
        )}

        <div className="bg-white border border-[#1A1815]/8 rounded-3xl p-6 sm:p-7 space-y-5">
          <Field label="Full name" done={!!form.full_name.trim()} required>
            <input className={inp} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Rtr. Your Name" />
          </Field>

          <Field label="Email address" done={!!form.email.trim()} required>
            <input type="email" className={inp} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone number" done={!!form.phone_number.trim()} required>
              <input type="tel" className={inp} value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} placeholder="+91 …" />
            </Field>
            <Field label="Date of birth" done={!!form.date_of_birth.trim()} required>
              <input type="date" className={`${inp} [color-scheme:light]`} value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Gender" done={!!form.gender.trim()} required>
              <select className={inp} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
            <Field label="Club" done={!!form.club_id.trim()} required>
              <select className={inp} value={form.club_id} onChange={(e) => set('club_id', e.target.value)}>
                <option value="">Select your club…</option>
                <optgroup label="Community">{grouped.community.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                <optgroup label="College">{grouped.college.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
              </select>
            </Field>
          </div>

          {/* Optional enrichment */}
          <button type="button" onClick={() => setShowOptional((s) => !s)} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6D28D9]">
            <ChevronDown className={`w-4 h-4 transition-transform ${showOptional ? 'rotate-180' : ''}`} /> Optional details
          </button>
          {showOptional && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="RI member ID"><input className={inp} value={form.ri_id} onChange={(e) => set('ri_id', e.target.value)} placeholder="If you have one" /></Field>
                <Field label="Avenue">
                  <select className={inp} value={form.avenue} onChange={(e) => set('avenue', e.target.value)}>
                    <option value="">—</option>{AVENUES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Blood group"><input className={inp} value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)} placeholder="e.g. B+" /></Field>
                <Field label="T-shirt size">
                  <select className={inp} value={form.t_shirt_size} onChange={(e) => set('t_shirt_size', e.target.value)}>
                    <option value="">—</option>{['XS','S','M','L','XL','XXL'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Address"><textarea rows={2} className={inp} value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button onClick={save} disabled={saving}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3.5 transition-all shadow-[0_8px_22px_-8px_rgba(109,40,217,0.55)]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : completion.isComplete ? <><Check className="w-4 h-4" /> Save & continue</> : 'Save progress'}
          </button>
          {!completion.isComplete && (
            <p className="text-xs text-[#1A1815]/45 text-center sm:text-right sm:max-w-[40%]">
              Still needed: {completion.missing.join(', ')}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function Field({ label, done, required, children }: { label: string; done?: boolean; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>
        {label}
        {required && <span className="text-[#6D28D9] ml-1">*</span>}
        {required && done && <Check className="w-3 h-3 text-emerald-500 inline ml-1.5 -mt-0.5" />}
      </label>
      {children}
    </div>
  )
}
