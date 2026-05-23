'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CalendarPlus,
  Calendar,
  MapPin,
  Clock,
  Loader2,
  Pencil,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'

/* ── Types ───────────────────────────────────────────────────── */

type Event = {
  id: string
  name: string
  event_date: string
  start_time: string
  location: string | null
  category: string | null
  end_date: string | null
}

type EventForm = {
  name: string
  date: string
  endDate: string
  time: string
  location: string
  category: string
}

const EMPTY_FORM: EventForm = {
  name: '',
  date: '',
  endDate: '',
  time: '',
  location: '',
  category: '',
}

const CATEGORIES = ['District Event', 'Ceremonies', 'DRC']

const CATEGORY_CHIP: Record<string, string> = {
  DRC: 'bg-[#6D28D9]/10 text-[#6D28D9]',
  'District Event': 'bg-[#1A468F]/10 text-[#1A468F]',
  Ceremonies: 'bg-[#F2A410]/15 text-[#9B6A00]',
}

/* ── Shared event form (used in both Create and Edit dialogs) ─── */

function EventFormFields({
  form,
  setForm,
  isMultiDay,
  setIsMultiDay,
}: {
  form: EventForm
  setForm: (f: EventForm) => void
  isMultiDay: boolean
  setIsMultiDay: (v: boolean) => void
}) {
  const set = (k: keyof EventForm, v: string) => setForm({ ...form, [k]: v })
  return (
    <div className="space-y-4 pt-2">
      {/* Name */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Event Name</Label>
        <Input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="bg-white border-[#1A1815]/15 text-[#1A1815] placeholder:text-[#1A1815]/35 focus-visible:ring-[#6D28D9]"
          placeholder="e.g., Annual Conference"
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Category</Label>
        <Select value={form.category} onValueChange={(v) => set('category', v || '')}>
          <SelectTrigger className="bg-white border-[#1A1815]/15 text-[#1A1815]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#1A1815]/10 text-[#1A1815]">
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Duration toggle */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Duration</Label>
        <div className="flex gap-5">
          {(['Single day', 'Multiple days'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-[#1A1815]/85 cursor-pointer">
              <input
                type="radio"
                checked={isMultiDay === (opt === 'Multiple days')}
                onChange={() => setIsMultiDay(opt === 'Multiple days')}
                className="accent-[#6D28D9]"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Date row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">
            {isMultiDay ? 'Start date' : 'Date'}
          </Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="bg-white border-[#1A1815]/15 text-[#1A1815]"
            required
          />
        </div>
        {isMultiDay ? (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">End date</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              className="bg-white border-[#1A1815]/15 text-[#1A1815]"
              required
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Start time</Label>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              className="bg-white border-[#1A1815]/15 text-[#1A1815]"
              required
            />
          </div>
        )}
      </div>

      {/* Time (multi-day only) */}
      {isMultiDay && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Start time</Label>
          <Input
            type="time"
            value={form.time}
            onChange={(e) => set('time', e.target.value)}
            className="bg-white border-[#1A1815]/15 text-[#1A1815]"
            required
          />
        </div>
      )}

      {/* Location */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Location</Label>
        <Input
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
          className="bg-white border-[#1A1815]/15 text-[#1A1815] placeholder:text-[#1A1815]/35 focus-visible:ring-[#6D28D9]"
          placeholder="e.g., Grand Ballroom"
        />
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────── */

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<EventForm>(EMPTY_FORM)
  const [createMultiDay, setCreateMultiDay] = useState(false)

  // Edit dialog
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [editForm, setEditForm] = useState<EventForm>(EMPTY_FORM)
  const [editMultiDay, setEditMultiDay] = useState(false)

  // Delete dialog
  const [deleteEvent, setDeleteEvent] = useState<Event | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /* ── Load events ── */
  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEvents(data.events ?? [])
    } catch {
      toast.error('Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [])

  /* ── Helpers ── */
  function formFromEvent(e: Event): EventForm {
    const dt = new Date(e.start_time)
    const hh = String(dt.getHours()).padStart(2, '0')
    const mm = String(dt.getMinutes()).padStart(2, '0')
    return {
      name: e.name,
      date: e.event_date,
      endDate: e.end_date ?? '',
      time: `${hh}:${mm}`,
      location: e.location ?? '',
      category: e.category ?? '',
    }
  }

  function buildPayload(form: EventForm, multiDay: boolean) {
    return {
      name: form.name.trim(),
      location: form.location.trim() || null,
      category: form.category,
      event_date: form.date,
      end_date: multiDay ? form.endDate : null,
      start_time: new Date(`${form.date}T${form.time}:00`).toISOString(),
    }
  }

  function validate(form: EventForm, multiDay: boolean) {
    if (!form.name || !form.date || !form.time || !form.category) {
      toast.error('Please fill in all required fields.')
      return false
    }
    if (multiDay && !form.endDate) {
      toast.error('Please provide an end date for multi-day events.')
      return false
    }
    return true
  }

  /* ── Create ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(createForm, createMultiDay)) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(createForm, createMultiDay)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create event')
      toast.success('Event created!')
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      setCreateMultiDay(false)
      fetchEvents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Edit ── */
  const openEdit = (event: Event) => {
    setEditEvent(event)
    setEditForm(formFromEvent(event))
    setEditMultiDay(Boolean(event.end_date))
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEvent || !validate(editForm, editMultiDay)) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${editEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(editForm, editMultiDay)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update event')
      toast.success('Event updated!')
      setEditEvent(null)
      fetchEvents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update event')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteEvent) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/events/${deleteEvent.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete event')
      const removed = data.attendanceRemoved ?? 0
      toast.success(
        removed > 0
          ? `"${deleteEvent.name}" deleted — ${removed} attendance record${removed === 1 ? '' : 's'} removed.`
          : `"${deleteEvent.name}" deleted.`
      )
      setDeleteEvent(null)
      fetchEvents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setIsDeleting(false)
    }
  }

  /* ── Render ── */
  return (
    <div className="p-6 lg:p-10 space-y-8">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] mb-2">
            District 3233 · Events
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
            Event <span className="text-[#6D28D9]">management.</span>
          </h1>
          <p className="mt-2 text-sm text-[#1A1815]/65 max-w-xl">
            Create and manage District 3233 events. Members earn points by scanning in.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white border-0 shadow-[0_8px_24px_-10px_rgba(109,40,217,0.55)]"
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </header>

      {/* Event grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-16 text-center">
          <Calendar className="w-9 h-9 text-[#1A1815]/20 mx-auto mb-3" />
          <p className="text-sm text-[#1A1815]/55">No events yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => {
            const chipCls = CATEGORY_CHIP[event.category ?? ''] ?? 'bg-[#1A1815]/8 text-[#1A1815]/60'
            const timeStr = new Date(event.start_time).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit',
            })
            return (
              <div
                key={event.id}
                className="group bg-white border border-[#1A1815]/8 rounded-2xl p-5 hover:border-[#6D28D9]/40 hover:shadow-[0_18px_40px_-22px_rgba(109,40,217,0.3)] transition-all"
              >
                {/* Top row: name + category */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="text-base font-bold text-[#1A1815] leading-snug group-hover:text-[#6D28D9] transition-colors flex-1 min-w-0">
                    {event.name}
                  </h3>
                  {event.category && (
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full ${chipCls}`}>
                      {event.category}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="space-y-1.5 text-sm text-[#1A1815]/60 mb-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#6D28D9]/60 shrink-0" />
                    {event.end_date ? `${event.event_date} → ${event.end_date}` : event.event_date}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#6D28D9]/60 shrink-0" />
                    {timeStr}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#6D28D9]/60 shrink-0" />
                    <span className="truncate">{event.location || 'No location'}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-3 border-t border-[#1A1815]/6">
                  <button
                    onClick={() => openEdit(event)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#1A1815]/60 hover:text-[#6D28D9] hover:bg-[#6D28D9]/6 border border-[#1A1815]/10 hover:border-[#6D28D9]/30 rounded-xl py-2 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteEvent(event)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#1A1815]/60 hover:text-red-600 hover:bg-red-50 border border-[#1A1815]/10 hover:border-red-200 rounded-xl py-2 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border-[#1A1815]/10 text-[#1A1815] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Create New Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <EventFormFields
              form={createForm}
              setForm={setCreateForm}
              isMultiDay={createMultiDay}
              setIsMultiDay={setCreateMultiDay}
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white border-0 mt-6 h-11 shadow-[0_8px_24px_-10px_rgba(109,40,217,0.55)]"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save event
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editEvent !== null} onOpenChange={(open) => { if (!open) setEditEvent(null) }}>
        <DialogContent className="bg-white border-[#1A1815]/10 text-[#1A1815] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <EventFormFields
              form={editForm}
              setForm={setEditForm}
              isMultiDay={editMultiDay}
              setIsMultiDay={setEditMultiDay}
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white border-0 mt-6 h-11 shadow-[0_8px_24px_-10px_rgba(109,40,217,0.55)]"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={deleteEvent !== null} onOpenChange={(open) => { if (!open) setDeleteEvent(null) }}>
        <DialogContent className="bg-white border-[#1A1815]/10 text-[#1A1815] sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 text-red-600">
              <TriangleAlert className="w-5 h-5" />
              Delete Event
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-[#1A1815]/75">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-[#1A1815]">"{deleteEvent?.name}"</span>?
            </p>
            <p className="text-xs text-[#1A1815]/50 bg-[#1A1815]/4 rounded-xl px-4 py-3">
              ⚠️ All attendance records for this event will be permanently removed. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-[#1A1815]/15 text-[#1A1815]/70 hover:bg-[#1A1815]/5"
              onClick={() => setDeleteEvent(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
