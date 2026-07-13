'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  Building2,
  Calendar,
  Crown,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  HeartHandshake,
  KeyRound,
  Loader2,
  MapPin,
  Medal,
  QrCode,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import RegisterForm from '@/components/RegisterForm'

type UpcomingEvent = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
}

type LeaderboardEntry = {
  full_name: string | null
  club_name: string | null
  total_points: number | null
}

type HomeStats = {
  members: number
  clubs: { total: number; college: number; community: number }
  eventsHeld: number
  totalCheckIns: number
  totalPoints: number
}

type HomeData = {
  upcomingEvents: UpcomingEvent[]
  leaderboard: LeaderboardEntry[]
  memberCount: number
  stats?: HomeStats
  activityByMonth?: { label: string; count: number }[]
  topClubs?: { name: string; scans: number; members: number }[]
  impact?: { projects: number; beneficiaries: number; volunteers: number } | null
}

const HOW_IT_WORKS = [
  {
    n: '01',
    icon: QrCode,
    title: 'Scan in',
    desc: 'Show up to a district event and scan the QR — your check-in is logged in real time.',
  },
  {
    n: '02',
    icon: Sparkles,
    title: 'Earn points',
    desc: 'Punctuality bonuses, event participation, and signature moments all build your VIBE score.',
  },
  {
    n: '03',
    icon: TrendingUp,
    title: 'Climb the board',
    desc: 'See where you stand district-wide. Top performers earn a spot on the live leaderboard.',
  },
]

const VIBE_VALUES = [
  { letter: 'V', word: 'Vision', color: '#1A468F' },
  { letter: 'I', word: 'Innovate', color: '#6D28D9' },
  { letter: 'B', word: 'Believe', color: '#2D9DDB' },
  { letter: 'E', word: 'Evolve', color: '#F58220' },
]

export default function LandingPage() {
  // ── Register-as-member dialog ──
  const [registerOpen, setRegisterOpen] = useState(false)
  // ── Unified login state ──
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginStep, setLoginStep] = useState<'identifier' | 'password' | 'set-password'>('identifier')
  const [identifier, setIdentifier] = useState('') // email or admin username
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [home, setHome] = useState<HomeData | null>(null)
  const [navScrolled, setNavScrolled] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    fetch('/api/public/home')
      .then((r) => r.json())
      .then((d) => {
        if (d?.upcomingEvents) setHome(d)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const resetLogin = () => {
    setLoginStep('identifier')
    setLoginName('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  const openLogin = (prefill = '') => {
    if (prefill) setIdentifier(prefill)
    resetLogin()
    setLoginOpen(true)
  }

  // Step 1 — look up the account and decide password vs first-time setup
  const runCheck = async (id: string) => {
    if (!id.trim()) return
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', identifier: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not verify that account')
      setLoginName(data.name || id)
      setLoginStep(data.hasPassword ? 'password' : 'set-password')
      setLoginOpen(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not verify that account')
    } finally {
      setLoginLoading(false)
    }
  }

  // Step 2a — sign in with an existing password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', identifier, password }),
      })
      const data = await res.json()
      if (res.status === 400 && data.needsSetup) {
        setLoginStep('set-password')
        return
      }
      if (!res.ok) throw new Error(data.error || 'Login failed')
      toast.success(`Welcome back, ${data.name || loginName}!`)
      window.location.href = data.dashboard || '/dashboard'
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  // Step 2b — first-time password creation
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      toast.success(`Password set! Welcome, ${data.name || loginName}!`)
      window.location.href = data.dashboard || '/dashboard'
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Setup failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const formatEventDate = (date: string, time: string) => {
    const d = new Date(time)
    return `${new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  if (!isMounted) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1815] selection:bg-[#6D28D9]/15 selection:text-[#6D28D9] overflow-x-hidden">
      {/* ============= NAV ============= */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
          navScrolled
            ? 'bg-white/85 backdrop-blur-xl border-b border-[#1A1815]/10 py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3" aria-label="VIBE home">
            <Image
              src="/vibe-logo.jpg"
              alt="Rotaract District 3233 — VIBE"
              width={2480}
              height={610}
              priority
              className="h-9 lg:h-11 w-auto"
            />
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#1A1815]/70">
            <a href="#leaderboard" className="hover:text-[#6D28D9] transition">
              Leaderboard
            </a>
            <a href="#events" className="hover:text-[#6D28D9] transition">
              Events
            </a>
            <a href="#how" className="hover:text-[#6D28D9] transition">
              How VIBE works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRegisterOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#6D28D9]/30 text-[#6D28D9] hover:bg-[#F5F3FF] text-sm font-semibold px-3.5 sm:px-4 py-2.5 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Register as member</span>
              <span className="sm:hidden">Register</span>
            </button>
            <button
              onClick={() => openLogin()}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-4 sm:px-5 py-2.5 transition-all shadow-[0_8px_22px_-8px_rgba(109,40,217,0.55)] hover:shadow-[0_12px_32px_-6px_rgba(109,40,217,0.7)]"
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ============= HERO ============= */}
      <section
        id="top"
        className="relative pt-32 lg:pt-40 pb-20 lg:pb-28 px-6 overflow-hidden"
      >
        <BrandMesh />

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* LEFT */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#6D28D9]/25 bg-[#6D28D9]/8 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#6D28D9]"
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-[#6D28D9] animate-ping opacity-60" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
              </span>
              Rotaract District 3233
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-6 text-[44px] sm:text-6xl lg:text-[76px] font-extrabold tracking-tight leading-[1.02] text-[#1A1815]"
            >
              Show up.
              <br />
              Earn points.
              <br />
              <span className="text-[#6D28D9]">Lead the district.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-7 max-w-xl text-base lg:text-lg text-[#1A1815]/65 leading-relaxed"
            >
              VIBE is the gamified engagement platform for Rotaract District
              3233. Track attendance, earn points for punctuality, and climb the
              live district leaderboard.
              {home?.memberCount ? (
                <>
                  {' '}
                  Join{' '}
                  <span className="text-[#1A468F] font-semibold">
                    {home.memberCount.toLocaleString()} members
                  </span>{' '}
                  already in.
                </>
              ) : null}
            </motion.p>

            {/* Unified login entry */}
            <motion.form
              id="login"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              onSubmit={(e) => {
                e.preventDefault()
                runCheck(identifier)
              }}
              className="mt-9 max-w-lg rounded-2xl border border-[#1A1815]/10 bg-white p-5 sm:p-6 shadow-[0_30px_60px_-30px_rgba(26,24,21,0.18)]"
            >
              <div className="flex items-center justify-between mb-3">
                <Label
                  htmlFor="member-email"
                  className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55"
                >
                  Sign in
                </Label>
                <span className="text-[10px] text-[#1A1815]/45 hidden sm:inline">
                  Members, officials &amp; presidents
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  id="member-email"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@rotaract3233.org"
                  className="flex-1 h-12 bg-[#FAF7F0] border-[#1A1815]/10 text-[#1A1815] placeholder:text-[#1A1815]/35 focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                  required
                />
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg h-12 px-6 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold border-0 shadow-[0_10px_30px_-12px_rgba(109,40,217,0.6)] transition-all"
                >
                  {loginLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>

            {/* Micro stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-10 grid grid-cols-3 gap-4 sm:gap-6 max-w-lg"
            >
              <Stat
                value={<CountUp value={home?.stats?.members ?? home?.memberCount} />}
                label="Members"
                color="#6D28D9"
              />
              <Stat
                value={<CountUp value={home?.stats?.clubs.total} />}
                label="Clubs"
                color="#1A468F"
              />
              <Stat
                value={<CountUp value={home?.stats?.totalCheckIns} />}
                label="Check-ins"
                color="#F58220"
              />
            </motion.div>
          </div>

          {/* RIGHT — VIBE letter blocks + live ticker */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {VIBE_VALUES.map((v, i) => (
                <motion.div
                  key={v.letter}
                  initial={{ opacity: 0, y: 24, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.4 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ y: -4 }}
                  className="relative aspect-[5/4] rounded-3xl p-6 sm:p-7 text-white shadow-[0_18px_40px_-18px_rgba(26,24,21,0.35)]"
                  style={{ background: v.color }}
                >
                  <div className="absolute top-3 right-4 text-[10px] uppercase tracking-[0.22em] font-semibold opacity-70">
                    {v.word}
                  </div>
                  <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                    <span className="text-[110px] sm:text-[140px] font-black leading-[0.8] tracking-tighter">
                      {v.letter}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Floating "live ticker" */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-[#1A1815] text-white text-xs font-medium px-4 py-2.5 shadow-2xl shadow-black/30 whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-[#FAB616] animate-pulse" />
              {home?.leaderboard?.length
                ? `${home.leaderboard[0]?.full_name || 'Top member'} leading the board`
                : 'Live leaderboard updating'}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============= DISTRICT PULSE — live analytics ============= */}
      <section id="pulse" className="relative px-6 py-20 lg:py-28 bg-[#14121B] text-white overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#A78BFA 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="max-w-6xl mx-auto relative">
          <SectionLabel color="#A78BFA" light>District Pulse</SectionLabel>
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-end mb-12">
            <div className="lg:col-span-7">
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
                The district, <span className="text-[#A78BFA]">in live numbers.</span>
              </h2>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="text-base text-white/55 leading-relaxed">
                Every scan, point, and project reported on VIBE rolls up here — straight from the platform.
              </p>
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <PulseKpi icon={QrCode} label="Event check-ins" value={home?.stats?.totalCheckIns} accent="#A78BFA" />
            <PulseKpi icon={Sparkles} label="Points awarded" value={home?.stats?.totalPoints} accent="#FAB616" />
            <PulseKpi icon={Calendar} label="Events held" value={home?.stats?.eventsHeld} accent="#2D9DDB" />
            <PulseKpi
              icon={Building2}
              label="Active clubs"
              value={home?.stats?.clubs.total}
              sub={home?.stats ? `${home.stats.clubs.college} college · ${home.stats.clubs.community} community` : undefined}
              accent="#F58220"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* 6-month check-in trend */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold inline-flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#A78BFA]" /> Check-in activity
                </h3>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">Last 6 months</span>
              </div>
              {home?.activityByMonth ? (
                <div className="flex items-end justify-between gap-3 h-44">
                  {home.activityByMonth.map((m) => {
                    const max = Math.max(1, ...home.activityByMonth!.map((x) => x.count))
                    return (
                      <div key={m.label} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
                        <span className="text-[11px] font-bold text-[#A78BFA] tabular-nums">{m.count || ''}</span>
                        <div className="w-full flex flex-col justify-end" style={{ height: '78%' }}>
                          <motion.div
                            initial={{ scaleY: 0 }}
                            whileInView={{ scaleY: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full rounded-t-lg bg-gradient-to-t from-[#6D28D9] to-[#A78BFA] origin-bottom"
                            style={{ height: `${Math.max(2, (m.count / max) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/40 font-semibold">{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
              )}
            </div>

            {/* Service impact (from monthly club reports) */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold inline-flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-[#F58220]" /> Service impact
                </h3>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">From monthly club reports</span>
              </div>
              {home?.impact && home.impact.projects > 0 ? (
                <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                  <ImpactStat value={home.impact.projects} label="Projects reported" accent="#A78BFA" />
                  <ImpactStat value={home.impact.beneficiaries} label="People served" accent="#F58220" />
                  <ImpactStat value={home.impact.volunteers} label="Volunteers mobilised" accent="#2D9DDB" />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
                  <FolderKanban className="w-8 h-8 text-white/20" />
                  <p className="text-sm text-white/45 max-w-[32ch] leading-relaxed">
                    Clubs report completed projects every month — the district's impact numbers appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============= LIVE LEADERBOARD ============= */}
      <section
        id="leaderboard"
        className="relative px-6 py-20 lg:py-28 bg-[#F5F3FF]"
      >
        <div className="max-w-6xl mx-auto">
          <SectionLabel color="#FAB616">Live Leaderboard</SectionLabel>
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-end mb-12">
            <div className="lg:col-span-7">
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1A1815] leading-[1.05]">
                Who&rsquo;s on top{' '}
                <span className="text-[#FAB616]">this week.</span>
              </h2>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="text-base text-[#1A1815]/65 leading-relaxed">
                Points are awarded for showing up, showing up early, and showing
                up consistently. Updated the moment a member scans in.
              </p>
            </div>
          </div>

          {!home ? (
            <div className="bg-white border border-[#1A1815]/8 rounded-3xl p-12 flex justify-center">
              <Loader2 className="w-6 h-6 text-[#6D28D9]/60 animate-spin" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-6 items-start">
              {/* Members */}
              <div className="lg:col-span-3">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-[#FAB616]" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#1A1815]/60">Top members</h3>
                </div>
                {home.leaderboard.length === 0 ? (
                  <div className="bg-white border border-[#1A1815]/8 rounded-3xl p-12 text-center">
                    <Trophy className="w-10 h-10 text-[#FAB616] mx-auto mb-3" />
                    <p className="text-[#1A1815]/60 text-sm">
                      No points earned yet — be the first to scan in.
                    </p>
                  </div>
                ) : (
                  <Leaderboard entries={home.leaderboard} />
                )}
              </div>

              {/* Clubs */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-[#6D28D9]" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#1A1815]/60">Top clubs by check-ins</h3>
                </div>
                <ClubBoard clubs={home.topClubs ?? []} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============= UPCOMING EVENTS ============= */}
      <section id="events" className="relative px-6 py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionLabel color="#2D9DDB">Upcoming Events</SectionLabel>
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-end mb-12">
            <div className="lg:col-span-7">
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1A1815] leading-[1.05]">
                What&rsquo;s on{' '}
                <span className="text-[#2D9DDB]">this month.</span>
              </h2>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="text-base text-[#1A1815]/65 leading-relaxed">
                Every district event is worth points. Show up early, score the
                punctuality bonus.
              </p>
            </div>
          </div>

          {!home ? (
            <div className="bg-[#FAF7F0] border border-[#1A1815]/8 rounded-3xl p-12 flex justify-center">
              <Loader2 className="w-6 h-6 text-[#2D9DDB]/60 animate-spin" />
            </div>
          ) : home.upcomingEvents.length === 0 ? (
            <div className="bg-[#F5F3FF] border border-[#1A1815]/8 rounded-3xl p-12 text-center">
              <Calendar className="w-10 h-10 text-[#2D9DDB] mx-auto mb-3" />
              <p className="text-[#1A1815]/60 text-sm">
                No upcoming events scheduled — check back soon.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {home.upcomingEvents.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: i * 0.06 }}
                  className="group relative rounded-3xl bg-white border border-[#1A1815]/10 p-6 hover:border-[#6D28D9]/40 hover:shadow-[0_18px_40px_-20px_rgba(109,40,217,0.3)] transition-all"
                >
                  <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#6D28D9] bg-[#6D28D9]/10 px-2.5 py-1 rounded-full">
                    <Calendar className="w-3 h-3" />
                    {formatEventDate(ev.event_date, ev.start_time)}
                  </div>
                  <h3 className="mt-4 font-bold text-lg text-[#1A1815] leading-tight">
                    {ev.name}
                  </h3>
                  {ev.location && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[#1A1815]/55">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}
                  <ArrowUpRight className="absolute top-6 right-6 w-4 h-4 text-[#1A1815]/30 group-hover:text-[#6D28D9] group-hover:rotate-12 transition-all" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============= HOW VIBE WORKS ============= */}
      <section
        id="how"
        className="relative px-6 py-20 lg:py-28 bg-[#4C1D95] text-white overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="max-w-6xl mx-auto relative">
          <SectionLabel color="#FAB616" light>
            How VIBE works
          </SectionLabel>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-14 max-w-3xl">
            Three steps. <span className="text-[#FAB616]">One platform.</span>{' '}
            Endless district pride.
          </h2>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-12 right-12 h-px bg-white/15" />
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.7, delay: i * 0.12 }}
                  className="relative"
                >
                  <div className="relative z-10 w-24 h-24 rounded-full border-2 border-white/15 bg-[#4C1D95] flex items-center justify-center mb-6">
                    <Icon className="w-9 h-9 text-[#FAB616]" />
                    <motion.span
                      className="absolute inset-0 rounded-full border border-[#FAB616]/40"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.4 }}
                    />
                  </div>
                  <div className="font-mono text-xs text-[#FAB616] mb-2 tracking-[0.2em]">
                    STEP {step.n}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed max-w-[28ch]">
                    {step.desc}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============= PLATFORM FEATURES ============= */}
      <section id="features" className="relative px-6 py-20 lg:py-28 bg-[#FAF7F0]">
        <div className="max-w-6xl mx-auto">
          <SectionLabel color="#6D28D9">One platform</SectionLabel>
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-end mb-12">
            <div className="lg:col-span-7">
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1A1815] leading-[1.05]">
                Everything the district <span className="text-[#6D28D9]">runs on.</span>
              </h2>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="text-base text-[#1A1815]/65 leading-relaxed">
                From the scan at the door to the monthly report — every workflow lives in VIBE.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={QrCode} color="#6D28D9" title="QR attendance"
              desc="Every member carries a personal QR identity pass. The sergeant team scans; check-ins and points land instantly." />
            <FeatureCard icon={Trophy} color="#FAB616" title="Live leaderboard"
              desc="Punctuality and participation ranked in real time, across every district event." />
            <FeatureCard icon={Building2} color="#1A468F" title="Club management"
              desc={`${home?.stats?.clubs.total ?? '70+'} clubs with officers, member rosters, and per-club analytics dashboards.`} />
            <FeatureCard icon={FolderKanban} color="#F58220" title="Monthly project reports"
              desc="Secretaries file completed projects by the 5th; the DRS reviews district-wide with photo folders." />
            <FeatureCard icon={BookMarked} color="#2D9DDB" title="DRC bookings"
              desc="Presidents reserve their club's slots for District Rotaract Conference events in two clicks." />
            <FeatureCard icon={FileText} color="#6D28D9" title="Minutes of Meeting"
              desc="The district secretariat drafts, publishes, and exports official MoM documents." />
          </div>
        </div>
      </section>

      {/* ============= DISTRICT NUMBERS ============= */}
      <section className="relative px-6 py-16 lg:py-20 bg-white border-y border-[#1A1815]/8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          <BigStat
            value={<CountUp value={home?.stats?.members ?? home?.memberCount} />}
            label="Active members"
            color="#6D28D9"
          />
          <BigStat
            value={<CountUp value={home?.stats?.clubs.total} />}
            label="Active clubs"
            color="#1A468F"
          />
          <BigStat
            value={<CountUp value={home?.stats?.eventsHeld} />}
            label="Events held"
            color="#FAB616"
          />
          <BigStat
            value={<CountUp value={home?.stats?.totalPoints} />}
            label="Points awarded"
            color="#F58220"
          />
        </div>
      </section>

      {/* ============= FOOTER ============= */}
      <footer className="px-6 py-12 bg-white border-t border-[#1A1815]/8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Image
              src="/vibe-logo.jpg"
              alt="Rotaract District 3233 — VIBE"
              width={2480}
              height={610}
              className="h-9 w-auto mb-3"
            />
            <p className="text-xs text-[#1A1815]/55 max-w-md">
              Vision · Innovate · Believe · Evolve. Built for the members of
              Rotaract District 3233.
            </p>
          </div>
          <div className="text-xs text-[#1A1815]/45">
            © {new Date().getFullYear()} Rotaract District 3233. All rights
            reserved.
          </div>
        </div>
      </footer>

      {/* ============= UNIFIED LOGIN DIALOG ============= */}
      {/* ── Register-as-member dialog ── */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="bg-white text-[#1A1815] border-[#1A1815]/10 sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="w-9 h-9 rounded-full bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 text-[#6D28D9]" />
              </span>
              Register as a member
            </DialogTitle>
            <DialogDescription className="text-[#1A1815]/55">
              Join your Rotaract club — your club's officers approve the registration.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <RegisterForm compact />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open)
          if (!open) resetLogin()
        }}
      >
        <DialogContent className="bg-white text-[#1A1815] border-[#1A1815]/10 sm:max-w-[420px]">

          {/* ── Step 1: Identifier ── */}
          {loginStep === 'identifier' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <span className="w-9 h-9 rounded-full bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4 text-[#6D28D9]" />
                  </span>
                  Sign in to VIBE
                </DialogTitle>
                <DialogDescription className="text-[#1A1815]/55">
                  Enter your district email. Admins use their username.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  runCheck(identifier)
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-2">
                  <Label htmlFor="login-identifier" className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">
                    Email or Username
                  </Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@rotaract3233.org"
                    className="bg-white border-[#1A1815]/15 text-[#1A1815] placeholder:text-[#1A1815]/35 focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold border-0 mt-2 h-11"
                >
                  {loginLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          {/* ── Step 2a: First-time password ── */}
          {loginStep === 'set-password' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <span className="w-9 h-9 rounded-full bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4 text-[#6D28D9]" />
                  </span>
                  Set your password
                </DialogTitle>
                <DialogDescription className="text-[#1A1815]/55">
                  Welcome, <span className="font-semibold text-[#1A1815]">{loginName}</span>! Create a
                  password — you&rsquo;ll use it every time you sign in.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSetPassword} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="bg-white border-[#1A1815]/15 text-[#1A1815] pr-10 focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1815]/40 hover:text-[#1A1815]/70"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">
                    Confirm Password
                  </Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="bg-white border-[#1A1815]/15 text-[#1A1815] focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLoginStep('identifier')}
                    className="h-11 border-[#1A1815]/15 text-[#1A1815]/60 hover:text-[#1A1815]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold border-0 h-11"
                  >
                    {loginLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Set Password &amp; Sign in
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 2b: Returning password ── */}
          {loginStep === 'password' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <span className="w-9 h-9 rounded-full bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4 text-[#6D28D9]" />
                  </span>
                  Welcome back
                </DialogTitle>
                <DialogDescription className="text-[#1A1815]/55">
                  Signing in as{' '}
                  <span className="font-semibold text-[#1A1815]">{loginName}</span>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLogin} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="bg-white border-[#1A1815]/15 text-[#1A1815] pr-10 focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                      autoComplete="current-password"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1815]/40 hover:text-[#1A1815]/70"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setLoginStep('identifier'); setPassword('') }}
                    className="h-11 border-[#1A1815]/15 text-[#1A1815]/60 hover:text-[#1A1815]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold border-0 h-11"
                  >
                    {loginLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ===================== Sub-components ===================== */

function SectionLabel({
  children,
  color,
  light = false,
}: {
  children: React.ReactNode
  color: string
  light?: boolean
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold ${
        light ? 'text-white/80' : 'text-[#1A1815]/65'
      }`}
    >
      <span className="block w-8 h-px" style={{ backgroundColor: color }} />
      {children}
    </div>
  )
}

function Stat({
  value,
  label,
  color,
}: {
  value: React.ReactNode
  label: string
  color: string
}) {
  return (
    <div>
      <div className="text-2xl sm:text-3xl font-extrabold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[#1A1815]/50 font-semibold">
        {label}
      </div>
    </div>
  )
}

function BigStat({
  value,
  label,
  color,
  suffix = '',
}: {
  value: React.ReactNode
  label: string
  color: string
  suffix?: string
}) {
  return (
    <div className="text-center lg:text-left lg:border-l lg:border-[#1A1815]/10 lg:pl-6">
      <div
        className="text-4xl lg:text-5xl font-extrabold leading-none tabular-nums"
        style={{ color }}
      >
        {value}
        <span style={{ color }}>{suffix}</span>
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#1A1815]/55">
        {label}
      </div>
    </div>
  )
}

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((u, i) => {
        const rank = i + 1
        const isTop = rank <= 3
        const palette = [
          { bg: '#FAB616', tag: 'GOLD', icon: Trophy },
          { bg: '#9CA3AF', tag: 'SILVER', icon: Medal },
          { bg: '#B45309', tag: 'BRONZE', icon: Medal },
        ][i] || null

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className={`relative flex items-center gap-4 rounded-2xl bg-white border p-4 lg:p-5 transition-all hover:shadow-[0_18px_40px_-22px_rgba(26,24,21,0.2)] ${
              isTop ? 'border-[#FAB616]/30' : 'border-[#1A1815]/8'
            }`}
          >
            <div
              className={`shrink-0 flex items-center justify-center rounded-xl text-white font-extrabold ${
                isTop ? 'w-14 h-14' : 'w-12 h-12 bg-[#1A1815]/8 text-[#1A1815]/70'
              }`}
              style={isTop && palette ? { backgroundColor: palette.bg } : undefined}
            >
              {isTop && palette ? (
                <palette.icon className="w-5 h-5" />
              ) : (
                <span className="text-lg">{rank}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-[#1A1815] truncate">
                  {u.full_name || '—'}
                </p>
                {isTop && palette && (
                  <span
                    className="text-[9px] uppercase tracking-[0.15em] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${palette.bg}1A`,
                      color: palette.bg,
                    }}
                  >
                    {palette.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#1A1815]/55 truncate">
                {u.club_name || 'No club'}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={`font-extrabold tabular-nums ${
                  isTop ? 'text-2xl' : 'text-lg text-[#1A1815]/75'
                }`}
                style={isTop && palette ? { color: palette.bg } : undefined}
              >
                {u.total_points || 0}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#1A1815]/45">
                points
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function BrandMesh() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-32 -left-20 w-[600px] h-[600px] rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
        }}
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/4 -right-20 w-[560px] h-[560px] rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, rgba(45,157,219,0.16) 0%, transparent 70%)',
        }}
        animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, rgba(250,182,22,0.12) 0%, transparent 70%)',
        }}
        animate={{ x: [0, 60, 0], y: [0, -30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
    </div>
  )
}

/* ── Data-driven landing helpers ─────────────────────────────── */

/** Animated count-up that starts when scrolled into view. */
function CountUp({ value, suffix = '' }: { value: number | null | undefined; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView || value == null) return
    const target = value
    const duration = 1200
    const start = performance.now()
    let raf: number
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value])

  // Always render the ref'd span — the in-view observer must attach on
  // first mount, even while the data is still loading.
  return (
    <span ref={ref} className="tabular-nums">
      {value == null ? '—' : `${display.toLocaleString('en-IN')}${suffix}`}
    </span>
  )
}

/** Dark KPI tile for the District Pulse band. */
function PulseKpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: number | null | undefined
  sub?: string
  accent: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${accent}1F` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="text-3xl sm:text-4xl font-extrabold leading-none" style={{ color: accent }}>
        <CountUp value={value} />
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-white/45">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-white/35">{sub}</div>}
    </motion.div>
  )
}

/** Large impact number inside the Service Impact card. */
function ImpactStat({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-extrabold leading-none" style={{ color: accent }}>
        <CountUp value={value} />
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] font-semibold text-white/45 leading-snug">{label}</div>
    </div>
  )
}

/** Top clubs by check-ins — right column of the leaderboard section. */
function ClubBoard({ clubs }: { clubs: { name: string; scans: number; members: number }[] }) {
  if (clubs.length === 0) {
    return (
      <div className="bg-white border border-[#1A1815]/8 rounded-3xl p-10 text-center">
        <Building2 className="w-8 h-8 text-[#6D28D9]/40 mx-auto mb-2" />
        <p className="text-[#1A1815]/55 text-sm">Club rankings appear as members scan in.</p>
      </div>
    )
  }
  const max = Math.max(1, ...clubs.map((c) => c.scans))
  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-3xl p-4 sm:p-5 space-y-1.5">
      {clubs.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: i * 0.06 }}
          className="rounded-2xl px-3.5 py-3 hover:bg-[#F5F3FF] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                i === 0 ? 'bg-[#FAB616] text-white' : 'bg-[#1A1815]/6 text-[#1A1815]/60'
              }`}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1A1815] truncate">{c.name}</p>
              <p className="text-[10px] text-[#1A1815]/45">{c.members} members</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-extrabold text-[#6D28D9] tabular-nums">{c.scans}</span>
              <span className="block text-[9px] uppercase tracking-[0.14em] font-semibold text-[#1A1815]/40">check-ins</span>
            </div>
          </div>
          <div className="mt-2 h-1 rounded-full bg-[#1A1815]/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(c.scans / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
              className="h-full rounded-full"
              style={{ background: i === 0 ? '#FAB616' : '#6D28D9' }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/** Feature card for the platform grid. */
function FeatureCard({
  icon: Icon,
  color,
  title,
  desc,
}: {
  icon: React.ElementType
  color: string
  title: string
  desc: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.55 }}
      whileHover={{ y: -4 }}
      className="rounded-3xl bg-white border border-[#1A1815]/10 p-6 sm:p-7 hover:shadow-[0_18px_40px_-22px_rgba(26,24,21,0.25)] transition-shadow"
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: `${color}14` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h3 className="font-bold text-lg text-[#1A1815] leading-tight">{title}</h3>
      <p className="mt-2 text-sm text-[#1A1815]/60 leading-relaxed">{desc}</p>
    </motion.div>
  )
}
