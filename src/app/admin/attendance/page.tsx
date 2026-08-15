'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CalendarCheck,
  Clock,
  Loader2,
  MapPin,
  Mail,
  Search,
  Users,
  Download,
} from 'lucide-react'

type EventLite = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
  category: string | null
  attendee_count: number
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  club_name: string | null
  designation: string | null
  access_role: string | null
}

type Attendee = {
  id: string
  check_in_time: string
  status: string | null
  points_awarded: number
  profiles: Profile | Profile[] | null
}

type EventDetail = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
  end_time: string | null
  category: string | null
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  'on-time': { text: 'On Time', cls: 'text-emerald-700 bg-emerald-100' },
  'within-15': { text: 'Within 15', cls: 'text-emerald-600 bg-emerald-50' },
  'within-30': { text: 'Within 30', cls: 'text-amber-700 bg-amber-50' },
  late: { text: 'Late', cls: 'text-orange-700 bg-orange-50' },
}

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AttendancePage() {
  const [events, setEvents] = useState<EventLite[] | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ event: EventDetail; attendees: Attendee[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [eventQuery, setEventQuery] = useState('')
  const [attendeeQuery, setAttendeeQuery] = useState('')

  useEffect(() => {
    fetch('/api/admin/attendance')
      .then((r) => r.json())
      .then((d) => {
        if (d?.events) {
          setEvents(d.events)
          if (d.events.length > 0) setSelectedId(d.events[0].id)
        } else {
          setEventsError(d?.error || 'Could not load events')
        }
      })
      .catch((e) => setEventsError(e instanceof Error ? e.message : 'Network error'))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    setAttendeeQuery('')
    fetch(`/api/admin/attendance?event_id=${selectedId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.event) setDetail(d)
        else setDetailError(d?.error || 'Could not load attendees')
      })
      .catch((e) => setDetailError(e instanceof Error ? e.message : 'Network error'))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  const filteredEvents = useMemo(() => {
    if (!events) return []
    const q = eventQuery.trim().toLowerCase()
    if (!q) return events
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q),
    )
  }, [events, eventQuery])

  // Present counts. Club Presidents, club Secretaries and Members map to
  // their own buckets; everyone else — DRR, ADRR, DRS, ADRS, chief sergeant,
  // sergeant, admin, and the generic district_official — counts as a
  // District Official. A null/unknown role defaults to member (app convention).
  const roleBreakdown = useMemo(() => {
    const b = { president: 0, secretary: 0, district_official: 0, member: 0 }
    if (!detail) return b
    for (const a of detail.attendees) {
      const r = pickOne<Profile>(a.profiles)?.access_role ?? 'member'
      if (r === 'president') b.president++
      else if (r === 'secretary') b.secretary++
      else if (r === 'member') b.member++
      else b.district_official++
    }
    return b
  }, [detail])

  const filteredAttendees = useMemo(() => {
    if (!detail) return []
    const q = attendeeQuery.trim().toLowerCase()
    if (!q) return detail.attendees
    return detail.attendees.filter((a) => {
      const p = pickOne<Profile>(a.profiles)
      return (
        (p?.full_name || '').toLowerCase().includes(q) ||
        (p?.email || '').toLowerCase().includes(q) ||
        (p?.club_name || '').toLowerCase().includes(q)
      )
    })
  }, [detail, attendeeQuery])

  function downloadCsv() {
    if (!detail) return
    const rows = [
      ['Name', 'Email', 'Club', 'Designation', 'Check-in', 'Status', 'Points'],
      ...detail.attendees.map((a) => {
        const p = pickOne<Profile>(a.profiles)
        return [
          p?.full_name ?? '',
          p?.email ?? '',
          p?.club_name ?? '',
          p?.designation ?? '',
          new Date(a.check_in_time).toISOString(),
          a.status ?? '',
          String(a.points_awarded),
        ]
      }),
    ]
    const csv = rows
      .map((r) => r.map((cell) => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = detail.event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    a.download = `${safeName}-attendance.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] mb-2">
          District 3233 · Attendance
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
          Meeting <span className="text-[#6D28D9]">attendance.</span>
        </h1>
        <p className="mt-2 text-sm text-[#1A1815]/65 max-w-xl">
          Pick an event to see who checked in, when they arrived, and what
          points they earned.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: events list */}
        <div className="lg:col-span-4 bg-white border border-[#1A1815]/8 rounded-2xl shadow-[0_1px_2px_rgba(26,24,21,0.04)] flex flex-col h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1A1815] inline-flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#6D28D9]" />
                Events
              </h2>
              {events && (
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#1A1815]/45">
                  {events.length} total
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
              <input
                value={eventQuery}
                onChange={(e) => setEventQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl pl-9 pr-3 h-10 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 outline-none transition"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-2 pb-3 space-y-1">
            {!events && !eventsError && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 text-[#6D28D9]/60 animate-spin" />
              </div>
            )}
            {eventsError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 m-2">
                {eventsError}
              </div>
            )}
            {events && filteredEvents.length === 0 && (
              <div className="text-sm text-[#1A1815]/45 py-8 text-center">
                No events match.
              </div>
            )}
            {filteredEvents.map((e) => {
              const isActive = selectedId === e.id
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#F5F3FF] ring-1 ring-[#6D28D9]/40'
                      : 'hover:bg-[#FAFAF9]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium leading-snug line-clamp-2 ${
                        isActive ? 'text-[#6D28D9]' : 'text-[#1A1815]'
                      }`}
                    >
                      {e.name}
                    </p>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${
                        e.attendee_count > 0
                          ? 'bg-[#F2A410]/15 text-[#A06F00]'
                          : 'bg-[#1A1815]/5 text-[#1A1815]/50'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      {e.attendee_count}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#1A1815]/55">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtDate(e.event_date)}
                    </span>
                    {e.location && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[14ch]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{e.location}</span>
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT: attendees */}
        <div className="lg:col-span-8 bg-white border border-[#1A1815]/8 rounded-2xl shadow-[0_1px_2px_rgba(26,24,21,0.04)] flex flex-col h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-[#1A1815]/8">
            {detail ? (
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-[#1A1815] leading-tight">
                    {detail.event.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#1A1815]/60">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#6D28D9]" />
                      {fmtDate(detail.event.event_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6D28D9]" />
                      {fmtTime(detail.event.start_time)}
                    </span>
                    {detail.event.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#6D28D9]" />
                        {detail.event.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[#F2A410] font-semibold">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      {detail.attendees.length} attended
                    </span>
                  </div>
                </div>
                {detail.attendees.length > 0 && (
                  <button
                    type="button"
                    onClick={downloadCsv}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1A1815]/12 hover:border-[#6D28D9]/40 hover:bg-[#F5F3FF] hover:text-[#6D28D9] text-[#1A1815] text-sm font-medium px-4 py-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                )}
              </div>
            ) : (
              <h2 className="text-lg font-bold text-[#1A1815]">
                {detailLoading ? 'Loading…' : 'Pick an event'}
              </h2>
            )}
          </div>

          {detail && detail.attendees.length > 0 && (
            <div className="px-6 py-4 border-b border-[#1A1815]/6 bg-[#FAFAF9]/60">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1815]/45 mb-2.5">
                Present by role
              </p>
              <div className="flex flex-wrap gap-2.5">
                <RoleStat label="Presidents" count={roleBreakdown.president} />
                <RoleStat label="Secretaries" count={roleBreakdown.secretary} />
                <RoleStat label="District Officials" count={roleBreakdown.district_official} />
                <RoleStat label="Members" count={roleBreakdown.member} />
              </div>
            </div>
          )}

          {detail && detail.attendees.length > 0 && (
            <div className="px-6 py-3 border-b border-[#1A1815]/6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
                <input
                  value={attendeeQuery}
                  onChange={(e) => setAttendeeQuery(e.target.value)}
                  placeholder="Search by name, email, or club..."
                  className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl pl-9 pr-3 h-10 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 outline-none transition"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {detailLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#6D28D9]/60 animate-spin" />
              </div>
            )}
            {detailError && (
              <div className="m-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4">
                {detailError}
              </div>
            )}
            {detail && detail.attendees.length === 0 && !detailLoading && (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-[#1A1815]/20 mx-auto mb-3" />
                <p className="text-[#1A1815]/55 text-sm">
                  No one has checked in to this event yet.
                </p>
              </div>
            )}
            {detail && detail.attendees.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.14em] text-[#1A1815]/50 bg-[#FAFAF9] border-b border-[#1A1815]/8">
                    <tr>
                      <Th>Name</Th>
                      <Th>Club</Th>
                      <Th>Check-in</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Points</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.map((a, i) => {
                      const p = pickOne<Profile>(a.profiles)
                      const meta = statusLabel[a.status ?? ''] ?? {
                        text: a.status ?? '—',
                        cls: 'text-[#1A1815]/65 bg-[#1A1815]/5',
                      }
                      return (
                        <tr
                          key={a.id}
                          className="border-b border-[#1A1815]/6 last:border-0 hover:bg-[#FAFAF9] transition-colors"
                        >
                          <Td>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center text-xs font-bold shrink-0">
                                {(p?.full_name || p?.email || '?').slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[#1A1815] font-medium truncate">
                                  {p?.full_name || '—'}
                                </div>
                                {p?.email && (
                                  <a
                                    href={`mailto:${p.email}`}
                                    className="text-[11px] text-[#1A1815]/55 hover:text-[#6D28D9] inline-flex items-center gap-1 truncate"
                                  >
                                    <Mail className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{p.email}</span>
                                  </a>
                                )}
                              </div>
                              <span className="ml-2 text-[#1A1815]/30 text-[11px] font-mono">
                                #{i + 1}
                              </span>
                            </div>
                          </Td>
                          <Td className="text-[#1A1815]/70">
                            {p?.club_name || '—'}
                            {p?.designation && (
                              <div className="text-[11px] text-[#1A1815]/45">
                                {p.designation}
                              </div>
                            )}
                          </Td>
                          <Td className="text-[#1A1815]/70 whitespace-nowrap">
                            {fmtTime(a.check_in_time)}
                            <div className="text-[11px] text-[#1A1815]/40">
                              {fmtDate(a.check_in_time)}
                            </div>
                          </Td>
                          <Td>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded ${meta.cls}`}
                            >
                              {meta.text}
                            </span>
                          </Td>
                          <Td className="text-right">
                            <span className="text-[#F2A410] font-extrabold tabular-nums">
                              +{a.points_awarded}
                            </span>
                          </Td>
                        </tr>
                      )
                    })}
                    {filteredAttendees.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-10 text-center text-[#1A1815]/45 text-sm"
                        >
                          No attendees match &ldquo;{attendeeQuery}&rdquo;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RoleStat({ label, count }: { label: string; count: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-[#1A1815]/10 bg-white px-3.5 py-2">
      <span className="text-lg font-extrabold text-[#6D28D9] tabular-nums leading-none">{count}</span>
      <span className="text-xs font-medium text-[#1A1815]/70">{label}</span>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-6 py-3 ${className}`}>{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3.5 align-top ${className}`}>{children}</td>
}
