'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Calendar,
  MapPin,
  Building2,
  Loader2,
  Plus,
  ArrowRight,
  CheckCircle2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type Meeting = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
  registeredClubs: number
  mom: { id: string; meeting_number: string | null; status: 'draft' | 'published' } | null
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MomListPage() {
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Create dialog
  const [createFor, setCreateFor] = useState<Meeting | null>(null)
  const [meetingNumber, setMeetingNumber] = useState('')
  const [venue, setVenue] = useState('')
  const [chairperson, setChairperson] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/admin/mom')
      .then((r) => r.json())
      .then((d) => {
        if (d?.meetings) setMeetings(d.meetings)
        else setError(d?.error || 'Could not load meetings')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Network error'))
  }
  useEffect(() => { load() }, [])

  const openCreate = (m: Meeting) => {
    setCreateFor(m)
    setMeetingNumber('')
    setVenue(m.location ?? '')
    setChairperson('')
  }

  const handleCreate = async () => {
    if (!createFor) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/mom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: createFor.id, meeting_number: meetingNumber, venue, chairperson }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create MoM')
      router.push(`/admin/mom/${data.mom.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create MoM')
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] mb-2">
          District 3233 · Minutes of Meeting
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
          DRC <span className="text-[#6D28D9]">minutes.</span>
        </h1>
        <p className="mt-2 text-sm text-[#1A1815]/65 max-w-xl">
          Build and publish a professional Minutes-of-Meeting for each DRC meeting.
        </p>
      </header>

      {!meetings && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4">{error}</div>
      )}
      {meetings && meetings.length === 0 && (
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-16 text-center">
          <FileText className="w-9 h-9 text-[#1A1815]/20 mx-auto mb-3" />
          <p className="text-sm text-[#1A1815]/55">No DRC meetings yet. Create a DRC event first.</p>
        </div>
      )}

      {meetings && meetings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {meetings.map((m) => {
            const status = m.mom?.status
            return (
              <div
                key={m.id}
                className="bg-white border border-[#1A1815]/8 rounded-2xl p-5 shadow-[0_1px_2px_rgba(26,24,21,0.04)] hover:shadow-[0_12px_32px_-18px_rgba(26,24,21,0.18)] transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-bold text-[#1A1815] leading-snug">{m.name}</h3>
                  {status ? (
                    <span
                      className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full ${
                        status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-[#F2A410]/15 text-[#9B6A00]'
                      }`}
                    >
                      {status}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full bg-[#1A1815]/6 text-[#1A1815]/50">
                      No MoM
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-[#1A1815]/60 mb-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#6D28D9]/60 shrink-0" />
                    {fmtDate(m.event_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#6D28D9]/60 shrink-0" />
                    <span className="truncate">{m.location || 'No venue'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#6D28D9]/60 shrink-0" />
                    {m.registeredClubs} club{m.registeredClubs === 1 ? '' : 's'} registered
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-[#1A1815]/6">
                  {m.mom ? (
                    <button
                      onClick={() => router.push(`/admin/mom/${m.mom!.id}`)}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[#6D28D9] hover:text-white hover:bg-[#6D28D9] border border-[#6D28D9]/30 rounded-xl py-2 transition-all"
                    >
                      {status === 'published' ? <><CheckCircle2 className="w-4 h-4" /> View / Edit</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  ) : (
                    <button
                      onClick={() => openCreate(m)}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl py-2 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Create MOM
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create dialog */}
      {createFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget && !saving) setCreateFor(null) }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-[#1A1815]">Create MOM</h3>
              <button onClick={() => !saving && setCreateFor(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/50 hover:bg-[#1A1815]/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#1A1815]/55 mb-5">{createFor.name} · {fmtDate(createFor.event_date)}</p>

            <div className="space-y-3">
              <Field label="Meeting Number">
                <input value={meetingNumber} onChange={(e) => setMeetingNumber(e.target.value)} placeholder="e.g. 01"
                  className="w-full bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 focus:border-[#6D28D9]/40" />
              </Field>
              <Field label="Venue">
                <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Meeting venue"
                  className="w-full bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 focus:border-[#6D28D9]/40" />
              </Field>
              <Field label="Chairperson">
                <input value={chairperson} onChange={(e) => setChairperson(e.target.value)} placeholder="e.g. DRR Rtr. …"
                  className="w-full bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 focus:border-[#6D28D9]/40" />
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setCreateFor(null)} disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-[#1A1815]/12 text-[#1A1815]/65 hover:bg-[#1A1815]/5 text-sm">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create &amp; Build</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/45 block mb-1">{label}</label>
      {children}
    </div>
  )
}
