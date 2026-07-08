'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import {
  Trophy,
  Award,
  LogOut,
  Shield,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Briefcase,
  Building2,
} from 'lucide-react'
import Image from 'next/image'

type AttendanceRecord = {
  id: string
  event_id: string
  points_awarded: number
  status: string | null
  check_in_time: string
  events:
    | { name: string | null; event_date: string | null }
    | { name: string | null; event_date: string | null }[]
    | null
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  designation: string | null
  club_name: string | null
  total_points: number | null
}

export default function DOPortal() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/member/me')
      if (!res.ok) {
        window.location.href = '/'
        return
      }
      const data = await res.json()

      // DO prefix wins: "DO - Home Club President" is a DO, not a president
      const designation: string = data.profile?.designation ?? ''
      const isDO = /^DO\s*-/i.test(designation)
      const isPresident = !isDO && designation.toLowerCase().includes('president')

      if (isPresident) {
        window.location.href = '/portal'
        return
      }
      if (!isDO) {
        window.location.href = '/dashboard'
        return
      }

      setProfile(data.profile)
      setAttendance(data.attendance ?? [])
      setRank(data.rank ?? null)
      setLoading(false)
    }
    load()
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
    if (!now) return 'just now'
    const diff = now - new Date(iso).getTime()
    const mins = Math.max(0, Math.floor(diff / 60000))
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  function statusLabel(status: string | null) {
    switch (status) {
      case 'on-time':
        return 'On Time'
      case 'within-15':
        return 'Within 15'
      case 'within-30':
        return 'Within 30'
      case 'late':
        return 'Late'
      default:
        return status || '—'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2D9DDB] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Strip the "DO - " prefix for prettier display
  const roleTitle = (profile?.designation ?? '').replace(/^DO\s*-\s*/i, '')
  const eventsAttended = attendance.length

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
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-[#2D9DDB]/20 text-[#7DB9F1] border border-[#2D9DDB]/30 px-2.5 py-1 rounded-full">
            <Shield className="w-3 h-3" />
            DO Portal
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-full px-3 py-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
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
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7DB9F1] bg-[#2D9DDB]/10 border border-[#2D9DDB]/30 rounded-lg px-2.5 py-1">
              <Briefcase className="w-3 h-3" />
              {roleTitle || 'District Official'}
            </span>
            {profile?.club_name && (
              <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                <Building2 className="w-3 h-3" />
                {profile.club_name}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Stats cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <StatCard
            icon={Award}
            label="Total Points"
            value={profile?.total_points ?? 0}
            color="#F2A410"
            bg="rgba(242,164,16,0.1)"
          />
          <StatCard
            icon={Trophy}
            label="District Rank"
            value={rank ? `#${rank}` : '—'}
            color="#2D9DDB"
            bg="rgba(45,157,219,0.1)"
          />
          <StatCard
            icon={CalendarCheck}
            label="Events Attended"
            value={eventsAttended}
            color="#10B981"
            bg="rgba(16,185,129,0.1)"
          />
        </motion.div>

        {/* ── Two-column: QR + Recent check-ins ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* QR Pass */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="md:col-span-2 bg-white/5 border border-white/10 ring-1 ring-white/10 rounded-2xl p-6 flex flex-col items-center text-center"
          >
            <h2 className="font-bold text-white text-base mb-1">Your Identity Pass</h2>
            <p className="text-xs text-white/45 mb-4">Show this at event check-ins</p>
            {profile?.email ? (
              <div className="bg-white p-3 rounded-2xl shadow-[0_0_30px_-10px_rgba(45,157,219,0.4)]">
                <QRCodeSVG
                  value={`vibe:email:${profile.email}`}
                  size={170}
                  bgColor={'#ffffff'}
                  fgColor={'#000000'}
                  level={'Q'}
                  includeMargin={false}
                />
              </div>
            ) : (
              <div className="w-[170px] h-[170px] flex items-center justify-center text-center text-xs text-red-400 px-4 border border-red-400/30 rounded-2xl">
                Email missing — contact admin.
              </div>
            )}
            <p className="mt-4 text-[11px] text-white/35 font-mono break-all px-2">
              {profile?.email}
            </p>
          </motion.div>

          {/* Recent check-ins */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-3 bg-white/5 border border-white/10 ring-1 ring-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2 className="font-bold text-white text-base">Recent check-ins</h2>
            </div>
            {attendance.length === 0 ? (
              <p className="text-white/45 text-sm py-4 text-center">
                No check-ins yet. Show your QR at the next event to start earning points.
              </p>
            ) : (
              <ul className="space-y-1">
                {attendance.slice(0, 8).map((record, i) => {
                  const ev = pickEvent(record.events)
                  const isOnTime =
                    record.status === 'on-time' || record.status === 'within-15'
                  return (
                    <motion.li
                      key={record.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            isOnTime
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-orange-500/15 text-orange-400'
                          }`}
                        >
                          {isOnTime ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-white/90 truncate">
                            {ev?.name || 'Event'}
                          </p>
                          <p className="text-[11px] text-white/45">{timeAgo(record.check_in_time)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="font-bold text-[#F2A410] text-sm">+{record.points_awarded}</p>
                        <p className="text-[9px] text-white/35 uppercase tracking-wider">
                          {statusLabel(record.status)}
                        </p>
                      </div>
                    </motion.li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        </div>
      </main>

      <footer className="w-full text-center py-6 text-white/35 text-xs mt-12 border-t border-white/5">
        © {new Date().getFullYear()} Rotaract District 3233 · VIBE Platform
      </footer>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  bg: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 ring-1 ring-white/10 rounded-2xl p-5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: bg }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-extrabold leading-none" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/45 mt-2">
        {label}
      </p>
    </div>
  )
}
