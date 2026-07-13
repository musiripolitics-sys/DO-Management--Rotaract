'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, Loader2, CheckCircle2, QrCode, Building2, GraduationCap,
  UserCheck, Send, BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'

type PublicClub = { id: string; name: string; club_type: 'college' | 'community' }

const inp =
  'w-full bg-white border border-[#1A1815]/15 rounded-xl px-3.5 py-3 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 transition-all'
const lbl = 'text-[11px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/50 block mb-1.5'

/**
 * Public "Register as member" form + post-submit approval stepper.
 * Used inside the landing-page dialog AND on /register.
 */
export default function RegisterForm({ compact = false }: { compact?: boolean }) {
  const [clubs, setClubs] = useState<PublicClub[]>([])
  const [form, setForm] = useState({ full_name: '', ri_id: '', phone_number: '', email: '', club_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ clubName: string } | null>(null)

  useEffect(() => {
    fetch('/api/clubs/public')
      .then((r) => r.json())
      .then((d) => setClubs(d.clubs ?? []))
      .catch(() => {})
  }, [])

  const grouped = useMemo(
    () => ({
      college: clubs.filter((c) => c.club_type === 'college'),
      community: clubs.filter((c) => c.club_type === 'community'),
    }),
    [clubs],
  )

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setDone({ clubName: data.clubName })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Success: approval stepper ── */
  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-[#1A1815]">Registration submitted!</h2>
          <p className="text-sm text-[#1A1815]/55 mt-1.5">
            Sent to <span className="font-semibold text-[#1A1815]">{done.clubName}</span> for approval.
          </p>
        </div>

        {/* Stepper */}
        <div className="text-left space-y-0">
          <Step icon={Send} state="done" title="Submitted" desc="Your details are with the club." last={false} />
          <Step icon={UserCheck} state="active" title="Officer approval" desc={`${done.clubName}'s president or the sergeant team reviews your request.`} last={false} />
          <Step icon={BadgeCheck} state="todo" title="Sign in & get your QR" desc="Once approved you'll get an email — sign in, set your password, and your QR identity pass is ready for attendance." last={true} />
        </div>

        <p className="text-[11px] text-[#1A1815]/40 bg-[#FAFAF9] border border-[#1A1815]/8 rounded-xl px-4 py-3">
          <QrCode className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          Your QR pass is generated from <span className="font-mono">{form.email}</span> — use that email to sign in.
        </p>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <form onSubmit={submit} className={compact ? 'space-y-4' : 'space-y-5'}>
      <div>
        <label className={lbl}>Full name *</label>
        <input required maxLength={120} className={inp} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Rtr. Your Name" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>RI member ID</label>
          <input maxLength={20} className={inp} value={form.ri_id} onChange={(e) => set('ri_id', e.target.value)} placeholder="If you have one" />
        </div>
        <div>
          <label className={lbl}>Phone *</label>
          <input required type="tel" maxLength={20} className={inp} value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} placeholder="+91 …" />
        </div>
      </div>
      <div>
        <label className={lbl}>Email *</label>
        <input required type="email" maxLength={254} className={inp} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
        <p className="text-[11px] text-[#1A1815]/40 mt-1.5 inline-flex items-center gap-1">
          <QrCode className="w-3 h-3" /> Your QR identity pass is generated from this email.
        </p>
      </div>
      <div>
        <label className={lbl}>Your club *</label>
        <select required className={inp} value={form.club_id} onChange={(e) => set('club_id', e.target.value)}>
          <option value="">Select your Rotaract club…</option>
          {grouped.community.length > 0 && (
            <optgroup label="Community clubs">
              {grouped.community.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          )}
          {grouped.college.length > 0 && (
            <optgroup label="College clubs">
              {grouped.college.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          )}
        </select>
        {!compact && (
          <p className="text-[11px] text-[#1A1815]/40 mt-1.5 inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3 text-[#6D28D9]" /> {grouped.community.length} community</span>
            <span className="inline-flex items-center gap-1"><GraduationCap className="w-3 h-3 text-[#1A468F]" /> {grouped.college.length} college</span>
          </p>
        )}
      </div>

      <div className="bg-[#F5F3FF] border border-[#6D28D9]/15 rounded-xl px-4 py-3 text-[12px] text-[#1A1815]/60 leading-relaxed">
        <UserCheck className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-[#6D28D9]" />
        Your club's officers approve new registrations. You'll get an email once you're in.
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3.5 transition-all shadow-[0_8px_22px_-8px_rgba(109,40,217,0.55)]"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit registration <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}

function Step({
  icon: Icon, state, title, desc, last,
}: {
  icon: React.ElementType
  state: 'done' | 'active' | 'todo'
  title: string
  desc: string
  last: boolean
}) {
  const dot =
    state === 'done'
      ? 'bg-emerald-100 text-emerald-600'
      : state === 'active'
        ? 'bg-[#6D28D9] text-white shadow-[0_6px_16px_-6px_rgba(109,40,217,0.6)]'
        : 'bg-[#1A1815]/6 text-[#1A1815]/35'
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dot}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!last && <div className={`w-px flex-1 my-1 ${state === 'done' ? 'bg-emerald-200' : 'bg-[#1A1815]/10'}`} />}
      </div>
      <div className={`pb-5 ${last ? 'pb-0' : ''}`}>
        <p className={`text-sm font-bold ${state === 'todo' ? 'text-[#1A1815]/45' : 'text-[#1A1815]'}`}>{title}</p>
        <p className="text-xs text-[#1A1815]/50 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
