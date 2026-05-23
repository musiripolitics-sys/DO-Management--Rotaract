'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Trophy, Clock, LogOut, CheckCircle2, User, Briefcase, MapPin, Phone, Droplet, Shirt, Heart, Calendar, Users, Target, UserPlus, ArrowRight, Medal } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getBadgeForCount, getNextBadge } from '@/lib/badges'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type AttendanceRecord = {
  id: string
  event_id: string
  points_awarded: number
  status: string | null
  check_in_time: string
  events: { name: string | null; event_date: string | null } | { name: string | null; event_date: string | null }[] | null
}

type FeedbackRecord = {
  event_id: string
  rating: number
  comment: string | null
}

type UpcomingEvent = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
  end_date: string | null
  category: string | null
}

type Profile = {
  full_name?: string | null
  email?: string | null
  qr_identity?: string | null
  designation?: string | null
  club_name?: string | null
  phone_number?: string | null
  address?: string | null
  date_of_birth?: string | null
  t_shirt_size?: string | null
  blood_group?: string | null
  willing_to_donate_blood?: string | null
  total_points?: number | null
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [rank, setRank] = useState<number | null>(null)
  const [referrals, setReferrals] = useState<any>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<number | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  // Feedback
  const [feedbacks, setFeedbacks] = useState<Map<string, FeedbackRecord>>(new Map())
  const [rateTarget, setRateTarget] = useState<{ event_id: string; event_name: string } | null>(null)
  const [rateStars, setRateStars] = useState(0)
  const [rateHover, setRateHover] = useState(0)
  const [rateComment, setRateComment] = useState('')
  const [rateSaving, setRateSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0)
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      const res = await fetch('/api/member/me')
      if (res.status === 401) {
        window.location.href = '/'
        return
      }
      const data = await res.json()
      if (!res.ok) {
        window.location.href = '/'
        return
      }
      setProfile(data.profile)
      setAttendance(data.attendance || [])
      setRank(data.rank ?? null)
      setUpcomingEvents(data.upcomingEvents || [])

      // Load feedback records
      fetch('/api/feedback')
        .then((r) => r.json())
        .then((d) => {
          if (d.feedbacks) {
            const map = new Map<string, FeedbackRecord>()
            for (const fb of d.feedbacks) map.set(fb.event_id, fb)
            setFeedbacks(map)
          }
        })
        .catch(() => {})

      const authorized = Boolean(data.profile?.designation?.toLowerCase().includes('president'))

      setIsAuthorized(authorized)

      if (authorized) {
        try {
          const refRes = await fetch('/api/referrals')
          if (refRes.ok) {
            const refData = await refRes.json()
            setReferrals(refData.data)
          }
        } catch (e) {
          console.error(e)
        }
      }

      setLoading(false)
    }
    loadData()
  }, [])

  const handleSignOut = async () => {
    await fetch('/api/member/login', { method: 'DELETE' })
    window.location.href = '/'
  }

  const openRateModal = (record: AttendanceRecord) => {
    const ev = pickEvent(record.events)
    const existing = feedbacks.get(record.event_id)
    setRateTarget({ event_id: record.event_id, event_name: ev?.name ?? 'Event' })
    setRateStars(existing?.rating ?? 0)
    setRateComment(existing?.comment ?? '')
    setRateHover(0)
  }

  const handleRateSubmit = async () => {
    if (!rateTarget || rateStars === 0) return
    setRateSaving(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: rateTarget.event_id, rating: rateStars, comment: rateComment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setFeedbacks((prev) => {
        const next = new Map(prev)
        next.set(rateTarget.event_id, { event_id: rateTarget.event_id, rating: rateStars, comment: rateComment || null })
        return next
      })
      setRateTarget(null)
      toast.success('Thanks for your feedback!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save feedback')
    } finally {
      setRateSaving(false)
    }
  }

  function pickEvent(ev: AttendanceRecord['events']) {
    if (!ev) return null
    return Array.isArray(ev) ? ev[0] ?? null : ev
  }

  function timeAgo(iso: string) {
    if (!now) return 'just now'
    const diff = now - new Date(iso).getTime()
    const mins = Math.max(0, Math.floor(diff / 60000))
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
    const days = Math.floor(hrs / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  function statusLabel(status: string | null) {
    switch (status) {
      case 'on-time': return 'On Time'
      case 'within-15': return 'Within 15'
      case 'within-30': return 'Within 30'
      case 'late': return 'Late'
      default: return status || '—'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white overflow-x-hidden">
      {/* Top Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-lg px-2 py-1.5 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <img src="/vibe-logo.jpg" alt="Rotaract District 3233 VIBE Logo" className="h-8 w-auto" />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white/70 hover:text-white">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8 flex-1 w-full">
        
        {/* Header & Stats */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome back, <span className="text-[#2d9ddb] capitalize">{profile?.full_name}</span>!
            </h1>
            <p className="text-white/60">Ready for the next District 3233 event?</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex flex-col items-center justify-center min-w-[120px]">
              <span className="text-sm text-white/50 mb-1">Total Points</span>
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#fab616] to-[#f58220]">
                {profile?.total_points}
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex flex-col items-center justify-center min-w-[120px]">
              <span className="text-sm text-white/50 mb-1">District Rank</span>
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#2d9ddb] to-[#1a468f]">
                #{rank ?? '—'}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: QR and Profile Info */}
          <div className="col-span-1 space-y-8">
            {/* QR Code Section */}
            <Card className="bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a468f]/10 via-transparent to-[#e0165c]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-white">Your Identity Pass</CardTitle>
                <CardDescription className="text-white/50">Show this at the registration desk</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-8 pt-4">
                <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_-10px_rgba(224,22,92,0.4)]">
                  <QRCodeSVG
                    value={`vibe:qr:${profile?.qr_identity}`}
                    size={200}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"Q"}
                    includeMargin={false}
                  />
                </div>
                <p className="mt-6 text-xs text-white/40 font-mono text-center break-all px-4">
                  {profile?.email as string}
                </p>
              </CardContent>
            </Card>

            {/* Profile Details Card */}
            <Card className="bg-[#0f0f13] border-white/10 border-0 ring-1 ring-white/10 shadow-xl">
              <CardHeader className="pb-4 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-[#2d9ddb]" />
                  Member Profile
                </CardTitle>
                <Link
                  href="/dashboard/edit-profile"
                  className="text-xs font-medium text-[#A78BFA] hover:text-white border border-[#6D28D9]/30 hover:border-[#6D28D9]/60 bg-[#6D28D9]/10 hover:bg-[#6D28D9]/20 rounded-lg px-3 py-1.5 transition-all"
                >
                  Edit
                </Link>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Rotaract Info */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Designation</p>
                    <p className="font-medium text-white/90">{profile?.designation || 'Member'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1"><Trophy className="w-3 h-3" /> Club Name</p>
                    <p className="font-medium text-[#2d9ddb]">{profile?.club_name || 'Not assigned'}</p>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                {/* Contact & Personal */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Contact</p>
                    <p className="text-sm text-white/80">{profile?.phone_number || 'No phone number'}</p>
                    <p className="text-sm text-white/80">{profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</p>
                    <p className="text-sm text-white/80 leading-relaxed">{profile?.address || 'No address provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date of Birth</p>
                    <p className="text-sm text-white/80">{profile?.date_of_birth || 'N/A'}</p>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                {/* Event Preferences & Health */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1"><Shirt className="w-3 h-3" /> T-Shirt</p>
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-white font-mono">{profile?.t_shirt_size || 'N/A'}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1"><Droplet className="w-3 h-3" /> Blood</p>
                    <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400 font-mono">{profile?.blood_group || 'N/A'}</Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1"><Heart className="w-3 h-3" /> Blood Donor</p>
                    <span className={`text-sm font-medium ${profile?.willing_to_donate_blood === 'Yes' ? 'text-green-400' : 'text-white/60'}`}>
                      {profile?.willing_to_donate_blood === 'Yes' ? 'Willing to donate' : 'Not specified/No'}
                    </span>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="col-span-1 md:col-span-2 space-y-8">
            {isAuthorized && referrals && (
              <Card className="bg-gradient-to-br from-[#1a468f]/20 to-[#2d9ddb]/10 border-white/10 border-0 ring-1 ring-white/10 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Users className="w-32 h-32" />
                </div>
                <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Target className="w-5 h-5 text-[#2d9ddb]" />
                      Recruitment Dashboard
                    </CardTitle>
                    <CardDescription className="text-white/60 mt-1">Track your membership growth and badges</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link 
                      href="/dashboard/add-member"
                      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#2d9ddb] text-white hover:bg-[#1a468f] px-3 py-1.5 text-sm font-medium transition-all"
                    >
                      <UserPlus className="w-4 h-4 mr-1.5" /> Add Member
                    </Link>
                    <Link 
                      href="/dashboard/referrals"
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 text-white hover:bg-white/5 px-3 py-1.5 text-sm font-medium transition-all"
                    >
                      Leaderboard <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 relative z-10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
                      <p className="text-xs text-white/50 mb-1">Total Added</p>
                      <p className="text-2xl font-bold text-white">{referrals.totalReferrals}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
                      <p className="text-xs text-white/50 mb-1">This Month</p>
                      <p className="text-2xl font-bold text-green-400">+{referrals.monthlyReferrals}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10 col-span-2 md:col-span-2">
                      <p className="text-xs text-white/50 mb-1">Leaderboard Rank</p>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        <p className="text-2xl font-bold text-white">{referrals.myRank ? `#${referrals.myRank}` : 'Unranked'}</p>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const currentBadge = getBadgeForCount(referrals.totalReferrals)
                    const nextBadge = getNextBadge(referrals.totalReferrals)
                    const progress = nextBadge ? Math.min(100, Math.round((referrals.totalReferrals / nextBadge.threshold) * 100)) : 100

                    return (
                      <div className="bg-[#0f0f13]/80 rounded-xl p-5 ring-1 ring-white/10 mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${currentBadge.color} flex items-center justify-center ring-2 ring-white/20 shadow-lg`}>
                              <Medal className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-white/60">Current Badge</p>
                              <p className="font-bold text-white tracking-wide">{currentBadge.name}</p>
                            </div>
                          </div>
                          {nextBadge && (
                            <div className="text-right">
                              <p className="text-xs text-white/50">Next Badge</p>
                              <p className="text-sm font-medium text-white/80">{nextBadge.name} ({referrals.totalReferrals}/{nextBadge.threshold})</p>
                            </div>
                          )}
                        </div>
                        {nextBadge && (
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mt-2">
                            <motion.div 
                              className={`h-full bg-gradient-to-r ${nextBadge.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {referrals.recentReferrals?.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                      <p className="text-sm font-medium text-white/80 mb-4">Recent Recruits</p>
                      <div className="space-y-3">
                        {referrals.recentReferrals.map((ref: any, i: number) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            key={ref.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#2d9ddb]/20 flex items-center justify-center text-[#2d9ddb] text-xs font-bold">
                                {ref.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{ref.full_name}</p>
                                <p className="text-xs text-white/40">{timeAgo(ref.created_at)}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Upcoming Events ── */}
            <Card className="bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="w-5 h-5 text-[#2d9ddb]" />
                  Upcoming Events
                  {upcomingEvents.length > 0 && (
                    <span className="text-xs font-normal text-white/40 ml-1">
                      · next {upcomingEvents.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-white/50 text-sm py-4">No upcoming events scheduled — check back soon.</p>
                ) : (
                  upcomingEvents.map((ev, i) => {
                    const dt = new Date(ev.start_time)
                    const dateStr = new Date(ev.event_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', weekday: 'short',
                    })
                    const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const daysAway = Math.ceil((dt.getTime() - (now ?? Date.now())) / 86400000)
                    const isToday = daysAway === 0
                    const isTomorrow = daysAway === 1
                    const isSoon = daysAway <= 3 && daysAway >= 0
                    const catColor =
                      ev.category === 'DRC'
                        ? 'bg-[#6D28D9]/20 text-[#A78BFA] border-[#6D28D9]/30'
                        : ev.category === 'Ceremonies'
                        ? 'bg-[#F2A410]/15 text-[#FCD34D] border-[#F2A410]/30'
                        : 'bg-[#1A468F]/20 text-[#7DB9F1] border-[#1A468F]/30'

                    return (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-4 p-3 rounded-xl transition-all border ${
                          isSoon
                            ? 'border-[#2d9ddb]/25 bg-[#2d9ddb]/[0.05] hover:bg-[#2d9ddb]/[0.08]'
                            : 'border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {/* Date column */}
                        <div className="text-center shrink-0 w-12">
                          <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold leading-tight">
                            {dt.toLocaleDateString('en-IN', { month: 'short' })}
                          </p>
                          <p className="text-xl font-extrabold text-white leading-none">
                            {dt.getDate()}
                          </p>
                        </div>

                        {/* Body */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-semibold text-white text-sm truncate">{ev.name}</p>
                            {ev.category && (
                              <span className={`text-[9px] font-bold uppercase tracking-[0.12em] border rounded-full px-1.5 py-0.5 ${catColor}`}>
                                {ev.category}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/50">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {dateStr} · {timeStr}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1 truncate max-w-[18ch]">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{ev.location}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Countdown chip */}
                        <div className="shrink-0 text-right">
                          {isToday ? (
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-1">
                              Today
                            </span>
                          ) : isTomorrow ? (
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A78BFA] bg-[#6D28D9]/15 border border-[#6D28D9]/30 rounded-full px-2 py-1">
                              Tomorrow
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-[0.12em] text-white/40 font-medium">
                              {daysAway}d away
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 border-0 ring-1 ring-white/10 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  Recent Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attendance.length === 0 ? (
                  <p className="text-white/50 text-sm py-4">No check-ins yet. Show your QR pass at the next event to start earning points.</p>
                ) : (
                  attendance.map((record, i) => {
                    const ev = pickEvent(record.events)
                    const isOnTime = record.status === 'on-time' || record.status === 'within-15'
                    const myFeedback = feedbacks.get(record.event_id)
                    return (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={record.id}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`p-2 rounded-lg shrink-0 ${isOnTime ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {isOnTime ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white/90 truncate">{ev?.name || 'Event'}</p>
                            <p className="text-xs text-white/50">{timeAgo(record.check_in_time)}</p>
                            {/* Rating row */}
                            {myFeedback ? (
                              <button
                                onClick={() => openRateModal(record)}
                                className="flex items-center gap-0.5 mt-1"
                                title="Edit your rating"
                              >
                                {[1,2,3,4,5].map((n) => (
                                  <svg key={n} className="w-3 h-3" viewBox="0 0 20 20"
                                    fill={n <= myFeedback.rating ? '#F2A410' : 'rgba(255,255,255,0.15)'}>
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                  </svg>
                                ))}
                              </button>
                            ) : (
                              <button
                                onClick={() => openRateModal(record)}
                                className="mt-1 text-[10px] text-[#A78BFA] hover:text-white border border-[#6D28D9]/25 hover:border-[#6D28D9]/50 rounded px-1.5 py-0.5 transition-colors"
                              >
                                Rate event
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="font-bold text-[#f58220]">+{record.points_awarded}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">{statusLabel(record.status)}</p>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <footer className="w-full text-center py-6 text-white/40 text-xs mt-12 border-t border-white/5">
        Copyrights Rotaract District 3233.
      </footer>

      {/* ── Rating modal ── */}
      {rateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setRateTarget(null) }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="w-full max-w-sm bg-[#0f0f13] border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <h3 className="font-bold text-white text-lg mb-1 truncate">{rateTarget.event_name}</h3>
            <p className="text-xs text-white/40 mb-5">How was this event?</p>

            {/* Star picker */}
            <div className="flex gap-2 justify-center mb-5">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setRateHover(n)}
                  onMouseLeave={() => setRateHover(0)}
                  onClick={() => setRateStars(n)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <svg className="w-9 h-9" viewBox="0 0 20 20"
                    fill={(rateHover || rateStars) >= n ? '#F2A410' : 'rgba(255,255,255,0.15)'}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </button>
              ))}
            </div>

            {/* Optional comment */}
            <textarea
              rows={3}
              placeholder="Share your thoughts (optional)…"
              maxLength={300}
              value={rateComment}
              onChange={(e) => setRateComment(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRateTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/25 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRateSubmit}
                disabled={rateStars === 0 || rateSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {rateSaving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Submit'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
