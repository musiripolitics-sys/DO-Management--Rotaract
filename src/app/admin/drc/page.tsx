'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Phone,
  Search,
  Loader2,
  BookMarked,
  Building2,
  Download,
} from 'lucide-react'

type Booking = {
  id: string
  club_name: string
  attendee_count: number
  contact_name: string | null
  contact_phone: string | null
  notes: string | null
  booked_by_name: string | null
  created_at: string
}

type DRCEvent = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
  totalClubs: number
  totalAttendees: number
  bookings: Booking[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function DRCRegistrationsPage() {
  const [events, setEvents] = useState<DRCEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/admin/drc')
      .then((r) => r.json())
      .then((d) => {
        if (d?.events) {
          setEvents(d.events)
          if (d.events.length > 0) setSelectedId(d.events[0].id)
        } else {
          setError(d?.error || 'Could not load DRC events')
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Network error'))
  }, [])

  const selected = useMemo(
    () => events?.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  )

  const filteredBookings = useMemo(() => {
    if (!selected) return []
    const q = query.trim().toLowerCase()
    if (!q) return selected.bookings
    return selected.bookings.filter(
      (b) =>
        b.club_name.toLowerCase().includes(q) ||
        (b.contact_name || '').toLowerCase().includes(q) ||
        (b.booked_by_name || '').toLowerCase().includes(q),
    )
  }, [selected, query])

  function downloadCsv() {
    if (!selected) return
    const rows = [
      ['Club', 'Attendees', 'Contact', 'Phone', 'Booked by', 'Notes'],
      ...selected.bookings.map((b) => [
        b.club_name,
        String(b.attendee_count),
        b.contact_name ?? '',
        b.contact_phone ?? '',
        b.booked_by_name ?? '',
        b.notes ?? '',
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-drc-registrations.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] mb-2">
          District 3233 · DRC
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
          DRC <span className="text-[#6D28D9]">registrations.</span>
        </h1>
        <p className="mt-2 text-sm text-[#1A1815]/65 max-w-xl">
          Clubs that have booked each District Rotaract Conference event, with attendee counts and contacts.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: DRC events */}
        <div className="lg:col-span-4 bg-white border border-[#1A1815]/8 rounded-2xl shadow-[0_1px_2px_rgba(26,24,21,0.04)] flex flex-col h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1A1815] inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#6D28D9]" />
              DRC Events
            </h2>
            {events && (
              <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#1A1815]/45">
                {events.length} total
              </span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 px-2 pb-3 space-y-1">
            {!events && !error && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 text-[#6D28D9]/60 animate-spin" />
              </div>
            )}
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 m-2">
                {error}
              </div>
            )}
            {events && events.length === 0 && (
              <div className="text-sm text-[#1A1815]/45 py-8 text-center">No DRC events scheduled.</div>
            )}
            {events?.map((e) => {
              const active = selectedId === e.id
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { setSelectedId(e.id); setQuery('') }}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                    active ? 'bg-[#F5F3FF] ring-1 ring-[#6D28D9]/40' : 'hover:bg-[#FAFAF9]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-snug line-clamp-2 ${active ? 'text-[#6D28D9]' : 'text-[#1A1815]'}`}>
                      {e.name}
                    </p>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-[#6D28D9]/10 text-[#6D28D9]">
                      <Building2 className="w-3 h-3" />
                      {e.totalClubs}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#1A1815]/55">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtDate(e.event_date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {e.totalAttendees} attendees
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT: registrations */}
        <div className="lg:col-span-8 bg-white border border-[#1A1815]/8 rounded-2xl shadow-[0_1px_2px_rgba(26,24,21,0.04)] flex flex-col h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-[#1A1815]/8">
            {selected ? (
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-[#1A1815] leading-tight">{selected.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#1A1815]/60">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#6D28D9]" />
                      {fmtDate(selected.event_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6D28D9]" />
                      {fmtTime(selected.start_time)}
                    </span>
                    {selected.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#6D28D9]" />
                        {selected.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[#6D28D9] font-semibold">
                      <BookMarked className="w-3.5 h-3.5" />
                      {selected.totalClubs} clubs · {selected.totalAttendees} attendees
                    </span>
                  </div>
                </div>
                {selected.bookings.length > 0 && (
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
              <h2 className="text-lg font-bold text-[#1A1815]">Pick a DRC event</h2>
            )}
          </div>

          {selected && selected.bookings.length > 0 && (
            <div className="px-6 py-3 border-b border-[#1A1815]/6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by club or contact..."
                  className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl pl-9 pr-3 h-10 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 outline-none transition"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {selected && selected.bookings.length === 0 && (
              <div className="text-center py-16">
                <Building2 className="w-10 h-10 text-[#1A1815]/20 mx-auto mb-3" />
                <p className="text-[#1A1815]/55 text-sm">No clubs have registered for this event yet.</p>
              </div>
            )}
            {selected && selected.bookings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.14em] text-[#1A1815]/50 bg-[#FAFAF9] border-b border-[#1A1815]/8">
                    <tr>
                      <th className="text-left font-semibold px-6 py-3">Club</th>
                      <th className="text-left font-semibold px-6 py-3">Contact</th>
                      <th className="text-left font-semibold px-6 py-3">Booked by</th>
                      <th className="text-right font-semibold px-6 py-3">Attendees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="border-b border-[#1A1815]/6 last:border-0 hover:bg-[#FAFAF9] transition-colors align-top">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center text-xs font-bold shrink-0">
                              {b.club_name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#1A1815] font-medium">{b.club_name}</div>
                              {b.notes && <div className="text-[11px] text-[#1A1815]/45 line-clamp-1">{b.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-[#1A1815]/70">
                          {b.contact_name || '—'}
                          {b.contact_phone && (
                            <a href={`tel:${b.contact_phone}`} className="text-[11px] text-[#1A1815]/55 hover:text-[#6D28D9] inline-flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {b.contact_phone}
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-[#1A1815]/70">{b.booked_by_name || '—'}</td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[#6D28D9] font-extrabold tabular-nums">
                            <Users className="w-3.5 h-3.5" />
                            {b.attendee_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[#1A1815]/45 text-sm">
                          No clubs match &ldquo;{query}&rdquo;.
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
