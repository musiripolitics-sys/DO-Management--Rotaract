'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Loader2, UserPlus, Search, CheckCircle2, XCircle, Building2, GraduationCap,
  Inbox, History, Phone, Mail, BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { initialsFor } from '@/lib/clubs'

type Registration = {
  id: string
  full_name: string
  email: string
  phone_number: string
  ri_id: string | null
  club_id: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  club_name: string | null
  club_type: string | null
  reviewed_by_name: string | null
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function RegistrationsPage() {
  const [all, setAll] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [actingOn, setActingOn] = useState<string | null>(null)

  const load = async (spinner = true) => {
    if (spinner) setLoading(true)
    const res = await fetch('/api/registrations?status=all')
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || 'Could not load registrations'); setLoading(false); return }
    setError(null)
    setAll(d.registrations ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const { pending, processed } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (r: Registration) =>
      !q ||
      r.full_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.club_name ?? '').toLowerCase().includes(q)
    return {
      pending: all.filter((r) => r.status === 'pending' && match(r)),
      processed: all.filter((r) => r.status !== 'pending' && match(r)).slice(0, 25),
    }
  }, [all, query])

  const act = async (r: Registration, action: 'approve' | 'reject') => {
    if (action === 'reject' && !confirm(`Decline ${r.full_name}'s registration for ${r.club_name}?`)) return
    setActingOn(r.id)
    try {
      const res = await fetch(`/api/registrations/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      toast.success(action === 'approve' ? `${r.full_name} approved into ${r.club_name} 🎉` : 'Registration declined')
      load(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActingOn(null)
    }
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[#F2A410]/12 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-[#B45309]" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1A1815]">Membership Requests</h1>
          <p className="text-sm text-[#1A1815]/50">Public registrations awaiting approval — approving creates the member's account</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" /></div>
      ) : error ? (
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-10 text-center text-sm text-[#1A1815]/55">{error}</div>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, club…"
              className="w-full bg-white border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40" />
          </div>

          {/* Pending queue */}
          <div>
            <h2 className="text-sm font-bold text-[#1A1815] inline-flex items-center gap-2 mb-3">
              <Inbox className="w-4 h-4 text-[#B45309]" /> Pending
              <span className="text-xs font-semibold text-[#B45309] bg-[#F2A410]/15 px-2 py-0.5 rounded-full">{pending.length}</span>
            </h2>
            {pending.length === 0 ? (
              <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-10 text-center">
                <BadgeCheck className="w-9 h-9 text-emerald-500/50 mx-auto mb-2" />
                <p className="text-sm text-[#1A1815]/45">All caught up — no pending registrations.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden">
                <ul className="divide-y divide-[#1A1815]/5">
                  {pending.map((r) => (
                    <li key={r.id} className="px-4 md:px-5 py-4 hover:bg-[#FAFAF9]">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#F2A410]/12 text-[#B45309] flex items-center justify-center text-xs font-bold shrink-0">
                            {initialsFor(r.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1A1815]">{r.full_name}
                              <span className="ml-2 text-[11px] font-normal text-[#1A1815]/40">{timeAgo(r.created_at)}</span>
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-[#1A1815]/50">
                              <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>
                              <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone_number}</span>
                              {r.ri_id && <span>RI {r.ri_id}</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-full shrink-0 w-fit ${r.club_type === 'college' ? 'bg-[#1A468F]/10 text-[#1A468F]' : 'bg-[#6D28D9]/10 text-[#6D28D9]'}`}>
                          {r.club_type === 'college' ? <GraduationCap className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          {r.club_name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => act(r, 'approve')} disabled={actingOn === r.id}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl px-4 py-2">
                            {actingOn === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button onClick={() => act(r, 'reject')} disabled={actingOn === r.id}
                            className="inline-flex items-center gap-1.5 text-[#1A1815]/55 hover:text-red-600 border border-[#1A1815]/12 hover:border-red-300 hover:bg-red-50 text-sm rounded-xl px-3.5 py-2">
                            <XCircle className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* History */}
          {processed.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-[#1A1815] inline-flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-[#1A1815]/40" /> Recently processed
              </h2>
              <div className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden">
                <ul className="divide-y divide-[#1A1815]/5">
                  {processed.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 md:px-5 py-3">
                      <div className="w-8 h-8 rounded-full bg-[#1A1815]/5 text-[#1A1815]/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initialsFor(r.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#1A1815]/75 truncate">{r.full_name} <span className="text-[#1A1815]/35">· {r.club_name}</span></p>
                        {r.rejection_reason && <p className="text-[11px] text-[#1A1815]/40 truncate">{r.rejection_reason}</p>}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full shrink-0 ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {r.status === 'approved' ? 'Approved' : 'Declined'}
                      </span>
                      {r.reviewed_by_name && <span className="hidden sm:block text-[11px] text-[#1A1815]/40 shrink-0">by {r.reviewed_by_name}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
