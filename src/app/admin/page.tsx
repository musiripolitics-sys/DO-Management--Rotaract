'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  CalendarCheck,
  Activity,
  Award,
  Loader2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Building2,
  BookMarked,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react'

/* ─────────────────────────── Types ─────────────────────────── */

type Scanner = {
  id: string
  full_name: string | null
  club_name: string | null
  status: string | null
  points_awarded: number
  check_in_time: string
}

type DRCBooking = {
  id: string
  club_name: string
  attendee_count: number
  contact_name: string | null
}

type EventInsight = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
  category: string | null
  scanCount: number
  notScannedCount: number
  attendanceRate: number
  scanners: Scanner[]
  totalScanners: number
  drcBookings: DRCBooking[]
  avgRating: number | null
  feedbackCount: number
}

type RecentScan = {
  id: string
  status: string | null
  check_in_time: string
  points_awarded: number
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
  events: { name: string | null } | { name: string | null }[] | null
}

type ClubStat = {
  club_name: string
  scan_count: number
  member_count: number
}

type OverviewData = {
  stats: {
    totalMembers: number
    totalEvents: number
    totalScans: number
    pointsAwarded: number
    drcBookings: number
    totalClubs: number
  }
  eventInsights: EventInsight[]
  recentScans: RecentScan[]
  clubStats: ClubStat[]
}

/* ─────────────────────────── Helpers ───────────────────────── */

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

const STATUS_STYLE: Record<string, string> = {
  'on-time': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'within-15': 'text-emerald-600 bg-emerald-50 border-emerald-100',
  'within-30': 'text-amber-700 bg-amber-50 border-amber-200',
  late: 'text-orange-700 bg-orange-50 border-orange-200',
}

const STATUS_LABEL: Record<string, string> = {
  'on-time': 'On time',
  'within-15': '±15 min',
  'within-30': '±30 min',
  late: 'Late',
}

const CATEGORY_STYLE: Record<string, string> = {
  DRC: 'bg-[#6D28D9]/10 text-[#6D28D9] border-[#6D28D9]/20',
  General: 'bg-[#1A468F]/10 text-[#1A468F] border-[#1A468F]/20',
  Special: 'bg-[#F2A410]/15 text-[#9B6A00] border-[#F2A410]/30',
}

const AVATAR_COLORS = [
  'bg-[#6D28D9]/15 text-[#6D28D9]',
  'bg-[#1A468F]/15 text-[#1A468F]',
  'bg-[#2D9DDB]/15 text-[#2D9DDB]',
  'bg-[#F2A410]/15 text-[#9B6A00]',
  'bg-emerald-100 text-emerald-700',
]

function avatarColor(name: string | null) {
  const code = (name ?? 'X').charCodeAt(0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

/* ─────────────────────────── Sub-components ────────────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  tint,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  tint: string
}) {
  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(26,24,21,0.04)] hover:shadow-[0_12px_32px_-18px_rgba(26,24,21,0.18)] transition-all">
      <div className={`w-9 h-9 rounded-xl ${tint} flex items-center justify-center mb-3`}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold leading-none tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-[#1A1815]/50">
        {label}
      </div>
    </div>
  )
}

function EventCard({ event, totalMembers }: { event: EventInsight; totalMembers: number }) {
  const [expanded, setExpanded] = useState(false)

  const catStyle = CATEGORY_STYLE[event.category ?? ''] ?? 'bg-[#1A1815]/8 text-[#1A1815]/60 border-[#1A1815]/10'
  const dateStr = new Date(event.event_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = new Date(event.start_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(26,24,21,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(26,24,21,0.15)] transition-all">
      {/* Event header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {event.category && (
                <span className={`text-[10px] font-bold uppercase tracking-[0.15em] border px-2 py-0.5 rounded-full ${catStyle}`}>
                  {event.category}
                </span>
              )}
            </div>
            <h3 className="font-bold text-[#1A1815] text-base leading-snug">{event.name}</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-[#1A1815]/50">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {dateStr} · {timeStr}
              </span>
              {event.location && (
                <span className="flex items-center gap-1 truncate max-w-[24ch]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
              )}
            </div>
          </div>
          {/* Attendance rate ring-style badge */}
          <div className="shrink-0 text-center">
            <div
              className="text-2xl font-extrabold leading-none tabular-nums"
              style={{ color: event.attendanceRate >= 60 ? '#16a34a' : event.attendanceRate >= 30 ? '#F2A410' : '#dc2626' }}
            >
              {event.attendanceRate}%
            </div>
            <div className="text-[9px] uppercase tracking-[0.15em] text-[#1A1815]/40 font-bold mt-0.5">
              attended
            </div>
          </div>
        </div>

        {/* Attendance bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#1A1815]/55">
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {event.scanCount} scanned in
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-[#1A1815]/30" />
              {event.notScannedCount} not scanned
            </span>
          </div>
          <div className="h-2 bg-[#1A1815]/6 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${event.attendanceRate}%`,
                background:
                  event.attendanceRate >= 60
                    ? '#16a34a'
                    : event.attendanceRate >= 30
                    ? '#F2A410'
                    : '#dc2626',
              }}
            />
          </div>
          <div className="text-[10px] text-[#1A1815]/40">
            {event.scanCount} of {totalMembers} members
          </div>
        </div>

        {/* Feedback row */}
        {event.feedbackCount > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1A1815]/6">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <svg
                  key={n}
                  className="w-3.5 h-3.5"
                  viewBox="0 0 20 20"
                  fill={n <= Math.round(event.avgRating ?? 0) ? '#F2A410' : '#1A181520'}
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs font-bold text-[#1A1815]/70">
              {event.avgRating?.toFixed(1)}
            </span>
            <span className="text-[10px] text-[#1A1815]/40">
              ({event.feedbackCount} rating{event.feedbackCount === 1 ? '' : 's'})
            </span>
          </div>
        )}
      </div>

      {/* Scanned-in section */}
      {event.scanCount > 0 && (
        <div className="border-t border-[#1A1815]/6 px-5 py-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#1A1815]/60 hover:text-[#1A1815] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Scanned in ({event.totalScanners})
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Avatar chips — always show first 6 */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {event.scanners.slice(0, expanded ? 10 : 6).map((s) => (
              <div
                key={s.id}
                title={`${s.full_name ?? '?'} · ${STATUS_LABEL[s.status ?? ''] ?? s.status ?? '—'} · +${s.points_awarded}pts`}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${STATUS_STYLE[s.status ?? ''] ?? 'bg-[#1A1815]/5 text-[#1A1815]/60 border-[#1A1815]/10'}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${avatarColor(s.full_name)}`}>
                  {initials(s.full_name)}
                </span>
                <span className="truncate max-w-[14ch]">{s.full_name ?? '—'}</span>
                <span className="opacity-60">+{s.points_awarded}</span>
              </div>
            ))}
            {!expanded && event.totalScanners > 6 && (
              <button
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[#6D28D9]/8 text-[#6D28D9] border border-[#6D28D9]/15 hover:bg-[#6D28D9]/15 transition-colors"
              >
                +{event.totalScanners - 6} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* DRC bookings section */}
      {event.category === 'DRC' && (
        <div className="border-t border-[#1A1815]/6 px-5 py-3">
          <p className="text-xs font-semibold text-[#1A1815]/55 flex items-center gap-1.5 mb-2">
            <BookMarked className="w-3.5 h-3.5 text-[#6D28D9]" />
            Club Registrations ({event.drcBookings.length})
          </p>
          {event.drcBookings.length === 0 ? (
            <p className="text-xs text-[#1A1815]/35 italic">No clubs registered yet</p>
          ) : (
            <div className="space-y-1.5">
              {event.drcBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl bg-[#6D28D9]/5 border border-[#6D28D9]/10 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1815] truncate">{b.club_name}</p>
                    {b.contact_name && (
                      <p className="text-xs text-[#1A1815]/45 truncate">Contact: {b.contact_name}</p>
                    )}
                  </div>
                  <div className="shrink-0 ml-3 text-right">
                    <span className="text-sm font-bold text-[#6D28D9]">{b.attendee_count}</span>
                    <p className="text-[10px] text-[#1A1815]/40 uppercase tracking-[0.12em]">
                      {b.attendee_count === 1 ? 'attendee' : 'attendees'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Page ──────────────────────────── */

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState<'all' | 'DRC'>('all')

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => r.json())
      .then((d) => { if (d?.stats) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    { icon: Users, label: 'Members', value: fmt(data?.stats.totalMembers ?? 0), color: '#6D28D9', tint: 'bg-[#F5F3FF]' },
    { icon: CalendarCheck, label: 'Events', value: fmt(data?.stats.totalEvents ?? 0), color: '#1A468F', tint: 'bg-[#EAF2FB]' },
    { icon: Activity, label: 'Total Scans', value: fmt(data?.stats.totalScans ?? 0), color: '#2D9DDB', tint: 'bg-[#E6F5FC]' },
    { icon: Award, label: 'Points Awarded', value: fmt(data?.stats.pointsAwarded ?? 0), color: '#F2A410', tint: 'bg-[#FEF6E1]' },
    { icon: BookMarked, label: 'DRC Bookings', value: fmt(data?.stats.drcBookings ?? 0), color: '#6D28D9', tint: 'bg-[#F5F3FF]' },
    { icon: Building2, label: 'Active Clubs', value: fmt(data?.stats.totalClubs ?? 0), color: '#059669', tint: 'bg-emerald-50' },
  ]

  const visibleEvents = data?.eventInsights.filter(
    (e) => eventFilter === 'all' || e.category === eventFilter,
  ) ?? []

  return (
    <div className="p-5 lg:p-8 space-y-8">

      {/* ── Header ── */}
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#6D28D9] mb-1.5">
          District 3233 · VIBE
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
          Admin <span className="text-[#6D28D9]">overview.</span>
        </h1>
        <p className="mt-1.5 text-sm text-[#1A1815]/55 max-w-lg">
          District engagement at a glance — event attendance, DRC registrations, and club standings.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 text-[#6D28D9]/50 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── KPI strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>

          {/* ── Event Insights ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A1815] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#6D28D9]" />
                Event Insights
              </h2>
              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-[#1A1815]/5 rounded-xl p-1">
                {(['all', 'DRC'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEventFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      eventFilter === f
                        ? 'bg-white text-[#6D28D9] shadow-sm'
                        : 'text-[#1A1815]/55 hover:text-[#1A1815]'
                    }`}
                  >
                    {f === 'all' ? 'All Events' : 'DRC Only'}
                  </button>
                ))}
              </div>
            </div>

            {visibleEvents.length === 0 ? (
              <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-12 text-center">
                <CalendarCheck className="w-10 h-10 text-[#1A1815]/20 mx-auto mb-3" />
                <p className="text-sm text-[#1A1815]/45">
                  {eventFilter === 'DRC' ? 'No DRC events found.' : 'No events found. Create one in the Events tab.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {visibleEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    totalMembers={data?.stats.totalMembers ?? 0}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Bottom row: Recent Scans + Club Standings ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Recent Scans */}
            <div className="lg:col-span-7 bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1A1815]/6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="font-semibold text-[#1A1815] text-sm">Live scan feed</h2>
                </div>
                <a
                  href="/admin/attendance"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6D28D9] hover:underline"
                >
                  Full report
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {(data?.recentScans?.length ?? 0) === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Activity className="w-9 h-9 text-[#1A1815]/15 mx-auto mb-3" />
                  <p className="text-sm text-[#1A1815]/45">No scans yet — check-in logs appear here in real time.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#1A1815]/5">
                  {data!.recentScans.map((scan) => {
                    const profile = one(scan.profiles)
                    const event = one(scan.events)
                    const meta = STATUS_STYLE[scan.status ?? ''] ?? 'bg-[#1A1815]/5 text-[#1A1815]/60 border-[#1A1815]/10'
                    return (
                      <li key={scan.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAF9] transition-colors">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(profile?.full_name ?? null)}`}>
                          {initials(profile?.full_name ?? profile?.email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1815] truncate">
                            {profile?.full_name || profile?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-[#1A1815]/45 truncate">
                            {event?.name ?? 'Event'} · {timeAgo(scan.check_in_time)}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#F2A410] tabular-nums">
                          +{scan.points_awarded}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.1em] border px-2 py-0.5 rounded-full ${meta}`}>
                          {STATUS_LABEL[scan.status ?? ''] ?? scan.status ?? '—'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Club Standings */}
            <div className="lg:col-span-5 bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
              <div className="px-5 py-3.5 border-b border-[#1A1815]/6">
                <h2 className="font-semibold text-[#1A1815] text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#6D28D9]" />
                  Club Standings
                </h2>
                <p className="text-xs text-[#1A1815]/40 mt-0.5">Ranked by total check-ins</p>
              </div>

              {(data?.clubStats?.length ?? 0) === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Building2 className="w-9 h-9 text-[#1A1815]/15 mx-auto mb-3" />
                  <p className="text-sm text-[#1A1815]/45">No club data yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#1A1815]/5">
                  {data!.clubStats.map((club, i) => {
                    const maxScans = data!.clubStats[0]?.scan_count ?? 1
                    const pct = Math.round((club.scan_count / maxScans) * 100)
                    const rank = i + 1
                    return (
                      <li key={club.club_name} className="px-5 py-3 hover:bg-[#FAFAF9] transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                              rank === 1
                                ? 'bg-[#FAB616]/20 text-[#9B6A00]'
                                : rank === 2
                                ? 'bg-[#9CA3AF]/15 text-[#4B5563]'
                                : rank === 3
                                ? 'bg-[#B45309]/15 text-[#92400E]'
                                : 'bg-[#1A1815]/6 text-[#1A1815]/50'
                            }`}
                          >
                            {rank}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-[#1A1815] truncate">{club.club_name}</p>
                              <span className="text-sm font-bold text-[#6D28D9] tabular-nums ml-2 shrink-0">
                                {club.scan_count}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#1A1815]/6 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#6D28D9]/60"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[#1A1815]/35 shrink-0 tabular-nums">
                                {club.member_count} members
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
