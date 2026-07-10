'use client'

import { useEffect, useState } from 'react'
import {
  Shield,
  Loader2,
  QrCode,
  Users,
  Activity,
  Crown,
  CalendarCheck,
  Clock,
} from 'lucide-react'

type Member = {
  id: string
  full_name: string | null
  email: string | null
  club_name: string | null
  designation: string | null
  isChief: boolean
  scans: number
  eventsCovered: number
  lastScan: string | null
}

type Data = {
  team: Member[]
  totals: { sergeants: number; activeScanners: number; idle: number; totalScans: number }
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function initials(name: string | null) {
  if (!name) return '?'
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (name.slice(0, 2)).toUpperCase()
}

export default function SergeantTeamPage() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/sergeant-team')
      .then((r) => r.json())
      .then((d) => {
        if (d?.team) setData(d)
        else setError(d?.error || 'Could not load team')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Network error'))
  }, [])

  const maxScans = Math.max(1, ...(data?.team.map((t) => t.scans) ?? [1]))

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] mb-2">
          District 3233 · Sergeant-At-Arms
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
          Sergeant <span className="text-[#6D28D9]">team.</span>
        </h1>
        <p className="mt-2 text-sm text-[#1A1815]/65 max-w-xl">
          Your scanning team and their live activity — who's scanning and how many check-ins each has logged.
        </p>
      </header>

      {!data && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4">{error}</div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Users} label="Sergeants" value={data.totals.sergeants} color="#6D28D9" tint="bg-[#F5F3FF]" />
            <Kpi icon={Activity} label="Active Scanners" value={data.totals.activeScanners} color="#16a34a" tint="bg-emerald-50" />
            <Kpi icon={Clock} label="Idle" value={data.totals.idle} color="#9B6A00" tint="bg-[#F2A410]/10" />
            <Kpi icon={QrCode} label="Total Scans" value={data.totals.totalScans} color="#1A468F" tint="bg-[#1A468F]/10" />
          </div>

          {/* Roster */}
          <div className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
            <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_5rem_6rem_7rem] gap-4 px-5 py-3 bg-[#FAFAF9] border-b border-[#1A1815]/6 text-[10px] font-bold tracking-[0.14em] uppercase text-[#1A1815]/45">
              <span>Sergeant</span>
              <span>Scans</span>
              <span className="text-right">Total</span>
              <span className="text-right">Events</span>
              <span className="text-right">Last active</span>
            </div>
            <ul className="divide-y divide-[#1A1815]/5">
              {data.team.map((m) => (
                <li key={m.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_5rem_6rem_7rem] gap-3 md:gap-4 items-center px-4 md:px-5 py-3 hover:bg-[#FAFAF9] transition-colors">
                  {/* Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.isChief ? 'bg-[#F2A410]/15 text-[#9B6A00]' : 'bg-[#6D28D9]/12 text-[#6D28D9]'}`}>
                      {initials(m.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#1A1815] truncate flex items-center gap-1.5">
                        {m.full_name || '—'}
                        {m.isChief && <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] bg-[#F2A410]/15 text-[#9B6A00] px-1.5 py-0.5 rounded-full"><Crown className="w-2.5 h-2.5" /> Chief</span>}
                      </p>
                      <p className="text-[11px] text-[#1A1815]/50 truncate">
                        {(m.designation || '').replace(/^DO - /, '')}{m.club_name ? ` · ${m.club_name}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Scan bar */}
                  <div className="hidden md:block">
                    <div className="h-2 bg-[#1A1815]/6 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#6D28D9]" style={{ width: `${(m.scans / maxScans) * 100}%` }} />
                    </div>
                  </div>

                  {/* Total scans */}
                  <div className="md:text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-bold ${m.scans > 0 ? 'text-[#6D28D9]' : 'text-[#1A1815]/30'}`}>
                      <QrCode className="w-3.5 h-3.5 md:hidden" />
                      {m.scans}
                      <span className="md:hidden text-[11px] font-normal text-[#1A1815]/45">scans</span>
                    </span>
                  </div>

                  {/* Events covered */}
                  <div className="md:text-right">
                    <span className="inline-flex items-center gap-1 text-sm text-[#1A1815]/70">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-500 md:hidden" />
                      {m.eventsCovered}
                      <span className="md:hidden text-[11px] text-[#1A1815]/45">events</span>
                    </span>
                  </div>

                  {/* Last active */}
                  <div className="md:text-right">
                    <span className={`text-xs ${m.scans > 0 ? 'text-[#1A1815]/60' : 'text-[#1A1815]/30'}`}>
                      {timeAgo(m.lastScan)}
                    </span>
                  </div>
                </li>
              ))}
              {data.team.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-[#1A1815]/45">
                  <Shield className="w-8 h-8 text-[#1A1815]/15 mx-auto mb-2" />
                  No sergeants found.
                </li>
              )}
            </ul>
          </div>

          <p className="text-xs text-[#1A1815]/45">
            Scan counts come from the check-in audit trail (who operated the scanner). A sergeant shows 0 until they sign in and scan at an event.
          </p>
        </>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, color, tint }: { icon: React.ElementType; label: string; value: number; color: string; tint: string }) {
  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
      <div className={`w-9 h-9 rounded-xl ${tint} flex items-center justify-center mb-3`}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold leading-none tabular-nums" style={{ color }}>{value}</div>
      <div className="mt-1.5 text-[10px] font-bold tracking-[0.16em] uppercase text-[#1A1815]/50">{label}</div>
    </div>
  )
}
