'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Shirt,
  Droplet,
  Heart,
  Mail,
  Briefcase,
  Building2,
  Save,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

/* ── Types ───────────────────────────────────────────────────── */

type FormData = {
  full_name: string
  phone_number: string
  address: string
  date_of_birth: string
  t_shirt_size: string
  blood_group: string
  willing_to_donate_blood: string
}

type ReadOnly = {
  email: string | null
  designation: string | null
  club_name: string | null
}

const EMPTY_FORM: FormData = {
  full_name: '',
  phone_number: '',
  address: '',
  date_of_birth: '',
  t_shirt_size: '',
  blood_group: '',
  willing_to_donate_blood: '',
}

const T_SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/* ── Shared input class ──────────────────────────────────────── */

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 focus:border-[#6D28D9]/50 transition-all'

const selectCls =
  'w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 focus:border-[#6D28D9]/50 transition-all appearance-none'

/* ── Sub-components ──────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold tracking-[0.18em] uppercase text-white/35">{children}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}

function FieldWrap({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-white/65">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        {children}
      </div>
    </div>
  )
}

function ReadOnlyField({
  label,
  icon: Icon,
  value,
  hint,
}: {
  label: string
  icon: React.ElementType
  value: string | null
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-white/40">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
        <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl py-2.5 pl-10 pr-4 text-white/40 text-sm select-none cursor-not-allowed">
          {value || '—'}
        </div>
      </div>
      {hint && <p className="text-[11px] text-white/25 pl-1">{hint}</p>}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────── */

export default function EditProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [readOnly, setReadOnly] = useState<ReadOnly>({ email: null, designation: null, club_name: null })

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Load profile
  useEffect(() => {
    fetch('/api/member/me')
      .then((r) => {
        if (!r.ok) { window.location.href = '/'; return null }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        const p = data.profile ?? {}
        setForm({
          full_name: p.full_name ?? '',
          phone_number: p.phone_number ?? '',
          address: p.address ?? '',
          date_of_birth: p.date_of_birth ?? '',
          t_shirt_size: p.t_shirt_size ?? '',
          blood_group: p.blood_group ?? '',
          willing_to_donate_blood: p.willing_to_donate_blood ?? '',
        })
        setReadOnly({
          email: p.email ?? null,
          designation: p.designation ?? null,
          club_name: p.club_name ?? null,
        })
        setLoading(false)
      })
      .catch(() => { window.location.href = '/' })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) {
      toast.error('Full name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/member/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not save changes')
        return
      }
      toast.success('Profile updated!')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6D28D9] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full px-6 py-4 flex items-center border-b border-white/5 bg-black/30 backdrop-blur-md">
        <Link
          href="/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-semibold text-base">Edit Profile</span>
      </nav>

      <main className="max-w-xl mx-auto px-6 py-10 w-full flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#6D28D9]/15 flex items-center justify-center ring-1 ring-[#6D28D9]/25 shrink-0">
              <User className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-none">Edit Profile</h1>
              <p className="text-sm text-white/40 mt-1">
                Update your personal details and preferences.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* ── Read-only info ── */}
            <div>
              <SectionLabel>Club info — managed by admin</SectionLabel>
              <div className="grid grid-cols-1 gap-4">
                <ReadOnlyField label="Email address" icon={Mail} value={readOnly.email} hint="Contact an admin to change your email." />
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField label="Designation" icon={Briefcase} value={readOnly.designation} />
                  <ReadOnlyField label="Club" icon={Building2} value={readOnly.club_name} />
                </div>
              </div>
            </div>

            {/* ── Personal ── */}
            <div>
              <SectionLabel>Personal details</SectionLabel>
              <div className="space-y-4">
                <FieldWrap label="Full Name *" icon={User}>
                  <input
                    type="text"
                    placeholder="Rtn. Your Name"
                    className={inputCls}
                    value={form.full_name}
                    onChange={(e) => set('full_name', e.target.value)}
                    required
                  />
                </FieldWrap>

                <FieldWrap label="Phone Number" icon={Phone}>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className={inputCls}
                    value={form.phone_number}
                    onChange={(e) => set('phone_number', e.target.value)}
                  />
                </FieldWrap>

                <FieldWrap label="Date of Birth" icon={Calendar}>
                  <input
                    type="date"
                    className={`${inputCls} [color-scheme:dark]`}
                    value={form.date_of_birth}
                    onChange={(e) => set('date_of_birth', e.target.value)}
                  />
                </FieldWrap>

                <FieldWrap label="Address" icon={MapPin}>
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-white/30 pointer-events-none" />
                  <textarea
                    rows={3}
                    placeholder="Your city / address"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 focus:border-[#6D28D9]/50 transition-all resize-none"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </FieldWrap>
              </div>
            </div>

            {/* ── Event / Health ── */}
            <div>
              <SectionLabel>Event &amp; health preferences</SectionLabel>
              <div className="space-y-4">

                {/* T-shirt size */}
                <FieldWrap label="T-Shirt Size" icon={Shirt}>
                  <select
                    className={selectCls}
                    value={form.t_shirt_size}
                    onChange={(e) => set('t_shirt_size', e.target.value)}
                  >
                    <option value="" className="bg-[#1a1a20] text-white/40">Select size…</option>
                    {T_SHIRT_SIZES.map((s) => (
                      <option key={s} value={s} className="bg-[#1a1a20] text-white">{s}</option>
                    ))}
                  </select>
                </FieldWrap>

                {/* Blood group */}
                <FieldWrap label="Blood Group" icon={Droplet}>
                  <select
                    className={selectCls}
                    value={form.blood_group}
                    onChange={(e) => set('blood_group', e.target.value)}
                  >
                    <option value="" className="bg-[#1a1a20] text-white/40">Select blood group…</option>
                    {BLOOD_GROUPS.map((b) => (
                      <option key={b} value={b} className="bg-[#1a1a20] text-white">{b}</option>
                    ))}
                  </select>
                </FieldWrap>

                {/* Willing to donate blood — toggle buttons */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-white/65">
                    <Heart className="w-4 h-4 text-white/30" />
                    Willing to donate blood?
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set('willing_to_donate_blood', opt)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          form.willing_to_donate_blood === opt
                            ? opt === 'Yes'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : 'bg-white/8 border-white/20 text-white'
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                        }`}
                      >
                        {opt === 'Yes' ? '❤️ Yes, I\'m willing' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>

          </form>
        </motion.div>
      </main>
    </div>
  )
}
