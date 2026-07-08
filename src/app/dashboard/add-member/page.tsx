'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, UserPlus, Mail, User, Hash, Phone, IdCard } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type FormData = {
  name: string
  memberEmail: string
  phone: string
  riId: string
  referredByName: string
  referredByRiId: string
}

const EMPTY_FORM: FormData = {
  name: '',
  memberEmail: '',
  phone: '',
  riId: '',
  referredByName: '',
  referredByRiId: '',
}

function Field({
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
      <label className="flex items-center gap-1 text-sm font-medium text-white/75">
        {label}
        <span className="text-red-400 ml-0.5">*</span>
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
        {children}
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 focus:border-[#6D28D9]/50 transition-all'

export default function AddMember() {
  const [loading, setLoading] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [presidentClub, setPresidentClub] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)

  // Auth check
  useEffect(() => {
    async function init() {
      const meRes = await fetch('/api/member/me')
      if (!meRes.ok) {
        window.location.href = '/'
        return
      }
      const me = await meRes.json()
      // DO prefix wins: DOs are never presidents even if their role title says so
      const designation: string = me.profile?.designation ?? ''
      const isPresident = !/^DO\s*-/i.test(designation) && designation.toLowerCase().includes('president')
      setAuthorized(isPresident)
      setPresidentClub(me.profile?.club_name ?? null)
    }
    init()
  }, [])

  const field = (k: keyof FormData, v: string) => setFormData((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/member/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Member added successfully!')
        setFormData(EMPTY_FORM)
      } else {
        toast.error(data.error || 'Failed to add member')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  /* ── Loading ── */
  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6D28D9] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  /* ── Unauthorised ── */
  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6 text-center">
        <UserPlus className="w-16 h-16 text-white/15 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-white/45 mb-6 max-w-sm">This feature is exclusively available to Presidents.</p>
        <Link
          href="/portal"
          className="border border-white/10 text-white/70 hover:text-white hover:border-white/30 rounded-xl px-5 py-2.5 text-sm transition-colors"
        >
          Return to Portal
        </Link>
      </div>
    )
  }

  /* ── Main page ── */
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full px-6 py-4 flex items-center border-b border-white/5 bg-black/30 backdrop-blur-md">
        <Link
          href="/portal"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-semibold text-base">Add Member</span>
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
              <UserPlus className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-none">Add Member</h1>
              <p className="text-sm text-white/40 mt-1">
                Register a new member on behalf of a district official.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── New member section ── */}
            <div className="flex items-center gap-3 pb-1">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/35">New member details</p>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Name */}
            <Field label="Full Name" icon={User}>
              <input
                type="text"
                placeholder="e.g. Rtn. John Doe"
                className={inputCls}
                value={formData.name}
                onChange={(e) => field('name', e.target.value)}
                required
              />
            </Field>

            {/* Email */}
            <Field label="Email Address" icon={Mail}>
              <input
                type="email"
                placeholder="john@example.com"
                className={inputCls}
                value={formData.memberEmail}
                onChange={(e) => field('memberEmail', e.target.value)}
                required
              />
            </Field>

            {/* Phone + RI ID side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-sm font-medium text-white/75">
                  Phone <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className={inputCls}
                    value={formData.phone}
                    onChange={(e) => field('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-sm font-medium text-white/75">
                  RI ID <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="12345678"
                    className={inputCls}
                    value={formData.riId}
                    onChange={(e) => field('riId', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* ── Referred By section ── */}
            <div className="pt-4 space-y-1">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/35">Referred by</p>
                <div className="flex-1 h-px bg-white/8" />
                {presidentClub && (
                  <span className="text-[11px] text-white/35 font-medium">
                    {presidentClub}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 leading-relaxed pt-1">
                The referring official will be credited with this recruitment.
              </p>
            </div>

            {/* Referrer Name */}
            <Field label="Referrer Name" icon={IdCard}>
              <input
                type="text"
                placeholder="e.g. Rtr. Vaseem"
                className={inputCls}
                value={formData.referredByName}
                onChange={(e) => field('referredByName', e.target.value)}
                required
              />
            </Field>

            {/* Referrer RI ID */}
            <Field label="Referrer RI ID" icon={Hash}>
              <input
                type="text"
                placeholder="12345678"
                className={inputCls}
                value={formData.referredByRiId}
                onChange={(e) => field('referredByRiId', e.target.value)}
                required
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </>
              )}
            </button>

          </form>
        </motion.div>
      </main>
    </div>
  )
}
