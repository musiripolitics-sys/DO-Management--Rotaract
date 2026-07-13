'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, UserCog, Search, ShieldAlert, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { initialsFor } from '@/lib/clubs'

type Member = {
  id: string
  full_name: string | null
  email: string | null
  designation: string | null
  access_role: string
  club_name: string | null
}

const ROLE_LABEL: Record<string, string> = {
  drr: 'DRR',
  adrr: 'ADRR',
  drs: 'DRS',
  adrs: 'ADRS',
  chief_sergeant: 'Chief Sergeant',
  sergeant: 'Sergeant',
  president: 'President',
  district_official: 'District Official',
  secretary: 'Secretary',
  member: 'Member',
}

const ROLE_TINT: Record<string, string> = {
  drr: 'bg-[#6D28D9]/10 text-[#6D28D9]',
  adrr: 'bg-[#6D28D9]/10 text-[#6D28D9]',
  drs: 'bg-[#1A468F]/10 text-[#1A468F]',
  adrs: 'bg-[#1A468F]/10 text-[#1A468F]',
  chief_sergeant: 'bg-[#F58220]/10 text-[#B45309]',
  sergeant: 'bg-[#F58220]/10 text-[#B45309]',
  president: 'bg-[#F2A410]/15 text-[#9B6A00]',
  district_official: 'bg-[#2D9DDB]/10 text-[#1D6FA3]',
  secretary: 'bg-emerald-100 text-emerald-700',
  member: 'bg-[#1A1815]/6 text-[#1A1815]/55',
}

export default function RoleManagerPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/admin/roles')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const d = await res.json()
    setMembers(d.members ?? [])
    setRoles(d.roles ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const m of members) c[m.access_role] = (c[m.access_role] ?? 0) + 1
    return c
  }, [members])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (roleFilter && m.access_role !== roleFilter) return false
      if (!q) return true
      return (
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.club_name || '').toLowerCase().includes(q) ||
        (m.designation || '').toLowerCase().includes(q)
      )
    })
  }, [members, query, roleFilter])

  const resetPassword = async (m: Member) => {
    if (!confirm(`Reset password for ${m.full_name || m.email}? They'll create a new one on their next sign-in.`)) return
    setSavingId(m.id)
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, reset_password: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not reset password')
      toast.success(`Password reset — ${m.full_name || 'member'} will set a new one at sign-in`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not reset password')
    } finally {
      setSavingId(null)
    }
  }

  const changeRole = async (m: Member, role: string) => {
    if (role === m.access_role) return
    setSavingId(m.id)
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, access_role: role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update role')
      setMembers((list) => list.map((x) => (x.id === m.id ? { ...x, access_role: role } : x)))
      toast.success(`${m.full_name || 'Member'} → ${ROLE_LABEL[role] ?? role}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not update role')
    } finally {
      setSavingId(null)
    }
  }

  if (forbidden) {
    return (
      <div className="p-10 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="w-10 h-10 text-red-500/60" />
        <p className="text-sm text-[#1A1815]/55">The role manager is available to the super admin only.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
          <UserCog className="w-5 h-5 text-[#6D28D9]" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1A1815]">Role Manager</h1>
          <p className="text-sm text-[#1A1815]/50">Assign access roles — changes take effect on the member's next request</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" /></div>
      ) : (
        <>
          {/* Role filter chips */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRoleFilter('')}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${!roleFilter ? 'bg-[#1A1815] text-white border-[#1A1815]' : 'border-[#1A1815]/12 text-[#1A1815]/60 hover:border-[#1A1815]/30'}`}>
              All · {members.length}
            </button>
            {roles.filter((r) => counts[r]).map((r) => (
              <button key={r} onClick={() => setRoleFilter(roleFilter === r ? '' : r)}
                className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${roleFilter === r ? 'bg-[#6D28D9] text-white border-[#6D28D9]' : 'border-[#1A1815]/12 text-[#1A1815]/60 hover:border-[#6D28D9]/40 hover:text-[#6D28D9]'}`}>
                {ROLE_LABEL[r] ?? r} · {counts[r]}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, club, designation…"
              className="w-full bg-white border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40" />
          </div>

          {/* List */}
          <div className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-[#1A1815]/5">
              {visible.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-[#FAFAF9]">
                  <div className="w-9 h-9 rounded-full bg-[#6D28D9]/12 text-[#6D28D9] flex items-center justify-center text-xs font-bold shrink-0">
                    {initialsFor(m.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1A1815] truncate">{m.full_name || '—'}</p>
                    <p className="text-[11px] text-[#1A1815]/50 truncate">
                      {[m.club_name, m.designation, m.email].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <span className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full shrink-0 ${ROLE_TINT[m.access_role] ?? ROLE_TINT.member}`}>
                    {ROLE_LABEL[m.access_role] ?? m.access_role}
                  </span>
                  <div className="relative shrink-0">
                    <select
                      value={m.access_role}
                      disabled={savingId === m.id}
                      onChange={(e) => changeRole(m, e.target.value)}
                      className="bg-white border border-[#1A1815]/15 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-medium text-[#1A1815] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 disabled:opacity-40"
                    >
                      {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
                    </select>
                    {savingId === m.id && (
                      <Loader2 className="absolute -left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6D28D9] animate-spin" />
                    )}
                  </div>
                  <button
                    onClick={() => resetPassword(m)}
                    disabled={savingId === m.id}
                    title="Reset password — member sets a new one at next sign-in"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/40 hover:text-[#6D28D9] hover:bg-[#F5F3FF] shrink-0 disabled:opacity-40"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {visible.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-[#1A1815]/45">No members match.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
