'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarPlus, Calendar, MapPin, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function EventsManagement() {
  const [events, setEvents] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newEvent, setNewEvent] = useState({ name: '', date: '', time: '', location: '' })

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
    fetchEvents()
  }, [])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvent.name || !newEvent.date || !newEvent.time) {
      toast.error('Please fill in all required fields.')
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
          event_date: newEvent.date,
          start_time: startTime,
        }),
      })

      const resData = await response.json()
      if (!response.ok) throw new Error(resData.error || 'Failed to create event')

      toast.success('Event created successfully!')
      setIsDialogOpen(false)
      setNewEvent({ name: '', date: '', time: '', location: '' })
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
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-white/90">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-white/70">Date</Label>
                  <Input 
                    id="date" 
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="bg-black/50 border-white/10 text-white [color-scheme:dark]" 
                  />
                </div>
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
              </div>
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
                <CardTitle className="text-xl text-white group-hover:text-purple-300 transition-colors">{event.name}</CardTitle>
                <CardDescription className="flex flex-col gap-2 pt-2 text-white/50">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {event.event_date}
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
