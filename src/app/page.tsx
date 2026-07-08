'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MapPin,
  Medal,
  QrCode,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
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

type HomeData = {
  upcomingEvents: UpcomingEvent[]
  leaderboard: LeaderboardEntry[]
  memberCount: number
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
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [presidentDialogOpen, setPresidentDialogOpen] = useState(false)
  const [presidentStep, setPresidentStep] = useState<'email' | 'set-password' | 'enter-password'>('email')
  const [presidentEmail, setPresidentEmail] = useState('')
  const [presidentName, setPresidentName] = useState('')
  const [presidentPassword, setPresidentPassword] = useState('')
  const [presidentConfirm, setPresidentConfirm] = useState('')
  const [showPresidentPw, setShowPresidentPw] = useState(false)
  const [presidentLoading, setPresidentLoading] = useState(false)
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

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      // Presidents are blocked from email-only login — open the President dialog instead
      if (res.status === 403 && data.requiresPresidentLogin) {
        toast.info('Presidents sign in with a password. Use the "President login" button.')
        setPresidentEmail(email)
        setPresidentDialogOpen(true)
        return
      }

      if (!res.ok) throw new Error(data.error || 'Login failed')

      toast.success(`Welcome back, ${data.member?.full_name || email}!`)

      // Route DOs to /do-portal, everyone else to /dashboard
      const designation: string = data.member?.designation ?? ''
      const isDO = /^DO\s*-/i.test(designation)

      window.location.href = isDO ? '/do-portal' : '/dashboard'
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const resetPresidentDialog = () => {
    setPresidentStep('email')
    setPresidentEmail('')
    setPresidentName('')
    setPresidentPassword('')
    setPresidentConfirm('')
    setShowPresidentPw(false)
  }

  const handlePresidentEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!presidentEmail) return
    setPresidentLoading(true)
    try {
      const res = await fetch('/api/president/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', email: presidentEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setPresidentName(data.name || presidentEmail)
      setPresidentStep(data.hasPassword ? 'enter-password' : 'set-password')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setPresidentLoading(false)
    }
  }

  const handlePresidentSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (presidentPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (presidentPassword !== presidentConfirm) {
      toast.error('Passwords do not match')
      return
    }
    setPresidentLoading(true)
    try {
      const res = await fetch('/api/president/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', email: presidentEmail, password: presidentPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      toast.success(`Password set! Welcome, ${data.name || presidentName}!`)
      window.location.href = '/portal'
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Setup failed')
    } finally {
      setPresidentLoading(false)
    }
  }

  const handlePresidentSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setPresidentLoading(true)
    try {
      const res = await fetch('/api/president/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: presidentEmail, password: presidentPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      toast.success(`Welcome back, ${data.name || presidentName}!`)
      window.location.href = '/portal'
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setPresidentLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Invalid credentials')
        return
      }
      toast.success('Admin authenticated')
      window.location.href = '/admin'
    } catch {
      toast.error('Something went wrong')
    } finally {
      setAdminLoading(false)
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
              onClick={() => setAdminDialogOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1815]/60 hover:text-[#1A468F] border border-[#1A1815]/10 hover:border-[#1A468F]/40 bg-white rounded-full px-2.5 py-2.5 sm:px-3 sm:py-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </button>
            <button
              onClick={() => setPresidentDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-5 py-2.5 transition-all shadow-[0_8px_22px_-8px_rgba(109,40,217,0.55)] hover:shadow-[0_12px_32px_-6px_rgba(109,40,217,0.7)]"
            >
              President login
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

            {/* Member login form */}
            <motion.form
              id="login"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              onSubmit={handleMemberLogin}
              className="mt-9 max-w-lg rounded-2xl border border-[#1A1815]/10 bg-white p-5 sm:p-6 shadow-[0_30px_60px_-30px_rgba(26,24,21,0.18)]"
            >
              <div className="flex items-center justify-between mb-3">
                <Label
                  htmlFor="member-email"
                  className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55"
                >
                  Member login
                </Label>
                <span className="text-[10px] text-[#1A1815]/45 hidden sm:inline">
                  No password — district email only
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@rotaract3233.org"
                  className="flex-1 h-12 bg-[#FAF7F0] border-[#1A1815]/10 text-[#1A1815] placeholder:text-[#1A1815]/35 focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg h-12 px-6 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold border-0 shadow-[0_10px_30px_-12px_rgba(109,40,217,0.6)] transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Sign in
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
                value={home?.memberCount ? home.memberCount.toLocaleString() : '—'}
                label="Members"
                color="#6D28D9"
              />
              <Stat
                value={
                  home?.upcomingEvents
                    ? home.upcomingEvents.length.toString()
                    : '—'
                }
                label="Live events"
                color="#1A468F"
              />
              <Stat value="3233" label="District" color="#F58220" />
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
          ) : home.leaderboard.length === 0 ? (
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

      {/* ============= DISTRICT NUMBERS ============= */}
      <section className="relative px-6 py-16 lg:py-20 bg-white border-y border-[#1A1815]/8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          <BigStat
            value={home?.memberCount ? home.memberCount.toLocaleString() : '—'}
            label="Active members"
            color="#6D28D9"
          />
          <BigStat
            value={
              home?.upcomingEvents
                ? home.upcomingEvents.length.toString()
                : '—'
            }
            label="Live events"
            color="#1A468F"
          />
          <BigStat
            value={
              home?.leaderboard?.length
                ? home.leaderboard[0]?.total_points?.toString() || '—'
                : '—'
            }
            label="Top score"
            color="#FAB616"
            suffix=" pts"
          />
          <BigStat value="3233" label="The District" color="#F58220" />
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

      {/* ============= PRESIDENT DIALOG ============= */}
      <Dialog
        open={presidentDialogOpen}
        onOpenChange={(open) => {
          setPresidentDialogOpen(open)
          if (!open) resetPresidentDialog()
        }}
      >
        <DialogContent className="bg-white text-[#1A1815] border-[#1A1815]/10 sm:max-w-[420px]">

          {/* ── Step 1: Email ── */}
          {presidentStep === 'email' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <span className="w-9 h-9 rounded-full bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4 text-[#6D28D9]" />
                  </span>
                  President Login
                </DialogTitle>
                <DialogDescription className="text-[#1A1815]/55">
                  Presidents only. Enter your registered district email to continue.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePresidentEmailCheck} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="president-email" className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">
                    Email Address
                  </Label>
                  <Input
                    id="president-email"
                    type="email"
                    value={presidentEmail}
                    onChange={(e) => setPresidentEmail(e.target.value)}
                    placeholder="president@rotaract3233.org"
                    className="bg-white border-[#1A1815]/15 text-[#1A1815] placeholder:text-[#1A1815]/35 focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                    autoComplete="email"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={presidentLoading}
                  className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold border-0 mt-2 h-11"
                >
                  {presidentLoading ? (
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

          {/* ── Step 2a: Set password (first time) ── */}
          {presidentStep === 'set-password' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <span className="w-9 h-9 rounded-full bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4 text-[#6D28D9]" />
                  </span>
                  Set your password
                </DialogTitle>
                <DialogDescription className="text-[#1A1815]/55">
                  Welcome, <span className="font-semibold text-[#1A1815]">{presidentName}</span>! Create a
                  password — you&rsquo;ll use it every time you access the portal.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePresidentSetup} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPresidentPw ? 'text' : 'password'}
                      value={presidentPassword}
                      onChange={(e) => setPresidentPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="bg-white border-[#1A1815]/15 text-[#1A1815] pr-10 focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPresidentPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1815]/40 hover:text-[#1A1815]/70"
                      tabIndex={-1}
                    >
                      {showPresidentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">
                    Confirm Password
                  </Label>
                  <Input
                    type={showPresidentPw ? 'text' : 'password'}
                    value={presidentConfirm}
                    onChange={(e) => setPresidentConfirm(e.target.value)}
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
                    onClick={() => setPresidentStep('email')}
                    className="h-11 border-[#1A1815]/15 text-[#1A1815]/60 hover:text-[#1A1815]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    disabled={presidentLoading}
                    className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold border-0 h-11"
                  >
                    {presidentLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Set Password &amp; Enter Portal
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 2b: Enter password (returning) ── */}
          {presidentStep === 'enter-password' && (
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
                  <span className="font-semibold text-[#1A1815]">{presidentName}</span>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePresidentSignIn} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPresidentPw ? 'text' : 'password'}
                      value={presidentPassword}
                      onChange={(e) => setPresidentPassword(e.target.value)}
                      placeholder="Your portal password"
                      className="bg-white border-[#1A1815]/15 text-[#1A1815] pr-10 focus-visible:ring-[#6D28D9] focus-visible:border-[#6D28D9]"
                      autoComplete="current-password"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPresidentPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1815]/40 hover:text-[#1A1815]/70"
                      tabIndex={-1}
                    >
                      {showPresidentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setPresidentStep('email'); setPresidentPassword('') }}
                    className="h-11 border-[#1A1815]/15 text-[#1A1815]/60 hover:text-[#1A1815]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    disabled={presidentLoading}
                    className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold border-0 h-11"
                  >
                    {presidentLoading ? (
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

      {/* ============= ADMIN DIALOG ============= */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="bg-white text-[#1A1815] border-[#1A1815]/10 sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="w-9 h-9 rounded-full bg-[#1A468F]/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#1A468F]" />
              </span>
              Admin Login
            </DialogTitle>
            <DialogDescription className="text-[#1A1815]/55">
              Restricted area. Authorised personnel only.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdminLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label
                htmlFor="admin-username"
                className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55"
              >
                Username
              </Label>
              <Input
                id="admin-username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="bg-white border-[#1A1815]/15 text-[#1A1815] focus-visible:ring-[#1A468F] focus-visible:border-[#1A468F]"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="admin-password"
                className="text-xs uppercase tracking-[0.18em] text-[#1A1815]/55"
              >
                Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="bg-white border-[#1A1815]/15 text-[#1A1815] focus-visible:ring-[#1A468F] focus-visible:border-[#1A468F]"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={adminLoading}
              className="w-full bg-[#1A468F] hover:bg-[#143467] text-white font-semibold border-0 mt-2 h-11"
            >
              {adminLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in as Admin
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
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
  value: string
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
  value: string
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
