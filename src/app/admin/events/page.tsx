'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarPlus, Calendar, MapPin, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Event = {
  id: string
  name: string
  event_date: string
  start_time: string
  location: string | null
  category: string | null
  end_date: string | null
}

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newEvent, setNewEvent] = useState({ name: '', date: '', endDate: '', time: '', location: '', category: '' })
  const [isMultiDay, setIsMultiDay] = useState(false)

  const supabase = createClient()

  const fetchEvents = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from('events').select('*').order('start_time', { ascending: true })
    if (error) {
      toast.error('Failed to load events')
    } else {
      setEvents(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => fetchEvents(), 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvent.name || !newEvent.date || !newEvent.time || !newEvent.category) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (isMultiDay && !newEvent.endDate) {
      toast.error('Please provide an end date for multi-day events.')
      return
    }

    setIsSubmitting(true)

    try {
      const startTime = new Date(`${newEvent.date}T${newEvent.time}:00`).toISOString()

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEvent.name,
          location: newEvent.location,
          category: newEvent.category,
          event_date: newEvent.date,
          end_date: isMultiDay ? newEvent.endDate : null,
          start_time: startTime,
        }),
      })

      const resData = await response.json()
      if (!response.ok) throw new Error(resData.error || 'Failed to create event')

      toast.success('Event created successfully!')
      setIsDialogOpen(false)
      setNewEvent({ name: '', date: '', endDate: '', time: '', location: '', category: '' })
      setIsMultiDay(false)
      fetchEvents()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Event Management</h1>
          <p className="text-white/60">Create and manage upcoming District 3233 events.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-white text-black hover:bg-white/90" />}>
            <CalendarPlus className="w-4 h-4 mr-2" />
            Create Event
          </DialogTrigger>
          <DialogContent className="bg-[#0f0f13] border-white/10 text-white sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/70">Event Name</Label>
                <Input 
                  id="name" 
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="bg-black/50 border-white/10 text-white placeholder:text-white/30" 
                  placeholder="e.g., Annual Conference"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Category</Label>
                <Select value={newEvent.category} onValueChange={(val) => setNewEvent({ ...newEvent, category: val || '' })}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white">
                    <SelectValue placeholder="Select event category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f0f13] border-white/10 text-white">
                    <SelectItem value="District Event">District Event</SelectItem>
                    <SelectItem value="Ceremonies">Ceremonies</SelectItem>
                    <SelectItem value="DRC">DRC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Event Duration</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                    <input type="radio" checked={!isMultiDay} onChange={() => setIsMultiDay(false)} className="accent-purple-600" /> Single Day
                  </label>
                  <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                    <input type="radio" checked={isMultiDay} onChange={() => setIsMultiDay(true)} className="accent-purple-600" /> Multiple Days
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-white/70">{isMultiDay ? 'Start Date' : 'Date'}</Label>
                  <Input 
                    id="date" 
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="bg-black/50 border-white/10 text-white [color-scheme:dark]" 
                  />
                </div>
                {isMultiDay ? (
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-white/70">End Date</Label>
                    <Input 
                      id="endDate" 
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="bg-black/50 border-white/10 text-white [color-scheme:dark]" 
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-white/70">Start Time</Label>
                    <Input 
                      id="time" 
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="bg-black/50 border-white/10 text-white [color-scheme:dark]" 
                    />
                  </div>
                )}
              </div>
              {isMultiDay && (
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-white/70">Start Time</Label>
                  <Input 
                    id="time" 
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="bg-black/50 border-white/10 text-white [color-scheme:dark]" 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-white/70">Location</Label>
                <Input 
                  id="location" 
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="bg-black/50 border-white/10 text-white placeholder:text-white/30" 
                  placeholder="e.g., Grand Ballroom"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-4">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Event
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          No events found. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-lg hover:ring-purple-500/50 transition-all cursor-pointer group">
              <CardHeader>
                <CardTitle className="text-xl text-white group-hover:text-purple-300 transition-colors flex items-center justify-between gap-2">
                  <span>{event.name}</span>
                  {event.category && (
                    <span className="text-xs font-normal px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 whitespace-nowrap">
                      {event.category}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="flex flex-col gap-2 pt-2 text-white/50">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {event.end_date ? `${event.event_date} to ${event.end_date}` : event.event_date}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {event.location || 'No location'}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
