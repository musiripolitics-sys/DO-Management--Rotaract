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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  MapPin,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
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

/* Landing-page content is managed for events only — DRCs run through
 * the club booking flow and are excluded from this editor. */
const isDrc = (category: string | null) => (category ?? '').trim().toLowerCase() === 'drc'

type AgendaItem = { time_label: string; title: string; description: string }
type SpeakerItem = { name: string; designation: string; photo_url: string }

type ContentForm = {
  description: string
  logo_url: string
  agenda: AgendaItem[]
  speakers: SpeakerItem[]
}

const EMPTY_CONTENT: ContentForm = { description: '', logo_url: '', agenda: [], speakers: [] }

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const fieldCls =
  'bg-white border-[#1A1815]/15 text-[#1A1815] placeholder:text-[#1A1815]/35 focus-visible:ring-[#6D28D9]'

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

  // Landing-page content dialog (events only, never DRC)
  const [contentEvent, setContentEvent] = useState<Event | null>(null)
  const [contentForm, setContentForm] = useState<ContentForm>(EMPTY_CONTENT)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentSaving, setContentSaving] = useState(false)
  const [contentTablesReady, setContentTablesReady] = useState(true)

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

  /* ── Landing-page content ── */
  const openContent = async (event: Event) => {
    setContentEvent(event)
    setContentForm(EMPTY_CONTENT)
    setContentLoading(true)
    try {
      const res = await fetch(`/api/events/${event.id}/content`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load page content')
      setContentTablesReady(data.tablesReady !== false)
      setContentForm({
        description: data.description ?? '',
        logo_url: data.logo_url ?? '',
        agenda: (data.agenda ?? []).map((a: Partial<AgendaItem>) => ({
          time_label: a.time_label ?? '',
          title: a.title ?? '',
          description: a.description ?? '',
        })),
        speakers: (data.speakers ?? []).map((s: Partial<SpeakerItem>) => ({
          name: s.name ?? '',
          designation: s.designation ?? '',
          photo_url: s.photo_url ?? '',
        })),
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load page content')
      setContentEvent(null)
    } finally {
      setContentLoading(false)
    }
  }

  const handleContentSave = async () => {
    if (!contentEvent) return
    setContentSaving(true)
    try {
      const res = await fetch(`/api/events/${contentEvent.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contentForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save page content')
      toast.success(`Landing page updated — ${data.agenda} agenda item${data.agenda === 1 ? '' : 's'}, ${data.speakers} speaker${data.speakers === 1 ? '' : 's'}.`)
      setContentEvent(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save page content')
    } finally {
      setContentSaving(false)
    }
  }

  const setContent = (patch: Partial<ContentForm>) => setContentForm((f) => ({ ...f, ...patch }))

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
                  {!isDrc(event.category) && (
                    <button
                      onClick={() => openContent(event)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#1A1815]/60 hover:text-[#1A468F] hover:bg-[#1A468F]/6 border border-[#1A1815]/10 hover:border-[#1A468F]/30 rounded-xl py-2 transition-all"
                      title="Agenda, speakers, description & logo on the public event page"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Page
                    </button>
                  )}
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

      {/* ── Landing-page content dialog (events only, never DRC) ── */}
      <Dialog open={contentEvent !== null} onOpenChange={(open) => { if (!open) setContentEvent(null) }}>
        <DialogContent className="bg-white border-[#1A1815]/10 text-[#1A1815] sm:max-w-[680px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Landing page — {contentEvent?.name}</span>
              {contentEvent && (
                <a
                  href={`/events/${contentEvent.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6D28D9] hover:underline"
                >
                  View live <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          {contentLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#6D28D9]/60 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6 pt-1">
              {!contentTablesReady && (
                <p className="text-xs text-[#9B6A00] bg-[#F2A410]/12 border border-[#F2A410]/30 rounded-xl px-4 py-3">
                  The agenda/speaker tables don&apos;t exist yet — run{' '}
                  <code className="font-mono">supabase/schema_event_page.sql</code> in the Supabase SQL editor,
                  then reopen this dialog.
                </p>
              )}

              {/* Hero copy */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Description</Label>
                <textarea
                  value={contentForm.description}
                  onChange={(e) => setContent({ description: e.target.value })}
                  rows={3}
                  placeholder="Shown in the hero — what this event is and why members should be there."
                  className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 ${fieldCls}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Logo URL</Label>
                <Input
                  value={contentForm.logo_url}
                  onChange={(e) => setContent({ logo_url: e.target.value })}
                  placeholder="https://… (square image; leave empty for the monogram)"
                  className={fieldCls}
                />
              </div>

              {/* Agenda editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Agenda</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setContent({ agenda: [...contentForm.agenda, { time_label: '', title: '', description: '' }] })
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add item
                  </button>
                </div>
                {contentForm.agenda.length === 0 && (
                  <p className="text-xs text-[#1A1815]/45 border border-dashed border-[#1A1815]/15 rounded-xl px-4 py-3">
                    No agenda yet — the public page shows an &ldquo;agenda being finalised&rdquo; note.
                  </p>
                )}
                {contentForm.agenda.map((item, i) => (
                  <div key={i} className="rounded-xl border border-[#1A1815]/10 p-3 space-y-2 bg-[#FAF7F0]/60">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={item.time_label}
                        onChange={(e) => {
                          const agenda = [...contentForm.agenda]
                          agenda[i] = { ...item, time_label: e.target.value }
                          setContent({ agenda })
                        }}
                        placeholder="09:00 AM"
                        className={`sm:w-28 shrink-0 font-mono text-xs ${fieldCls}`}
                      />
                      <Input
                        value={item.title}
                        onChange={(e) => {
                          const agenda = [...contentForm.agenda]
                          agenda[i] = { ...item, title: e.target.value }
                          setContent({ agenda })
                        }}
                        placeholder="Session title (required)"
                        className={fieldCls}
                      />
                      <div className="flex gap-1 shrink-0 self-end sm:self-auto">
                        <button type="button" onClick={() => setContent({ agenda: moveItem(contentForm.agenda, i, i - 1) })}
                          className="p-2 rounded-lg border border-[#1A1815]/10 text-[#1A1815]/50 hover:text-[#6D28D9] disabled:opacity-30"
                          disabled={i === 0} aria-label="Move up">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setContent({ agenda: moveItem(contentForm.agenda, i, i + 1) })}
                          className="p-2 rounded-lg border border-[#1A1815]/10 text-[#1A1815]/50 hover:text-[#6D28D9] disabled:opacity-30"
                          disabled={i === contentForm.agenda.length - 1} aria-label="Move down">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setContent({ agenda: contentForm.agenda.filter((_, j) => j !== i) })}
                          className="p-2 rounded-lg border border-[#1A1815]/10 text-[#1A1815]/50 hover:text-red-600" aria-label="Remove">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <Input
                      value={item.description}
                      onChange={(e) => {
                        const agenda = [...contentForm.agenda]
                        agenda[i] = { ...item, description: e.target.value }
                        setContent({ agenda })
                      }}
                      placeholder="One-line detail (optional)"
                      className={`text-xs ${fieldCls}`}
                    />
                  </div>
                ))}
              </div>

              {/* Speakers editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-[0.16em] text-[#1A1815]/60">Speakers</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setContent({ speakers: [...contentForm.speakers, { name: '', designation: '', photo_url: '' }] })
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add speaker
                  </button>
                </div>
                {contentForm.speakers.length === 0 && (
                  <p className="text-xs text-[#1A1815]/45 border border-dashed border-[#1A1815]/15 rounded-xl px-4 py-3">
                    No speakers yet — the public page shows a &ldquo;lineup drops soon&rdquo; note.
                  </p>
                )}
                {contentForm.speakers.map((sp, i) => (
                  <div key={i} className="rounded-xl border border-[#1A1815]/10 p-3 space-y-2 bg-[#FAF7F0]/60">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={sp.name}
                        onChange={(e) => {
                          const speakers = [...contentForm.speakers]
                          speakers[i] = { ...sp, name: e.target.value }
                          setContent({ speakers })
                        }}
                        placeholder="Rtr. Full Name (required)"
                        className={fieldCls}
                      />
                      <Input
                        value={sp.designation}
                        onChange={(e) => {
                          const speakers = [...contentForm.speakers]
                          speakers[i] = { ...sp, designation: e.target.value }
                          setContent({ speakers })
                        }}
                        placeholder="Designation"
                        className={fieldCls}
                      />
                      <div className="flex gap-1 shrink-0 self-end sm:self-auto">
                        <button type="button" onClick={() => setContent({ speakers: moveItem(contentForm.speakers, i, i - 1) })}
                          className="p-2 rounded-lg border border-[#1A1815]/10 text-[#1A1815]/50 hover:text-[#6D28D9] disabled:opacity-30"
                          disabled={i === 0} aria-label="Move up">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setContent({ speakers: moveItem(contentForm.speakers, i, i + 1) })}
                          className="p-2 rounded-lg border border-[#1A1815]/10 text-[#1A1815]/50 hover:text-[#6D28D9] disabled:opacity-30"
                          disabled={i === contentForm.speakers.length - 1} aria-label="Move down">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setContent({ speakers: contentForm.speakers.filter((_, j) => j !== i) })}
                          className="p-2 rounded-lg border border-[#1A1815]/10 text-[#1A1815]/50 hover:text-red-600" aria-label="Remove">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <Input
                      value={sp.photo_url}
                      onChange={(e) => {
                        const speakers = [...contentForm.speakers]
                        speakers[i] = { ...sp, photo_url: e.target.value }
                        setContent({ speakers })
                      }}
                      placeholder="Photo URL (optional — initials shown otherwise)"
                      className={`text-xs ${fieldCls}`}
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleContentSave}
                disabled={contentSaving || !contentTablesReady}
                className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white border-0 h-11 shadow-[0_8px_24px_-10px_rgba(109,40,217,0.55)]"
              >
                {contentSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save landing page
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
