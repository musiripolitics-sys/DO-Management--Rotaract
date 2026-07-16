'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useSpring } from 'framer-motion'
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
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Loader2,
  Mail,
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
import { SiteFooter } from '@/components/site-footer'
import { initialsFor } from '@/lib/clubs'

/* ────────────────────────────────────────────────────────────────
 * Types — mirror of /api/public/home
 * ────────────────────────────────────────────────────────────── */

type UpcomingEvent = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
  category: string | null
}

type LeaderboardEntry = {
  full_name: string | null
  total_points: number | null
  club_name: string | null
}

type HomeStats = {
  members: number
  clubs: { total: number; college: number; community: number }
  eventsHeld: number
  totalCheckIns: number
  totalPoints: number
}

type RankedClub = { name: string; members: number; share: number }

type RotaryBlock = {
  totalClubs: number
  totalMembers: number
  avgMembers: number
  largest: { name: string; members: number; type: string; share: number }
  college: { clubs: number; members: number; top: RankedClub[] }
  community: { clubs: number; members: number; top: RankedClub[] }
}

type Engagement = {
  participants: number
  thisMonth: number
  lastMonth: number
  peak: { label: string; count: number }
}

type TopClub = {
  name: string
  scans: number
  members: number
  type: 'college' | 'community'
  share: number
}

type HomeData = {
  upcomingEvents: UpcomingEvent[]
  leaderboard: LeaderboardEntry[]
  memberCount: number
  stats?: HomeStats
  activityByMonth?: { label: string; count: number }[]
  engagement?: Engagement
  topClubs?: TopClub[]
  rotary?: RotaryBlock | null
  impact?: { projects: number; beneficiaries: number; volunteers: number } | null
  latestMom?: {
    id: string
    meeting_number: string | null
    published_at: string
    event_name: string | null
  } | null
}

/* ────────────────────────────────────────────────────────────────
 * Editorial constants
 * ────────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────────
 * Small hooks
 * ────────────────────────────────────────────────────────────── */

/** Live countdown to an ISO timestamp; ticks every second. */
function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])
  if (!target) return null
  const ts = new Date(target).getTime()
  if (Number.isNaN(ts)) return null
  const diff = ts - now
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, live: true }
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor(diff / 3_600_000) % 24,
    m: Math.floor(diff / 60_000) % 60,
    s: Math.floor(diff / 1000) % 60,
    live: false,
  }
}

/* ================================================================
 * PAGE
 * ================================================================ */

export default function LandingPage() {
  // ── Register-as-member dialog ──
  const [registerOpen, setRegisterOpen] = useState(false)
  // ── Unified login state ──
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginStep, setLoginStep] = useState<'identifier' | 'password' | 'set-password' | 'forgot-sent'>(
    'identifier',
  )
  const [identifier, setIdentifier] = useState('') // email or admin username
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [home, setHome] = useState<HomeData | null>(null)
  const [navScrolled, setNavScrolled] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Scroll progress rail
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 })

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
      window.location.href = data.needsProfile ? '/complete-profile' : (data.dashboard || '/dashboard')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  // Forgot password — email a reset link for the identifier already entered
  const handleForgot = async () => {
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send reset link')
      setLoginStep('forgot-sent')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not send reset link')
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
      // First-time setup → always route to the completion wizard.
      window.location.href = data.needsProfile ? '/complete-profile' : (data.dashboard || '/dashboard')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Setup failed')
    } finally {
      setLoginLoading(false)
    }
  }

  /* ── Derived, display-ready data (all real) ── */
  const nextEvent = home?.upcomingEvents?.[0] ?? null

  const participationPct = useMemo(() => {
    const p = home?.engagement?.participants ?? 0
    const m = home?.stats?.members ?? home?.memberCount ?? 0
    return m ? Math.round((p / m) * 100) : 0
  }, [home])

  const avgPointsPerCheckIn = useMemo(() => {
    const pts = home?.stats?.totalPoints ?? 0
    const ci = home?.stats?.totalCheckIns ?? 0
    return ci ? Math.round(pts / ci) : 0
  }, [home])

  const tickerItems = useMemo(() => {
    if (!home) return []
    const items: string[] = []
    const r = home.rotary
    if (r) {
      items.push(`${r.totalMembers.toLocaleString('en-IN')} Rotaractors on official record`)
      items.push(`${r.totalClubs} clubs district-wide`)
      items.push(`${r.largest.name} — largest club, ${r.largest.members.toLocaleString('en-IN')} members`)
    }
    if (home.leaderboard?.[0]?.full_name) items.push(`${home.leaderboard[0].full_name} leads the board`)
    if (nextEvent) {
      const d = new Date(nextEvent.event_date)
      items.push(`${nextEvent.name} — ${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`)
    }
    if (participationPct > 0) items.push(`${participationPct}% of members active on ground`)
    return items
  }, [home, nextEvent, participationPct])

  const formatEventDate = (date: string, time: string) => {
    const d = new Date(time)
    return `${new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  if (!isMounted) {
    return <div suppressHydrationWarning className="min-h-screen bg-[#14121B]" />
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-white text-[#1A1815] selection:bg-[#6D28D9]/15 selection:text-[#6D28D9] overflow-x-hidden">
      {/* ============= SCROLL PROGRESS ============= */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="fixed top-0 inset-x-0 h-[3px] z-50 origin-left bg-gradient-to-r from-[#6D28D9] via-[#A78BFA] to-[#FAB616]"
      />

      {/* ============= NAV ============= */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ease-out ${
          navScrolled
            ? 'bg-[#14121B]/80 backdrop-blur-xl border-b border-white/10 py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3 group" aria-label="VIBE home">
            <div className="flex items-center justify-center bg-[#6D28D9] text-white font-black px-4 py-2 rounded-md h-9 lg:h-10 text-xl tracking-wider transition-transform duration-500 ease-out group-hover:scale-105">
              VIBE
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {[
              ['Pulse', '#pulse'],
              ['Leaderboard', '#leaderboard'],
              ['Clubs', '#clubs'],
              ['Events', '#events'],
              ['How it works', '#how'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="relative group py-1 text-white/65 hover:text-white transition-colors duration-300"
              >
                {label}
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#FAB616] transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 ease-out rounded-full" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRegisterOpen(true)}
              className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/20 text-white/90 hover:bg-white/10 hover:border-white/35 text-sm font-semibold px-4 py-2.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              <UserPlus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
              <span className="hidden sm:inline">Register as member</span>
              <span className="sm:hidden">Register</span>
            </button>
            <button
              onClick={() => openLogin()}
              className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-5 py-2.5 transition-all duration-300 shadow-[0_8px_22px_-8px_rgba(109,40,217,0.65)] hover:shadow-[0_12px_32px_-6px_rgba(109,40,217,0.8)] hover:-translate-y-0.5 active:translate-y-0"
            >
              Sign in
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </header>

      {/* ============= HERO — the district, live ============= */}
      <section id="top" className="relative bg-[#14121B] text-white pt-32 lg:pt-40 pb-14 px-6 overflow-hidden">
        {/* ambient glows */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="hidden md:block absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-[#6D28D9]/25 blur-[140px]" />
          <div className="hidden md:block absolute top-1/3 -right-48 w-[520px] h-[520px] rounded-full bg-[#1A468F]/30 blur-[150px]" />
          <div className="hidden md:block absolute -bottom-48 left-1/3 w-[460px] h-[460px] rounded-full bg-[#F58220]/12 blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(#A78BFA 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* LEFT — editorial + entry */}
          <div className="lg:col-span-7 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#A78BFA]/30 bg-[#6D28D9]/15 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#C4B5FD]"
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-[#FAB616] animate-ping opacity-70" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-[#FAB616]" />
              </span>
              Rotaract District 3233 — live
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-6 text-[46px] sm:text-6xl lg:text-[80px] font-extrabold tracking-tight leading-[0.98]"
            >
              Show up.
              <br />
              Earn points.
              <br />
              <span className="bg-gradient-to-r from-[#A78BFA] via-[#C4B5FD] to-[#FAB616] bg-clip-text text-transparent">
                Lead the district.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-7 max-w-xl text-base lg:text-lg text-white/60 leading-relaxed"
            >
              VIBE is the live engagement platform for Rotaract District 3233 — every scan,
              point, and project in one place.
              {home?.memberCount ? (
                <>
                  {' '}
                  <span className="text-white/90 font-semibold">
                    {home.memberCount.toLocaleString('en-IN')} members
                  </span>{' '}
                  are already on the board.
                </>
              ) : null}
            </motion.p>

            {/* Unified login entry — preserved flow */}
            <motion.form
              id="login"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              onSubmit={(e) => {
                e.preventDefault()
                runCheck(identifier)
              }}
              className="mt-9 max-w-lg rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-xl p-5 sm:p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center justify-between mb-3">
                <Label htmlFor="member-email" className="text-xs uppercase tracking-[0.18em] text-white/55">
                  Sign in
                </Label>
                <span className="text-[10px] text-white/40 hidden sm:inline">
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
                  className="flex-1 h-12 bg-white/90 border-transparent text-[#1A1815] placeholder:text-[#1A1815]/40 focus-visible:ring-[#FAB616] focus-visible:border-[#FAB616]"
                  required
                />
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg h-12 px-6 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold border-0 shadow-[0_10px_30px_-12px_rgba(109,40,217,0.8)] transition-all"
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
          </div>

          {/* RIGHT — live status card */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 min-w-0"
          >
            <div className="rounded-3xl border border-white/12 bg-white/[0.05] backdrop-blur-xl p-6 sm:p-7 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-white/55">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
                  </span>
                  District status
                </span>
                <Activity className="w-4 h-4 text-[#A78BFA]" />
              </div>

              {/* Next event countdown */}
              <div className="relative rounded-2xl bg-[#6D28D9]/20 border border-[#A78BFA]/25 p-4 mb-4">
                {nextEvent && (
                  <Link
                    href={`/events/${nextEvent.id}`}
                    className="absolute inset-0 z-10"
                    aria-label={`Open the ${nextEvent.name} event page`}
                  />
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#C4B5FD] mb-1">
                      Next event
                    </p>
                    {nextEvent ? (
                      <>
                        <p className="font-bold text-white truncate">{nextEvent.name}</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {formatEventDate(nextEvent.event_date, nextEvent.start_time)}
                          {nextEvent.location ? ` · ${nextEvent.location}` : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-white/60">Being scheduled — check back soon.</p>
                    )}
                  </div>
                  {nextEvent && <Countdown target={nextEvent.start_time} size="sm" />}
                </div>
              </div>

              {/* Activity sparkline */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/45">
                    Check-ins · 6 months
                  </p>
                  {home?.engagement ? (
                    <span className="text-[11px] font-bold text-[#FAB616] tabular-nums">
                      {home.engagement.thisMonth} this month
                    </span>
                  ) : null}
                </div>
                {home?.activityByMonth ? (
                  <Sparkline data={home.activityByMonth} />
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                  </div>
                )}
              </div>

              {/* Leading chips */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-white/45 mb-1.5">
                    Leading member
                  </p>
                  <p className="font-bold text-sm text-white truncate">
                    {home?.leaderboard?.[0]?.full_name ?? '—'}
                  </p>
                  <p className="text-[11px] text-[#FAB616] font-semibold mt-0.5 tabular-nums">
                    {home?.leaderboard?.[0]?.total_points?.toLocaleString('en-IN') ?? 0} pts
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-white/45 mb-1.5">
                    Largest club
                  </p>
                  <p className="font-bold text-sm text-white truncate">
                    {home?.rotary?.largest?.name ?? '—'}
                  </p>
                  <p className="text-[11px] text-[#A78BFA] font-semibold mt-0.5 tabular-nums">
                    {home?.rotary?.largest?.members?.toLocaleString('en-IN') ?? 0} members
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Live ticker */}
        {tickerItems.length > 0 && (
          <div className="max-w-7xl mx-auto relative z-10 mt-12">
            <Ticker items={tickerItems} />
          </div>
        )}
      </section>

      {/* ============= 01 · DISTRICT PULSE ============= */}
      <section id="pulse" className="relative px-6 py-20 lg:py-28 bg-[#FAF7F0]">
        <div className="max-w-6xl mx-auto">
          <SectionHead
            index="01"
            kicker="District Pulse"
            color="#6D28D9"
            title={
              <>
                The district, <span className="text-[#6D28D9]">in live numbers.</span>
              </>
            }
            lede="Every scan and point on VIBE rolls up here the moment it happens — no monthly PDFs, no waiting."
          />

          {/* KPI deck */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiTile
              icon={QrCode}
              accent="#6D28D9"
              label="Event check-ins"
              value={home?.stats?.totalCheckIns}
              context={
                home?.engagement
                  ? home.engagement.lastMonth > 0
                    ? `${home.engagement.thisMonth} this month · ${home.engagement.lastMonth} last`
                    : `${home.engagement.thisMonth} this month`
                  : undefined
              }
            />
            <KpiTile
              icon={Sparkles}
              accent="#FAB616"
              label="Points awarded"
              value={home?.stats?.totalPoints}
              context={avgPointsPerCheckIn ? `≈ ${avgPointsPerCheckIn} pts per check-in` : undefined}
            />
            <KpiTile
              icon={Users}
              accent="#2D9DDB"
              label="Active participants"
              value={home?.engagement?.participants}
              context={participationPct ? `${participationPct}% of all members` : undefined}
            />
            <KpiTile
              icon={Calendar}
              accent="#F58220"
              label="Events held"
              value={home?.stats?.eventsHeld}
              context={nextEvent ? `next: ${formatEventDate(nextEvent.event_date, nextEvent.start_time)}` : undefined}
            />
          </div>

          {/* Activity chart */}
          <div className="rounded-3xl border border-[#1A1815]/8 bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h3 className="font-bold inline-flex items-center gap-2 text-[#1A1815]">
                <Activity className="w-4 h-4 text-[#6D28D9]" /> Check-in activity
              </h3>
              <div className="flex items-center gap-3">
                {home?.engagement?.peak?.count ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9]/8 text-[#6D28D9] text-[11px] font-semibold px-2.5 py-1">
                    <TrendingUp className="w-3 h-3" />
                    Peak: {home.engagement.peak.label} · {home.engagement.peak.count}
                  </span>
                ) : null}
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#1A1815]/40 font-semibold">
                  Last 6 months
                </span>
              </div>
            </div>
            {home?.activityByMonth ? (
              <AreaChart data={home.activityByMonth} />
            ) : (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[#6D28D9]/40 animate-spin" />
              </div>
            )}

            {/* Service impact — folded in only when clubs have reported */}
            {home?.impact && home.impact.projects > 0 ? (
              <div className="mt-8 pt-7 border-t border-[#1A1815]/8 grid grid-cols-3 gap-4">
                <ImpactStat value={home.impact.projects} label="Projects reported" accent="#6D28D9" />
                <ImpactStat value={home.impact.beneficiaries} label="People served" accent="#F58220" />
                <ImpactStat value={home.impact.volunteers} label="Volunteers mobilised" accent="#2D9DDB" />
              </div>
            ) : (
              <p className="mt-6 pt-5 border-t border-[#1A1815]/8 text-xs text-[#1A1815]/45 inline-flex items-center gap-2">
                <HeartHandshake className="w-3.5 h-3.5 text-[#F58220]" />
                Clubs file completed projects every month — service impact lands here as reports come in.
              </p>
            )}
          </div>

          <NextLink href="#leaderboard" label="Meet the people behind the numbers" />
        </div>
      </section>

      {/* ============= 02 · LEADERBOARD ============= */}
      <section id="leaderboard" className="relative px-6 py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHead
            index="02"
            kicker="Live Leaderboard"
            color="#FAB616"
            title={
              <>
                Who&rsquo;s on top <span className="text-[#FAB616]">right now.</span>
              </>
            }
            lede="Points land the second a member scans in — show up early and consistently to hold a podium spot."
          />

          {!home ? (
            <div className="bg-[#FAF7F0] border border-[#1A1815]/8 rounded-3xl p-12 flex justify-center">
              <Loader2 className="w-6 h-6 text-[#6D28D9]/60 animate-spin" />
            </div>
          ) : home.leaderboard.length === 0 ? (
            <div className="bg-[#F5F3FF] border border-[#1A1815]/8 rounded-3xl p-12 text-center">
              <Trophy className="w-10 h-10 text-[#FAB616] mx-auto mb-3" />
              <p className="text-[#1A1815]/60 text-sm">No points earned yet — be the first to scan in.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-3 min-w-0">
                <Podium entries={home.leaderboard.slice(0, 3)} />
                {home.leaderboard.length > 3 && (
                  <div className="mt-4 space-y-2.5">
                    {home.leaderboard.slice(3, 5).map((u, i) => (
                      <motion.div
                        key={`${u.full_name}-${i}`}
                        initial={{ opacity: 0, x: -14 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.5, delay: i * 0.07 }}
                        className="flex items-center gap-4 rounded-2xl bg-[#FAF7F0] border border-[#1A1815]/8 px-4 py-3.5"
                      >
                        <span className="w-9 h-9 rounded-xl bg-[#1A1815]/6 text-[#1A1815]/60 flex items-center justify-center font-extrabold text-sm">
                          {i + 4}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#1A1815] truncate">{u.full_name}</p>
                          {u.club_name && <p className="text-[11px] text-[#1A1815]/45 truncate">{u.club_name}</p>}
                        </div>
                        <span className="font-extrabold text-[#6D28D9] tabular-nums text-sm">
                          {(u.total_points ?? 0).toLocaleString('en-IN')}
                          <span className="ml-1 text-[9px] uppercase tracking-wide text-[#1A1815]/40 font-semibold">pts</span>
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Most active clubs — platform check-ins */}
              <div className="lg:col-span-2 min-w-0">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-[#6D28D9]" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#1A1815]/60">
                    Most active clubs
                  </h3>
                </div>
                <ActiveClubs clubs={home.topClubs ?? []} />
              </div>
            </div>
          )}

          <NextLink href="#clubs" label="See the district's biggest clubs" />
        </div>
      </section>

      {/* ============= 03 · FLAGSHIP — THE DISTRICT'S BIGGEST CLUBS ============= */}
      <section id="clubs" className="relative px-6 py-20 lg:py-28 bg-[#14121B] text-white overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="hidden md:block absolute -top-40 right-0 w-[520px] h-[520px] rounded-full bg-[#6D28D9]/20 blur-[150px]" />
          <div className="hidden md:block absolute bottom-0 -left-40 w-[460px] h-[460px] rounded-full bg-[#1A468F]/25 blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(#A78BFA 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />
        </div>

        <div className="max-w-6xl mx-auto relative">
          <SectionHead
            light
            index="03"
            kicker="Official club records"
            color="#A78BFA"
            title={
              <>
                {home?.rotary ? (
                  <>
                    <span className="text-[#A78BFA]">
                      {home.rotary.totalMembers.toLocaleString('en-IN')} Rotaractors.
                    </span>{' '}
                    {home.rotary.totalClubs} clubs. One district.
                  </>
                ) : (
                  <>
                    The district&rsquo;s <span className="text-[#A78BFA]">biggest clubs.</span>
                  </>
                )}
              </>
            }
            lede="Membership straight from Rotary International's records, engagement straight from VIBE — the full picture of every club's size and presence."
          />

          {!home?.rotary ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-12 flex justify-center">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          ) : (
            <>
              {/* Split + rankings */}
              <div className="grid lg:grid-cols-12 gap-5 mb-5">
                {/* Donut — college vs community */}
                <div className="lg:col-span-5 min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur p-6 sm:p-7">
                  <h3 className="font-bold mb-1">Where Rotaractors are based</h3>
                  <p className="text-xs text-white/45 mb-6">Official membership by club type</p>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <Donut
                      a={home.rotary.college.members}
                      b={home.rotary.community.members}
                      total={home.rotary.totalMembers}
                    />
                    <div className="space-y-4 min-w-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#A78BFA]" />
                          <GraduationCap className="w-4 h-4 text-[#A78BFA]" />
                          <span className="text-sm font-bold">College-based</span>
                        </div>
                        <p className="mt-1 pl-[18px] text-xs text-white/50 tabular-nums">
                          {home.rotary.college.clubs} clubs ·{' '}
                          <span className="text-white/80 font-semibold">
                            {home.rotary.college.members.toLocaleString('en-IN')}
                          </span>{' '}
                          members
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#FAB616]" />
                          <Building2 className="w-4 h-4 text-[#FAB616]" />
                          <span className="text-sm font-bold">Community-based</span>
                        </div>
                        <p className="mt-1 pl-[18px] text-xs text-white/50 tabular-nums">
                          {home.rotary.community.clubs} clubs ·{' '}
                          <span className="text-white/80 font-semibold">
                            {home.rotary.community.members.toLocaleString('en-IN')}
                          </span>{' '}
                          members
                        </p>
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        Avg club size:{' '}
                        <span className="text-white/70 font-semibold tabular-nums">{home.rotary.avgMembers}</span>{' '}
                        members
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive ranking */}
                <div className="lg:col-span-7 min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur p-6 sm:p-7">
                  <ClubRankings rotary={home.rotary} />
                </div>
              </div>

              {/* Callout tiles */}
              <div className="grid sm:grid-cols-3 gap-4">
                <CalloutTile
                  icon={Crown}
                  accent="#FAB616"
                  title={home.rotary.largest.name}
                  metric={`${home.rotary.largest.members.toLocaleString('en-IN')} members`}
                  note={`One club holds ${home.rotary.largest.share}% of the district's entire membership.`}
                />
                <CalloutTile
                  icon={Activity}
                  accent="#A78BFA"
                  title={home.topClubs?.[0]?.name ?? '—'}
                  metric={`${home.topClubs?.[0]?.scans ?? 0} check-ins`}
                  note={
                    home.topClubs?.[0]
                      ? `Most active on the ground — ${home.topClubs[0].share}% of all district check-ins.`
                      : 'Activity rankings appear as members scan in.'
                  }
                />
                <CalloutTile
                  icon={Users}
                  accent="#2D9DDB"
                  title="Average club"
                  metric={`${home.rotary.avgMembers} members`}
                  note={`Across ${home.rotary.totalClubs} chartered clubs on Rotary's official record.`}
                />
              </div>

              <p className="mt-5 text-[11px] text-white/35">
                Membership: official my.rotary.org records · Engagement: live VIBE check-ins
              </p>
            </>
          )}

          <NextLink href="#events" label="See where it all happens next" light />
        </div>
      </section>

      {/* ============= 04 · UPCOMING EVENTS ============= */}
      <section id="events" className="relative px-6 py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHead
            index="04"
            kicker="Upcoming Events"
            color="#2D9DDB"
            title={
              <>
                What&rsquo;s on <span className="text-[#2D9DDB]">next.</span>
              </>
            }
            lede="Every district event is worth points — arrive early for the punctuality bonus."
          />

          {!home ? (
            <div className="bg-[#FAF7F0] border border-[#1A1815]/8 rounded-3xl p-12 flex justify-center">
              <Loader2 className="w-6 h-6 text-[#2D9DDB]/60 animate-spin" />
            </div>
          ) : home.upcomingEvents.length === 0 ? (
            <div className="bg-[#F5F3FF] border border-[#1A1815]/8 rounded-3xl p-12 text-center">
              <Calendar className="w-10 h-10 text-[#2D9DDB] mx-auto mb-3" />
              <p className="text-[#1A1815]/60 text-sm">No upcoming events scheduled — check back soon.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Next up — feature card with live countdown */}
              {nextEvent && (
                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6 }}
                  className="relative overflow-hidden rounded-3xl bg-[#14121B] text-white p-7 sm:p-8"
                >
                  <div aria-hidden className="hidden md:block absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#2D9DDB]/25 blur-[90px]" />
                  <Link
                    href={`/events/${nextEvent.id}`}
                    className="absolute inset-0 z-10"
                    aria-label={`Open the ${nextEvent.name} event page`}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold text-[#FAB616] bg-[#FAB616]/12 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FAB616] animate-pulse" />
                        Next up
                      </span>
                      {nextEvent.category && (
                        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/50 bg-white/8 px-2.5 py-1 rounded-full">
                          {nextEvent.category}
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-semibold text-white/45">
                        Event page <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                      {nextEvent.name}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/55">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatEventDate(nextEvent.event_date, nextEvent.start_time)}
                      </span>
                      {nextEvent.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {nextEvent.location}
                        </span>
                      )}
                    </div>
                    <div className="mt-7">
                      <Countdown target={nextEvent.start_time} size="lg" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Rest of the calendar */}
              <div className="space-y-3.5">
                {home.upcomingEvents.slice(1, 5).map((ev, i) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: 18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.55, delay: i * 0.07 }}
                    className="group relative flex items-center gap-4 rounded-2xl border border-[#1A1815]/10 bg-white p-4 hover:border-[#2D9DDB]/50 hover:shadow-[0_16px_36px_-20px_rgba(45,157,219,0.35)] transition-all"
                  >
                    <Link
                      href={`/events/${ev.id}`}
                      className="absolute inset-0"
                      aria-label={`Open the ${ev.name} event page`}
                    />
                    <div className="shrink-0 w-14 text-center rounded-xl bg-[#EAF2FB] py-2.5">
                      <span className="block text-[10px] uppercase tracking-wide font-bold text-[#1A468F]/70">
                        {new Date(ev.event_date).toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                      <span className="block text-xl font-extrabold text-[#1A468F] leading-tight">
                        {new Date(ev.event_date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1A1815] truncate">{ev.name}</p>
                      <p className="text-xs text-[#1A1815]/50 truncate mt-0.5">
                        {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </div>
                    {ev.category && (
                      <span className="hidden sm:inline text-[10px] uppercase tracking-[0.14em] font-semibold text-[#2D9DDB] bg-[#2D9DDB]/10 px-2.5 py-1 rounded-full shrink-0">
                        {ev.category}
                      </span>
                    )}
                    <ArrowUpRight className="w-4 h-4 text-[#1A1815]/25 group-hover:text-[#2D9DDB] group-hover:rotate-12 transition-all shrink-0" />
                  </motion.div>
                ))}
                {home.upcomingEvents.length === 1 && (
                  <div className="rounded-2xl border border-dashed border-[#1A1815]/15 p-6 text-center text-sm text-[#1A1815]/45">
                    More district events are being scheduled — this calendar fills up fast.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Latest published Minutes of Meeting */}
          {home?.latestMom && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55 }}
              className="mt-10 relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-[#1A468F]/20 bg-white p-5 sm:p-6 shadow-[0_18px_44px_-30px_rgba(26,70,143,0.4)]"
            >
              <Link
                href={`/mom/${home.latestMom.id}`}
                className="absolute inset-0"
                aria-label="Read and download the latest minutes of meeting"
              />
              <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1A468F]/10 text-[#1A468F]">
                <FileText className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1A468F]">
                  Minutes of Meeting — published
                </p>
                <p className="mt-1 font-extrabold text-[#1A1815] truncate">
                  {home.latestMom.event_name ?? 'District Council Meeting'}
                  {home.latestMom.meeting_number ? ` · ${home.latestMom.meeting_number}` : ''}
                </p>
                <p className="text-xs text-[#1A1815]/50 mt-0.5">
                  Published{' '}
                  {new Date(home.latestMom.published_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  · open to read or download as PDF
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#1A468F] text-white text-xs font-bold px-4 py-2">
                Read & download <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </motion.div>
          )}

          <NextLink href="#how" label="How to earn your spot on the board" />
        </div>
      </section>

      {/* ============= 05 · HOW VIBE WORKS + PLATFORM ============= */}
      <section id="how" className="relative px-6 py-20 lg:py-28 bg-[#4C1D95] text-white overflow-hidden">
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
          <SectionHead
            light
            index="05"
            kicker="How VIBE works"
            color="#FAB616"
            title={
              <>
                Three steps. <span className="text-[#FAB616]">One platform.</span>
              </>
            }
            lede="From the scan at the door to the monthly report — every district workflow lives here."
          />

          <div className="grid md:grid-cols-3 gap-8 relative mb-16">
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
                  <div className="font-mono text-xs text-[#FAB616] mb-2 tracking-[0.2em]">STEP {step.n}</div>
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed max-w-[28ch]">{step.desc}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Platform capabilities — compact, factual */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: QrCode, title: 'QR attendance', desc: 'Personal QR identity pass; sergeant scans land instantly.' },
              { icon: Trophy, title: 'Live leaderboard', desc: 'Punctuality and participation ranked in real time.' },
              {
                icon: Building2,
                title: 'Club management',
                desc: `${home?.stats?.clubs.total ?? 72} clubs with officers, rosters, and analytics.`,
              },
              { icon: FolderKanban, title: 'Project reports', desc: 'Secretaries file monthly; the DRS reviews district-wide.' },
              { icon: BookMarked, title: 'DRC bookings', desc: 'Presidents reserve conference slots in two clicks.' },
              { icon: FileText, title: 'Minutes of Meeting', desc: 'Official MoM drafted, published, and exported.' },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="flex items-start gap-3.5 rounded-2xl border border-white/12 bg-white/[0.05] p-4.5 hover:bg-white/[0.09] transition-colors"
                >
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-[#FAB616]/15 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-[#FAB616]" />
                  </span>
                  <span>
                    <span className="block font-bold text-sm">{f.title}</span>
                    <span className="block text-xs text-white/60 mt-1 leading-relaxed">{f.desc}</span>
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============= VALUES + FINAL CTA ============= */}
      <section className="relative px-6 py-20 lg:py-24 bg-[#FAF7F0]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* VIBE values — brand DNA */}
            <div className="lg:col-span-5 min-w-0">
              <div className="grid grid-cols-4 gap-2.5 max-w-xs">
                {VIBE_VALUES.map((v, i) => (
                  <motion.div
                    key={v.letter}
                    initial={{ opacity: 0, y: 18, rotate: -3 }}
                    whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.55, delay: i * 0.08 }}
                    whileHover={{ y: -4 }}
                    className="aspect-square rounded-2xl text-white flex items-center justify-center shadow-[0_14px_30px_-14px_rgba(26,24,21,0.4)]"
                    style={{ background: v.color }}
                    title={v.word}
                  >
                    <span className="text-3xl font-black">{v.letter}</span>
                  </motion.div>
                ))}
              </div>
              <p className="mt-4 text-xs text-[#1A1815]/50 tracking-wide">
                <span className="font-semibold text-[#1A1815]/70">Vision · Innovate · Believe · Evolve</span>
                <br />
                An initiative of Rotaract District 3233, part of Rotary International.
              </p>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 min-w-0 relative overflow-hidden rounded-3xl bg-[#14121B] text-white p-8 sm:p-10"
            >
              <div aria-hidden className="hidden md:block absolute -top-28 -right-28 w-80 h-80 rounded-full bg-[#6D28D9]/30 blur-[100px]" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.05]">
                  Your club is already <span className="text-[#FAB616]">on the board.</span>
                </h2>
                <p className="mt-3 text-white/60 max-w-md text-sm leading-relaxed">
                  {home?.rotary
                    ? `${home.rotary.totalClubs} clubs and ${home.rotary.totalMembers.toLocaleString('en-IN')} Rotaractors strong — the only thing missing is your name on the leaderboard.`
                    : 'The district is live on VIBE — the only thing missing is your name on the leaderboard.'}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    onClick={() => setRegisterOpen(true)}
                    className="group inline-flex items-center gap-2 rounded-full bg-[#FAB616] hover:bg-[#E5A614] text-[#1A1815] text-sm font-bold px-6 py-3 transition-all hover:-translate-y-0.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register as member
                  </button>
                  <button
                    onClick={() => openLogin()}
                    className="group inline-flex items-center gap-2 rounded-full border border-white/25 hover:bg-white/10 text-white text-sm font-semibold px-6 py-3 transition-all hover:-translate-y-0.5"
                  >
                    Sign in
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============= FOOTER ============= */}
      <SiteFooter
        links={[
          ['Pulse', '#pulse'],
          ['Leaderboard', '#leaderboard'],
          ['Clubs', '#clubs'],
          ['Events', '#events'],
          ['How it works', '#how'],
        ]}
      />

      {/* ============= REGISTER DIALOG ============= */}
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
              Join your Rotaract club — your club&rsquo;s officers approve the registration.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <RegisterForm compact />
          </div>
        </DialogContent>
      </Dialog>

      {/* ============= UNIFIED LOGIN DIALOG ============= */}
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
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">New Password</Label>
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
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">Confirm Password</Label>
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
                  Signing in as <span className="font-semibold text-[#1A1815]">{loginName}</span>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLogin} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">Password</Label>
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
                  <button
                    type="button"
                    onClick={handleForgot}
                    disabled={loginLoading}
                    className="text-xs font-medium text-[#6D28D9] hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLoginStep('identifier')
                      setPassword('')
                    }}
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

          {loginStep === 'forgot-sent' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <span className="w-9 h-9 rounded-full bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#6D28D9]" />
                  </span>
                  Check your email
                </DialogTitle>
                <DialogDescription className="text-[#1A1815]/55">
                  If an account exists for{' '}
                  <span className="font-semibold text-[#1A1815]">{identifier}</span>, we&apos;ve emailed a
                  password-reset link. It expires in an hour.
                </DialogDescription>
              </DialogHeader>
              <div className="pt-2">
                <p className="text-xs text-[#1A1815]/50 bg-[#1A1815]/[0.03] rounded-xl px-4 py-3 leading-relaxed">
                  Didn&apos;t get it? Check spam, or head back and make sure the email is right.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLoginStep('password')
                    setPassword('')
                  }}
                  className="w-full mt-4 h-11 border-[#1A1815]/15 text-[#1A1815]/70 hover:text-[#1A1815]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to sign in
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ================================================================
 * Sub-components
 * ================================================================ */

/** Live event countdown, isolated so its 1-second tick re-renders ONLY
 *  this component — never the page (which would interrupt entrance
 *  animations mid-flight and freeze them). */
function Countdown({ target, size }: { target: string; size: 'sm' | 'lg' }) {
  const c = useCountdown(target)
  if (!c) return null

  if (c.live) {
    return size === 'sm' ? (
      <span className="text-[#FAB616] font-bold text-sm px-2 py-1 rounded-lg bg-[#FAB616]/15">LIVE</span>
    ) : (
      <span className="text-[#FAB616] font-extrabold text-xl">Happening now</span>
    )
  }

  const units: [number, string][] =
    size === 'sm'
      ? [
          [c.d, 'd'],
          [c.h, 'h'],
          [c.m, 'm'],
          [c.s, 's'],
        ]
      : [
          [c.d, 'days'],
          [c.h, 'hours'],
          [c.m, 'mins'],
          [c.s, 'secs'],
        ]

  return (
    <div
      className={size === 'sm' ? 'shrink-0 flex items-center gap-1.5 font-mono' : 'flex items-center gap-2.5'}
      aria-label="event countdown"
    >
      {units.map(([v, u]) => (
        <span key={u} className="text-center">
          <span
            className={
              size === 'sm'
                ? 'block min-w-9 rounded-lg bg-white/10 px-1.5 py-1.5 text-sm font-bold text-white tabular-nums'
                : 'block min-w-14 rounded-xl bg-white/8 border border-white/10 px-2 py-2.5 text-2xl font-extrabold tabular-nums'
            }
          >
            {String(v).padStart(2, '0')}
          </span>
          <span
            className={
              size === 'sm'
                ? 'block mt-1 text-[9px] uppercase text-white/40'
                : 'block mt-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40 font-semibold'
            }
          >
            {u}
          </span>
        </span>
      ))}
    </div>
  )
}

/** Editorial section header: numbered index + kicker + headline + lede. */
function SectionHead({
  index,
  kicker,
  color,
  title,
  lede,
  light = false,
}: {
  index: string
  kicker: string
  color: string
  title: React.ReactNode
  lede: string
  light?: boolean
}) {
  return (
    <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-12">
      <div className="lg:col-span-7 min-w-0">
        <div
          className={`inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.22em] font-semibold ${
            light ? 'text-white/70' : 'text-[#1A1815]/60'
          }`}
        >
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
            style={{ color, borderColor: `${color}55` }}
          >
            {index}
          </span>
          <span className="block w-8 h-px" style={{ backgroundColor: color }} />
          {kicker}
        </div>
        <h2
          className={`mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] ${
            light ? 'text-white' : 'text-[#1A1815]'
          }`}
        >
          {title}
        </h2>
      </div>
      <div className="lg:col-span-4 lg:col-start-9 min-w-0">
        <p className={`text-base leading-relaxed ${light ? 'text-white/55' : 'text-[#1A1815]/65'}`}>{lede}</p>
      </div>
    </div>
  )
}

/** End-of-section connective link → keeps the journey moving. */
function NextLink({ href, label, light = false }: { href: string; label: string; light?: boolean }) {
  return (
    <div className="mt-12 flex justify-center">
      <a
        href={href}
        className={`group inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
          light ? 'text-white/50 hover:text-[#FAB616]' : 'text-[#1A1815]/45 hover:text-[#6D28D9]'
        }`}
      >
        {label}
        <span className="inline-flex w-6 h-6 rounded-full border border-current items-center justify-center transition-transform duration-300 group-hover:translate-y-0.5">
          <ArrowRight className="w-3 h-3 rotate-90" />
        </span>
      </a>
    </div>
  )
}

/** Count-up number that animates when scrolled into view. */
function CountUp({ value }: { value: number | undefined | null }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(0)
  const target = value ?? 0

  useEffect(() => {
    if (!inView) return
    if (target === 0) {
      setDisplay(0)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const dur = Math.min(1600, 500 + Math.log10(Math.max(10, target)) * 320)
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target])

  return (
    <span ref={ref} className="tabular-nums">
      {display.toLocaleString('en-IN')}
    </span>
  )
}

/** Infinite marquee of live district facts. Static wrap under reduced motion. */
function Ticker({ items }: { items: string[] }) {
  const reduced = useReducedMotion()
  const row = (key: string, ariaHidden = false) => (
    <div key={key} aria-hidden={ariaHidden} className="flex items-center gap-8 pr-8 shrink-0">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-8 text-sm text-white/55 whitespace-nowrap">
          <span>{it}</span>
          <span className="text-[#FAB616]">✦</span>
        </span>
      ))}
    </div>
  )

  if (reduced) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 flex flex-wrap gap-x-8 gap-y-1.5">
        {items.map((it, i) => (
          <span key={i} className="text-sm text-white/55">
            {it}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] py-3">
      <div aria-hidden className="absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-[#14121B] to-transparent" />
      <div aria-hidden className="absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[#14121B] to-transparent" />
      <motion.div
        className="flex w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: Math.max(24, items.length * 6), ease: 'linear', repeat: Infinity }}
      >
        {row('a')}
        {row('b', true)}
      </motion.div>
    </div>
  )
}

/** Tiny sparkline for the hero status card. */
function Sparkline({ data }: { data: { label: string; count: number }[] }) {
  const w = 260
  const h = 56
  const max = Math.max(1, ...data.map((d) => d.count))
  const step = w / Math.max(1, data.length - 1)
  const pts = data.map((d, i) => [i * step, h - 6 - (d.count / max) * (h - 14)] as const)
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${path} L ${w} ${h} L 0 ${h} Z`
  const last = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" role="img" aria-label="Check-in trend, last 6 months">
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <motion.path
        d={path}
        fill="none"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      {last && <circle cx={last[0]} cy={last[1]} r="3" fill="#FAB616" />}
    </svg>
  )
}

/** KPI tile for the pulse deck. */
function KpiTile({
  icon: Icon,
  accent,
  label,
  value,
  context,
}: {
  icon: React.ElementType
  accent: string
  label: string
  value: number | undefined
  context?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55 }}
      className="rounded-3xl border border-[#1A1815]/8 bg-white p-5 sm:p-6"
    >
      <span className="inline-flex w-10 h-10 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: `${accent}14` }}>
        <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
      </span>
      <div className="text-3xl sm:text-[34px] font-extrabold leading-none text-[#1A1815]">
        <CountUp value={value} />
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#1A1815]/50">{label}</div>
      {context && (
        <div className="mt-2.5 text-[11px] font-medium" style={{ color: accent }}>
          {context}
        </div>
      )}
    </motion.div>
  )
}

/** Smooth-bezier area chart for the 6-month activity trend. */
function AreaChart({ data }: { data: { label: string; count: number }[] }) {
  const w = 720
  const h = 220
  const padX = 26
  const padTop = 30
  const padBottom = 34
  const max = Math.max(1, ...data.map((d) => d.count))
  const step = (w - padX * 2) / Math.max(1, data.length - 1)
  const pts = data.map(
    (d, i) => [padX + i * step, padTop + (1 - d.count / max) * (h - padTop - padBottom)] as const,
  )

  let line = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]
    const [x, y] = pts[i]
    const mx = px + (x - px) / 2
    line += ` C ${mx} ${py}, ${mx} ${y}, ${x} ${y}`
  }
  const area = `${line} L ${pts[pts.length - 1][0]} ${h - padBottom} L ${pts[0][0]} ${h - padBottom} Z`
  const peakIdx = data.reduce((bi, d, i) => (d.count > data[bi].count ? i : bi), 0)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Monthly check-ins, last 6 months">
      <defs>
        <linearGradient id="areafill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#6D28D9" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal grid */}
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = padTop + (1 - f) * (h - padTop - padBottom)
        return <line key={f} x1={padX} x2={w - padX} y1={y} y2={y} stroke="#1A1815" strokeOpacity="0.06" strokeDasharray="3 5" />
      })}

      <motion.path
        d={area}
        fill="url(#areafill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="#6D28D9"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {pts.map(([x, y], i) => (
        <g key={i}>
          <motion.circle
            cx={x}
            cy={y}
            r={i === peakIdx ? 5 : 3.5}
            fill={i === peakIdx ? '#FAB616' : '#6D28D9'}
            stroke="#fff"
            strokeWidth="1.5"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
          />
          {data[i].count > 0 && (
            <text
              x={x}
              y={y - 12}
              textAnchor="middle"
              className="fill-[#1A1815]"
              fontSize="12"
              fontWeight="700"
              opacity="0.75"
            >
              {data[i].count.toLocaleString('en-IN')}
            </text>
          )}
          <text x={x} y={h - 10} textAnchor="middle" fontSize="11" fontWeight="600" className="fill-[#1A1815]" opacity="0.4">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Impact stat (projects / beneficiaries / volunteers). */
function ImpactStat({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-extrabold leading-none" style={{ color: accent }}>
        <CountUp value={value} />
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] font-semibold text-[#1A1815]/45 leading-snug">
        {label}
      </div>
    </div>
  )
}

/** Top-3 members podium — gold centre, silver left, bronze right. */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const medal = [
    { tag: 'GOLD', color: '#FAB616', h: 'h-40 sm:h-44', icon: Trophy },
    { tag: 'SILVER', color: '#9CA3AF', h: 'h-28 sm:h-32', icon: Medal },
    { tag: 'BRONZE', color: '#B45309', h: 'h-22 sm:h-24', icon: Medal },
  ]
  // Display order: silver left, gold centre, bronze right.
  const order = [entries[1], entries[0], entries[2]].filter(Boolean) as LeaderboardEntry[]
  const medalFor = (u: LeaderboardEntry) => medal[entries.indexOf(u)]

  return (
    <div className="grid grid-cols-3 gap-3 items-end">
      {order.map((u, col) => {
        const m = medalFor(u)
        const Icon = m.icon
        const isGold = m.tag === 'GOLD'
        return (
          <div key={`${u.full_name}-${col}`} className="flex flex-col items-center min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: col * 0.1 }}
              className="flex flex-col items-center mb-3 w-full"
            >
              <span
                className={`flex items-center justify-center rounded-2xl text-white font-black mb-2 ${
                  isGold ? 'w-14 h-14 text-lg' : 'w-11 h-11 text-sm'
                }`}
                style={{ backgroundColor: m.color }}
              >
                {initialsFor(u.full_name)}
              </span>
              <p className={`font-bold text-[#1A1815] text-center truncate w-full ${isGold ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
                {u.full_name}
              </p>
              {u.club_name && (
                <p className="text-[10px] text-[#1A1815]/45 text-center truncate w-full mt-0.5">{u.club_name}</p>
              )}
              <p className="mt-1 font-extrabold tabular-nums text-sm" style={{ color: m.color }}>
                {(u.total_points ?? 0).toLocaleString('en-IN')}
                <span className="ml-1 text-[9px] uppercase text-[#1A1815]/40">pts</span>
              </p>
            </motion.div>
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: 0.15 + col * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={`w-full origin-bottom rounded-t-2xl ${m.h} flex items-start justify-center pt-3`}
              style={{
                background: `linear-gradient(180deg, ${m.color} 0%, ${m.color}99 100%)`,
              }}
            >
              <span className="inline-flex items-center gap-1.5 text-white/95 text-[10px] font-black tracking-[0.18em]">
                <Icon className="w-3.5 h-3.5" />
                {m.tag}
              </span>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

/** Most-active clubs (platform check-ins) with type badges + share bars. */
function ActiveClubs({ clubs }: { clubs: TopClub[] }) {
  if (clubs.length === 0) {
    return (
      <div className="bg-[#FAF7F0] border border-[#1A1815]/8 rounded-3xl p-10 text-center">
        <Building2 className="w-8 h-8 text-[#6D28D9]/40 mx-auto mb-2" />
        <p className="text-[#1A1815]/55 text-sm">Club rankings appear as members scan in.</p>
      </div>
    )
  }
  const max = Math.max(1, ...clubs.map((c) => c.scans))
  return (
    <div className="bg-[#FAF7F0] border border-[#1A1815]/8 rounded-3xl p-4 sm:p-5 space-y-1.5">
      {clubs.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: i * 0.06 }}
          className="rounded-2xl px-3.5 py-3 hover:bg-white transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                i === 0 ? 'bg-[#6D28D9] text-white' : 'bg-[#1A1815]/6 text-[#1A1815]/60'
              }`}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1A1815] truncate">{c.name}</p>
              <p className="text-[10px] text-[#1A1815]/45 inline-flex items-center gap-1">
                {c.type === 'college' ? (
                  <GraduationCap className="w-3 h-3 text-[#6D28D9]/60" />
                ) : (
                  <Building2 className="w-3 h-3 text-[#F58220]/70" />
                )}
                {c.type === 'college' ? 'College' : 'Community'} · {c.members} on platform
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-extrabold text-[#6D28D9] tabular-nums">{c.scans}</span>
              <span className="block text-[9px] uppercase tracking-[0.14em] font-semibold text-[#1A1815]/40">
                {c.share}% of scans
              </span>
            </div>
          </div>
          <div className="mt-2 h-1 rounded-full bg-[#1A1815]/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(c.scans / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
              className="h-full rounded-full"
              style={{ background: i === 0 ? '#6D28D9' : '#A78BFA' }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/** Animated college-vs-community membership donut. */
function Donut({ a, b, total }: { a: number; b: number; total: number }) {
  const R = 54
  const C = 2 * Math.PI * R
  const fa = total ? a / total : 0
  const fb = total ? b / total : 0

  return (
    <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
      <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
        <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
        <motion.circle
          cx="75"
          cy="75"
          r={R}
          fill="none"
          stroke="#A78BFA"
          strokeWidth="16"
          strokeLinecap="butt"
          initial={{ strokeDasharray: `0 ${C}` }}
          whileInView={{ strokeDasharray: `${fa * C} ${C}` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
        <motion.circle
          cx="75"
          cy="75"
          r={R}
          fill="none"
          stroke="#FAB616"
          strokeWidth="16"
          strokeLinecap="butt"
          initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: -fa * C }}
          whileInView={{ strokeDasharray: `${fb * C} ${C}`, strokeDashoffset: -fa * C }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.25, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white leading-none">
          <CountUp value={total} />
        </span>
        <span className="mt-1 text-[9px] uppercase tracking-[0.16em] font-semibold text-white/45">Rotaractors</span>
      </div>
    </div>
  )
}

/** Flagship interactive ranking: college/community toggle + animated bars. */
function ClubRankings({ rotary }: { rotary: RotaryBlock }) {
  const [tab, setTab] = useState<'college' | 'community'>('college')
  const rows = tab === 'college' ? rotary.college.top : rotary.community.top
  const accent = tab === 'college' ? '#A78BFA' : '#FAB616'
  const maxShare = Math.max(1, ...rows.map((r) => r.share))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-bold">Biggest clubs by membership</h3>
          <p className="text-xs text-white/45 mt-0.5">
            Top {rows.length} of {tab === 'college' ? rotary.college.clubs : rotary.community.clubs}{' '}
            {tab === 'college' ? 'college' : 'community'} clubs · % of segment
          </p>
        </div>
        {/* Segmented toggle */}
        <div className="relative inline-flex rounded-full border border-white/15 bg-white/[0.05] p-1">
          {(['college', 'community'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative z-10 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                tab === t ? 'text-[#14121B]' : 'text-white/60 hover:text-white'
              }`}
              aria-pressed={tab === t}
            >
              {tab === t && (
                <motion.span
                  layoutId="club-tab-pill"
                  className="absolute inset-0 rounded-full -z-10"
                  style={{ backgroundColor: accent }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              {t === 'college' ? <GraduationCap className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              {t === 'college' ? 'College' : 'Community'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          {rows.map((c, i) => (
            <div key={c.name} className="group">
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                    i === 0 ? 'text-[#14121B]' : 'bg-white/8 text-white/60'
                  }`}
                  style={i === 0 ? { backgroundColor: accent } : undefined}
                >
                  {i + 1}
                </span>
                <p className="flex-1 min-w-0 text-sm font-bold truncate">{c.name}</p>
                <p className="shrink-0 text-right">
                  <span className="text-sm font-extrabold tabular-nums" style={{ color: accent }}>
                    {c.members.toLocaleString('en-IN')}
                  </span>
                  <span className="ml-2 text-[10px] text-white/40 tabular-nums">{c.share}%</span>
                </p>
              </div>
              <div className="mt-1.5 ml-10 h-1.5 rounded-full bg-white/6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.share / maxShare) * 100}%` }}
                  transition={{ duration: 0.7, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: i === 0 ? accent : `${accent}66` }}
                />
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** Highlight tile in the flagship section. */
function CalloutTile({
  icon: Icon,
  accent,
  title,
  metric,
  note,
}: {
  icon: React.ElementType
  accent: string
  title: string
  metric: string
  note: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55 }}
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur p-5 sm:p-6"
    >
      <span className="inline-flex w-10 h-10 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: `${accent}1f` }}>
        <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
      </span>
      <p className="font-bold text-white truncate">{title}</p>
      <p className="text-xl font-extrabold mt-1 tabular-nums" style={{ color: accent }}>
        {metric}
      </p>
      <p className="text-xs text-white/45 mt-2 leading-relaxed">{note}</p>
    </motion.div>
  )
}
