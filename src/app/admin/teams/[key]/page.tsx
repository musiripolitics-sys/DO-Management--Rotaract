'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Building2,
  Search,
  Users,
} from 'lucide-react'

type Member = {
  id: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  club_name: string | null
  designation: string
  teamKey: string
  teamLabel: string
  rank: number
}

function initials(name: string | null) {
  if (!name) return '?'
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export default function TeamDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/admin/teams')
      .then((r) => r.json())
      .then((d) => {
        if (!d?.members) { setError(d?.error || 'Could not load team'); return }
        const list: Member[] = d.members.filter((m: Member) => m.teamKey === key)
        list.sort((a, b) => a.rank - b.rank || (a.full_name ?? '').localeCompare(b.full_name ?? ''))
        setMembers(list)
        setLabel(list[0]?.teamLabel ?? (d.teams?.find((t: { key: string; label: string }) => t.key === key)?.label ?? 'Team'))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Network error'))
  }, [key])

  const filtered = useMemo(() => {
    if (!members) return []
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.club_name || '').toLowerCase().includes(q) ||
        (m.designation || '').toLowerCase().includes(q),
    )
  }, [members, query])

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div>
        <Link href="/admin/teams" className="inline-flex items-center gap-1.5 text-sm text-[#1A1815]/55 hover:text-[#6D28D9] mb-3">
          <ArrowLeft className="w-4 h-4" /> All teams
        </Link>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1A1815]">
          {label || 'Team'}
        </h1>
        {members && (
          <p className="text-sm text-[#1A1815]/60 mt-1">
            {members.length} member{members.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {!members && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4">{error}</div>
      )}

      {members && members.length > 0 && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role, or club…"
              className="w-full bg-white border border-[#1A1815]/10 rounded-xl pl-9 pr-3 h-10 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 outline-none transition"
            />
          </div>

          <div className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
            <ul className="divide-y divide-[#1A1815]/5">
              {filtered.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-[#FAFAF9] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-[#6D28D9]/12 text-[#6D28D9] flex items-center justify-center text-xs font-bold shrink-0">
                    {initials(m.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[#1A1815] truncate">{m.full_name || '—'}</p>
                    <p className="text-[11px] text-[#1A1815]/55 truncate">{m.designation}</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-0.5 text-xs text-[#1A1815]/60 shrink-0">
                    {m.club_name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {m.club_name}
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      {m.phone_number && (
                        <a href={`tel:${m.phone_number}`} className="inline-flex items-center gap-1 hover:text-[#6D28D9]">
                          <Phone className="w-3 h-3" /> {m.phone_number}
                        </a>
                      )}
                      {m.email && (
                        <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 hover:text-[#6D28D9]">
                          <Mail className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-[#1A1815]/45">No members match.</li>
              )}
            </ul>
          </div>
        </>
      )}

      {members && members.length === 0 && !error && (
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-14 text-center">
          <Users className="w-9 h-9 text-[#1A1815]/20 mx-auto mb-3" />
          <p className="text-sm text-[#1A1815]/55">No members in this team.</p>
        </div>
      )}
    </div>
  )
}
