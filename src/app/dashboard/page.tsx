'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Trophy, Clock, LogOut, CheckCircle2, User, Briefcase, MapPin, Phone, Droplet, Shirt, Heart, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type AttendanceRecord = {
  id: string
  points_awarded: number
  status: string | null
  check_in_time: string
  events: { name: string | null; event_date: string | null } | { name: string | null; event_date: string | null }[] | null
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

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
      setLoading(false)
    }
    loadData()
  }, [])

  const handleSignOut = async () => {
    await fetch('/api/member/login', { method: 'DELETE' })
    window.location.href = '/'
  }

  function pickEvent(ev: AttendanceRecord['events']) {
    if (!ev) return null
    return Array.isArray(ev) ? ev[0] ?? null : ev
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
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
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      {/* Top Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex font-extrabold text-lg tracking-tight bg-white rounded-lg px-2 py-0.5 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <span className="text-[#1a468f]">V</span>
            <span className="text-[#e0165c]">I</span>
            <span className="text-[#2d9ddb]">B</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fab616] to-[#f58220]">E</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white/70 hover:text-white">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8">
        
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
                    value={`vibe:email:${profile?.email}`}
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
              <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-[#2d9ddb]" />
                  Member Profile
                </CardTitle>
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
                    return (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={record.id}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${isOnTime ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {isOnTime ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-white/90">{ev?.name || 'Event'}</p>
                            <p className="text-xs text-white/50">{timeAgo(record.check_in_time)}</p>
                          </div>
                        </div>
                        <div className="text-right">
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
    </div>
  )
}
