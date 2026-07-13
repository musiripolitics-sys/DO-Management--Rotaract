'use client'

import { useEffect, useState } from 'react'
import {
  Users, UserCheck, Crown, Activity, Award, Loader2, Calendar, Clock, MapPin, TrendingUp,
} from 'lucide-react'
import { initialsFor } from '@/lib/clubs'

type Dashboard = {
  stats: { totalMembers: number; activeMembers: number; officerCount: number; rewardPoints: number; avgAttendance: number }
  officers: { president: string | null; secretary: string | null; treasurer: string | null }
  growth: { label: string; count: number }[]
  avenueBreakdown: { avenue: string; count: number }[]
  recentActivity: { member: string; event: string; points: number; time: string }[]
  upcomingEvents: { id: string; name: string; location: string | null; event_date: string; start_time: string; category: string | null }[]
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function ClubDashboard({ clubId }: { clubId: string }) {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/clubs/${clubId}/dashboard`)
      .then((r) => r.json())
      .then((d) => { if (d?.stats) setData(d); else setError(d?.error || 'Could not load dashboard') })
      .catch((e) => setError(e instanceof Error ? e.message : 'Network error'))
  }, [clubId])

  if (error) return <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4">{error}</div>
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" /></div>

  const maxGrowth = Math.max(1, ...data.growth.map((g) => g.count))
  const maxAvenue = Math.max(1, ...data.avenueBreakdown.map((a) => a.count))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi icon={Users} label="Members" value={data.stats.totalMembers} color="#6D28D9" tint="bg-[#F5F3FF]" />
        <Kpi icon={UserCheck} label="Active" value={data.stats.activeMembers} color="#16a34a" tint="bg-emerald-50" />
        <Kpi icon={Crown} label="Officers" value={data.stats.officerCount} color="#9B6A00" tint="bg-[#F2A410]/10" />
        <Kpi icon={Activity} label="Avg attendance" value={`${data.stats.avgAttendance}%`} color="#1A468F" tint="bg-[#1A468F]/10" />
        <Kpi icon={Award} label="Reward points" value={data.stats.rewardPoints.toLocaleString()} color="#F58220" tint="bg-[#F58220]/10" />
      </div>

      {/* Officers strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['president', 'secretary', 'treasurer'] as const).map((pos) => (
          <div key={pos} className="bg-white border border-[#1A1815]/8 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${data.officers[pos] ? 'bg-[#6D28D9]/12 text-[#6D28D9]' : 'bg-[#1A1815]/5 text-[#1A1815]/30'}`}>
              {data.officers[pos] ? initialsFor(data.officers[pos]) : '—'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A1815]/45">{pos}</p>
              <p className="text-sm font-semibold text-[#1A1815] truncate">{data.officers[pos] || 'Not assigned'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth */}
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#1A1815] inline-flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-[#6D28D9]" /> Membership growth</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {data.growth.map((g, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-[#6D28D9]/15 rounded-t-md relative" style={{ height: `${(g.count / maxGrowth) * 100}%`, minHeight: g.count > 0 ? 4 : 0 }}>
                  <div className="absolute inset-x-0 -top-5 text-center text-[10px] font-bold text-[#6D28D9]">{g.count || ''}</div>
                </div>
                <span className="text-[10px] text-[#1A1815]/45">{g.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Avenue breakdown */}
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#1A1815] mb-4">Members by avenue</h3>
          {data.avenueBreakdown.length === 0 ? (
            <p className="text-sm text-[#1A1815]/45">No members yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.avenueBreakdown.map((a) => (
                <div key={a.avenue}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#1A1815]/70 truncate">{a.avenue}</span>
                    <span className="font-bold text-[#1A1815]/80 tabular-nums">{a.count}</span>
                  </div>
                  <div className="h-1.5 bg-[#1A1815]/6 rounded-full overflow-hidden">
                    <div className="h-full bg-[#6D28D9] rounded-full" style={{ width: `${(a.count / maxAvenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#1A1815] inline-flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-emerald-500" /> Recent check-ins</h3>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-[#1A1815]/45">No recent activity.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.recentActivity.map((a, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">{initialsFor(a.member)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#1A1815] truncate"><b>{a.member}</b> at {a.event}</p>
                    <p className="text-[11px] text-[#1A1815]/45">{timeAgo(a.time)}</p>
                  </div>
                  <span className="text-xs font-bold text-[#F58220] shrink-0">+{a.points}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming events */}
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#1A1815] inline-flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-[#2D9DDB]" /> Upcoming events</h3>
          {data.upcomingEvents.length === 0 ? (
            <p className="text-sm text-[#1A1815]/45">No upcoming events.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.upcomingEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <div className="text-center shrink-0 w-11">
                    <p className="text-[9px] uppercase tracking-wider text-[#1A1815]/40 font-bold leading-none">{new Date(e.start_time).toLocaleDateString('en-IN', { month: 'short' })}</p>
                    <p className="text-lg font-extrabold text-[#1A1815] leading-none">{new Date(e.start_time).getDate()}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1A1815] truncate">{e.name}</p>
                    <p className="text-[11px] text-[#1A1815]/50 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />{new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {e.location && <><MapPin className="w-3 h-3 ml-1" /> {e.location}</>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, color, tint }: { icon: React.ElementType; label: string; value: string | number; color: string; tint: string }) {
  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-4 shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
      <div className={`w-9 h-9 rounded-xl ${tint} flex items-center justify-center mb-3`}><Icon className="w-4.5 h-4.5" style={{ color }} /></div>
      <div className="text-2xl font-extrabold leading-none tabular-nums" style={{ color }}>{value}</div>
      <div className="mt-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[#1A1815]/50">{label}</div>
    </div>
  )
}
