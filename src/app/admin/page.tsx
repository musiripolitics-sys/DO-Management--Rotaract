'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CalendarCheck, Activity, Award, Loader2 } from 'lucide-react'

type Profile = { full_name: string | null; email: string | null }
type EventLite = { name: string | null }

type Scan = {
  id: string
  status: string | null
  check_in_time: string
  points_awarded: number
  profiles: Profile | Profile[] | null
  events: EventLite | EventLite[] | null
}

type UpcomingEvent = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
}

type OverviewData = {
  stats: {
    totalMembers: number
    totalEvents: number
    activeEvents: number
    totalScans: number
    pointsAwarded: number
  }
  recentScans: Scan[]
  upcomingEvents: UpcomingEvent[]
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  'on-time': { text: 'On Time', cls: 'text-green-400 bg-green-400/10' },
  'within-15': { text: 'Within 15', cls: 'text-emerald-300 bg-emerald-300/10' },
  'within-30': { text: 'Within 30', cls: 'text-yellow-300 bg-yellow-300/10' },
  late: { text: 'Late', cls: 'text-orange-400 bg-orange-400/10' },
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => r.json())
      .then((d) => {
        if (d?.stats) setData(d)
      })
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { title: 'Total Members', value: formatNumber(data?.stats.totalMembers ?? 0), icon: Users, color: 'text-blue-400' },
    { title: 'Active Events', value: formatNumber(data?.stats.activeEvents ?? 0), icon: CalendarCheck, color: 'text-green-400' },
    { title: 'Total Scans', value: formatNumber(data?.stats.totalScans ?? 0), icon: Activity, color: 'text-purple-400' },
    { title: 'Points Awarded', value: formatNumber(data?.stats.pointsAwarded ?? 0), icon: Award, color: 'text-yellow-400' },
  ]

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Overview</h1>
        <p className="text-white/60">Monitor District 3233 engagement and metrics.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <Card key={i} className="bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">{stat.title}</CardTitle>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-lg">
              <CardHeader>
                <CardTitle className="text-white">Recent Scans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {(!data || data.recentScans.length === 0) ? (
                  <div className="text-white/50 text-sm py-4">
                    No scans yet. Real-time scan logs will appear here once members check in.
                  </div>
                ) : (
                  data.recentScans.map((scan) => {
                    const profile = pickOne<Profile>(scan.profiles)
                    const event = pickOne<EventLite>(scan.events)
                    const meta = statusLabel[scan.status ?? ''] ?? { text: scan.status ?? '—', cls: 'text-white/50 bg-white/10' }
                    return (
                      <div key={scan.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-white/90">
                            {profile?.full_name || profile?.email || 'Unknown member'}
                          </p>
                          <p className="text-xs text-white/40">
                            {event?.name || 'Event'} • {timeAgo(scan.check_in_time)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#f58220]">+{scan.points_awarded}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${meta.cls}`}>{meta.text}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-lg">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {(!data || data.upcomingEvents.length === 0) ? (
                  <div className="text-white/50 text-sm py-4">
                    No upcoming events. Create one in the Events tab.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.upcomingEvents.map((event) => (
                      <div key={event.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <h4 className="font-semibold text-indigo-300">{event.name}</h4>
                        <p className="text-sm text-white/50 mt-1">
                          {event.event_date}
                          {' • '}
                          {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {event.location ? ` • ${event.location}` : ''}
                        </p>
                        <div className="mt-3 text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Registration Open
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
