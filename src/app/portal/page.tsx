'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  MapPin,
  Users,
  Phone,
  User,
  FileText,
  CheckCircle2,
  Clock,
  UserPlus,
  ChevronRight,
  LogOut,
  Crown,
  Pencil,
  Trash2,
  TriangleAlert,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'

type Profile = {
  id: string
  full_name: string
  email: string
  club_name: string
  phone_number: string
  designation: string
}

type DRCEvent = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
  booked: boolean
  booking: {
    id: string
    club_name: string
    attendee_count: number
    contact_name: string | null
    contact_phone: string | null
    notes: string | null
    created_at: string
  } | null
}

type BookingForm = {
  club_name: string
  attendee_count: string
  contact_name: string
  contact_phone: string
  notes: string
}

export default function PresidentPortal() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<DRCEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingEvent, setBookingEvent] = useState<DRCEvent | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<DRCEvent | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [form, setForm] = useState<BookingForm>({
    club_name: '',
    attendee_count: '',
    contact_name: '',
    contact_phone: '',
    notes: '',
  })

  const isEditMode = Boolean(bookingEvent?.booked && bookingEvent.booking)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/drc')
      if (!res.ok) {
        window.location.href = '/'
        return
      }
      const data = await res.json()
      setProfile(data.profile)
      setEvents(data.events ?? [])
      setForm((f) => ({
        ...f,
        club_name: data.profile?.club_name ?? '',
        contact_name: data.profile?.full_name ?? '',
        contact_phone: data.profile?.phone_number ?? '',
      }))
      setLoading(false)
    }
    load()
  }, [])

  function openBooking(event: DRCEvent) {
    // If already booked, prefill with existing values; otherwise prefill with profile defaults
    if (event.booked && event.booking) {
      setForm({
        club_name: event.booking.club_name,
        attendee_count: String(event.booking.attendee_count),
        contact_name: event.booking.contact_name ?? profile?.full_name ?? '',
        contact_phone: event.booking.contact_phone ?? profile?.phone_number ?? '',
        notes: event.booking.notes ?? '',
      })
    } else {
      setForm({
        club_name: profile?.club_name ?? '',
        attendee_count: '',
        contact_name: profile?.full_name ?? '',
        contact_phone: profile?.phone_number ?? '',
        notes: '',
      })
    }
    setBookingEvent(event)
  }

  async function refreshEvents() {
    const res = await fetch('/api/drc')
    const data = await res.json()
    setEvents(data.events ?? [])
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!bookingEvent) return
    setBookingLoading(true)
    try {
      // PATCH if editing existing booking, POST if creating new
      const isEditing = bookingEvent.booked && bookingEvent.booking
      const url = isEditing
        ? `/api/drc/${bookingEvent.booking!.id}`
        : '/api/drc'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing ? {} : { event_id: bookingEvent.id }),
          club_name: form.club_name,
          attendee_count: Number(form.attendee_count),
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          notes: form.notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed')
      toast.success(isEditing ? 'Booking updated!' : 'Successfully booked!')
      setBookingEvent(null)
      await refreshEvents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setBookingLoading(false)
    }
  }

  async function handleCancelBooking() {
    if (!cancelTarget?.booking) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/drc/${cancelTarget.booking.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cancel failed')
      toast.success(`Booking for "${cancelTarget.name}" cancelled.`)
      setCancelTarget(null)
      setBookingEvent(null)
      await refreshEvents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setCancelling(false)
    }
  }

  function handleSignOut() {
    document.cookie = 'vibe_member=; path=/; max-age=0'
    window.location.href = '/'
  }

  const formatDate = (date: string, time: string) => {
    const d = new Date(time)
    return `${new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6D28D9] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Image
            src="/vibe-logo.jpg"
            alt="VIBE"
            width={2480}
            height={610}
            className="h-8 w-auto"
          />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-[#6D28D9]/20 text-[#A78BFA] border border-[#6D28D9]/30 px-2.5 py-1 rounded-full">
            <Crown className="w-3 h-3" />
            President Portal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-white/45 truncate max-w-[180px]">
            {profile?.full_name}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-full px-3 py-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* ── Welcome ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-semibold mb-1">
            Welcome back
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {profile?.full_name}
          </h1>
          <p className="text-white/45 mt-1 text-sm">
            {profile?.club_name}
            {profile?.designation ? ` · ${profile.designation}` : ''}
          </p>
        </motion.div>

        {/* ── DRC Events ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-[#2D9DDB]/15 flex items-center justify-center ring-1 ring-[#2D9DDB]/25 shrink-0">
              <Calendar className="w-4 h-4 text-[#2D9DDB]" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-none">DRC Events</h2>
              <p className="text-xs text-white/40 mt-0.5">
                Register your club for District Rotaract Conference events
              </p>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-12 text-center">
              <Calendar className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/40 text-sm">
                No DRC events scheduled yet — check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.07 }}
                  className={`flex items-center gap-4 rounded-2xl border p-5 transition-all ${
                    ev.booked
                      ? 'border-[#2D9DDB]/30 bg-[#2D9DDB]/5'
                      : 'border-white/8 bg-white/[0.03] hover:border-white/15'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-white">{ev.name}</span>
                      {ev.booked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] bg-[#2D9DDB]/20 text-[#2D9DDB] px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Booked
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(ev.event_date, ev.start_time)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                    {ev.booked && ev.booking && (
                      <p className="text-xs text-white/30 mt-1.5">
                        {ev.booking.attendee_count}{' '}
                        {ev.booking.attendee_count === 1 ? 'attendee' : 'attendees'} ·{' '}
                        {ev.booking.club_name}
                      </p>
                    )}
                  </div>
                  {ev.booked ? (
                    <button
                      onClick={() => openBooking(ev)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2D9DDB] hover:text-white border border-[#2D9DDB]/30 hover:border-[#2D9DDB]/70 hover:bg-[#2D9DDB]/15 px-3 py-2 rounded-xl transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Manage
                    </button>
                  ) : (
                    <button
                      onClick={() => openBooking(ev)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-xl transition-colors"
                    >
                      Book
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Add Member ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link href="/dashboard/add-member">
            <div className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-[#6D28D9]/40 hover:bg-[#6D28D9]/5 p-6 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-[#6D28D9]/15 flex items-center justify-center ring-1 ring-[#6D28D9]/25 shrink-0">
                <UserPlus className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg leading-none">Add New Member</h2>
                <p className="text-sm text-white/40 mt-1">
                  Recruit a new member to the district and link them to your club.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/25 group-hover:text-[#A78BFA] transition-colors shrink-0" />
            </div>
          </Link>
        </motion.section>
      </main>

      {/* ── Booking Modal ── */}
      <Dialog
        open={!!bookingEvent}
        onOpenChange={(open) => {
          if (!open) setBookingEvent(null)
        }}
      >
        <DialogContent className="bg-[#0f0f13] border-white/10 text-white sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {isEditMode ? <><Pencil className="w-4 h-4 text-[#2D9DDB]" /> Manage Booking</> : 'Book Event'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {bookingEvent?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBook} className="space-y-4 pt-1">
            {/* Club Name */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-[0.15em] text-white/50 font-semibold">
                Club Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  required
                  placeholder="Rotaract Club of …"
                  value={form.club_name}
                  onChange={(e) => setForm({ ...form, club_name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 transition-all"
                />
              </div>
            </div>

            {/* Attendee Count */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-[0.15em] text-white/50 font-semibold">
                Number of Attendees <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 10"
                  value={form.attendee_count}
                  onChange={(e) => setForm({ ...form, attendee_count: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 transition-all"
                />
              </div>
            </div>

            {/* Contact Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.15em] text-white/50 font-semibold">
                  Contact Name
                </label>
                <input
                  type="text"
                  placeholder={profile?.full_name || 'Name'}
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.15em] text-white/50 font-semibold">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="tel"
                    placeholder="+91 …"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-[0.15em] text-white/50 font-semibold">
                Notes (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                <textarea
                  rows={3}
                  placeholder="Any special requirements…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 transition-all resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={bookingLoading}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {bookingLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isEditMode ? (
                <>
                  Save Changes
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  Confirm Booking
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Cancel booking button (edit mode only) */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => setCancelTarget(bookingEvent)}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 py-2.5 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Cancel this booking
              </button>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Cancel confirmation dialog ── */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null) }}>
        <DialogContent className="bg-[#0f0f13] border-white/10 text-white sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 text-red-400">
              <TriangleAlert className="w-5 h-5" />
              Cancel Booking?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-white/75">
              Cancel your club's booking for{' '}
              <span className="font-semibold text-white">"{cancelTarget?.name}"</span>?
            </p>
            <p className="text-xs text-white/45 bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
              {cancelTarget?.booking?.attendee_count} attendees from {cancelTarget?.booking?.club_name} will be removed. You can rebook later if seats are still available.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
              className="flex-1 py-2.5 rounded-xl border border-white/12 text-white/65 hover:text-white hover:border-white/25 text-sm transition-colors"
            >
              Keep booking
            </button>
            <button
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5" /> Cancel</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
