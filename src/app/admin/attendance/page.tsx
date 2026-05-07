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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
  'on-time': { text: 'On Time', cls: 'text-green-400 bg-green-400/10' },
  'within-15': { text: 'Within 15', cls: 'text-emerald-300 bg-emerald-300/10' },
  'within-30': { text: 'Within 30', cls: 'text-yellow-300 bg-yellow-300/10' },
  late: { text: 'Late', cls: 'text-orange-400 bg-orange-400/10' },
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
    <div className="p-6 lg:p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Meeting Attendance</h1>
        <p className="text-white/60">
          Pick an event to see who checked in, when they arrived, and what points they earned.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: events list */}
        <Card className="lg:col-span-4 bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-lg flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              Events
              {events && (
                <span className="ml-auto text-xs font-medium text-white/50">
                  {events.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-3 relative">
            <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <Input
              value={eventQuery}
              onChange={(e) => setEventQuery(e.target.value)}
              placeholder="Search events..."
              className="bg-black/40 border-white/10 text-white pl-9 placeholder:text-white/30 h-9"
            />
          </div>
          <CardContent className="overflow-y-auto flex-1 pt-0 px-3 pb-3 space-y-1">
            {!events && !eventsError && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
              </div>
            )}
            {eventsError && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                {eventsError}
              </div>
            )}
            {events && filteredEvents.length === 0 && (
              <div className="text-sm text-white/45 py-8 text-center">
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
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/10 ring-1 ring-white/20'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white/90 line-clamp-2">
                      {e.name}
                    </p>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                        e.attendee_count > 0
                          ? 'bg-[#f58220]/15 text-[#f58220]'
                          : 'bg-white/5 text-white/45'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      {e.attendee_count}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/45">
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
          </CardContent>
        </Card>

        {/* RIGHT: attendees */}
        <Card className="lg:col-span-8 bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-lg flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
          <CardHeader className="pb-3">
            {detail ? (
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-white text-lg leading-tight">
                    {detail.event.name}
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {fmtDate(detail.event.event_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {fmtTime(detail.event.start_time)}
                    </span>
                    {detail.event.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {detail.event.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[#f58220] font-medium">
                      <CalendarCheck className="w-3.5 h-3.5" /> {detail.attendees.length} attended
                    </span>
                  </div>
                </div>
                {detail.attendees.length > 0 && (
                  <Button
                    type="button"
                    onClick={downloadCsv}
                    variant="outline"
                    className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            ) : (
              <CardTitle className="text-white text-lg">
                {detailLoading ? 'Loading…' : 'Pick an event'}
              </CardTitle>
            )}
          </CardHeader>

          {detail && detail.attendees.length > 0 && (
            <div className="px-6 pb-3 relative">
              <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <Input
                value={attendeeQuery}
                onChange={(e) => setAttendeeQuery(e.target.value)}
                placeholder="Search by name, email, or club..."
                className="bg-black/40 border-white/10 text-white pl-9 placeholder:text-white/30 h-9"
              />
            </div>
          )}

          <CardContent className="overflow-y-auto flex-1 pt-0">
            {detailLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
              </div>
            )}
            {detailError && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-md p-4">
                {detailError}
              </div>
            )}
            {detail && detail.attendees.length === 0 && !detailLoading && (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/55 text-sm">
                  No one has checked in to this event yet.
                </p>
              </div>
            )}
            {detail && detail.attendees.length > 0 && (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.14em] text-white/45 bg-white/5">
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
                        cls: 'text-white/50 bg-white/10',
                      }
                      return (
                        <tr
                          key={a.id}
                          className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                        >
                          <Td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#f58220]/15 text-[#f58220] flex items-center justify-center text-xs font-semibold shrink-0">
                                {(p?.full_name || p?.email || '?').slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-white/95 font-medium truncate">
                                  {p?.full_name || '—'}
                                </div>
                                {p?.email && (
                                  <a
                                    href={`mailto:${p.email}`}
                                    className="text-[11px] text-white/45 hover:text-white inline-flex items-center gap-1 truncate"
                                  >
                                    <Mail className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{p.email}</span>
                                  </a>
                                )}
                              </div>
                              <span className="ml-2 text-white/30 text-[11px] font-mono">
                                #{i + 1}
                              </span>
                            </div>
                          </Td>
                          <Td className="text-white/65">
                            {p?.club_name || '—'}
                            {p?.designation && (
                              <div className="text-[11px] text-white/40">{p.designation}</div>
                            )}
                          </Td>
                          <Td className="text-white/65 whitespace-nowrap">
                            {fmtTime(a.check_in_time)}
                            <div className="text-[11px] text-white/35">
                              {fmtDate(a.check_in_time)}
                            </div>
                          </Td>
                          <Td>
                            <span
                              className={`text-[11px] font-bold px-2 py-1 rounded ${meta.cls}`}
                            >
                              {meta.text}
                            </span>
                          </Td>
                          <Td className="text-right">
                            <span className="text-[#f58220] font-bold">
                              +{a.points_awarded}
                            </span>
                          </Td>
                        </tr>
                      )
                    })}
                    {filteredAttendees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-white/45 text-sm">
                          No attendees match &ldquo;{attendeeQuery}&rdquo;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-medium px-6 py-3 ${className}`}>{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3 align-top ${className}`}>{children}</td>
}
