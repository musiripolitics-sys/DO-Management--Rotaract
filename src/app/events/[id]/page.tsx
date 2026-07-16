'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  MapPin,
  Mic2,
  Sparkles,
  Users,
} from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'

/* ────────────────────────────────────────────────────────────────
 * Types — mirrors /api/public/events/[id]
 * ────────────────────────────────────────────────────────────── */

type EventDetails = {
  id: string
  name: string
  description: string | null
  category: string | null
  location: string | null
  event_date: string
  end_date: string | null
  start_time: string
  end_time: string | null
  logo_url: string | null
}

type ClubRow = { name: string; attendees: number; bookings: number; share: number }

type EventPayload = {
  event: EventDetails
  leaderboard: {
    college: ClubRow[]
    community: ClubRow[]
    totals: { clubs: number; attendees: number; collegeClubs: number; communityClubs: number }
  }
  agenda: { time_label: string | null; title: string; description: string | null }[]
  speakers: { name: string; designation: string | null; photo_url: string | null }[]
}

/* Accent per event category — matches the homepage palette. */
function categoryAccent(category: string | null): string {
  const c = (category ?? '').toLowerCase()
  if (c.includes('drc')) return '#FAB616'
  if (c.includes('ceremony')) return '#A78BFA'
  if (c.includes('district')) return '#2D9DDB'
  return '#6D28D9'
}

/* ────────────────────────────────────────────────────────────────
 * Small helpers
 * ────────────────────────────────────────────────────────────── */

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

function Countdown({ target }: { target: string }) {
  const c = useCountdown(target)
  if (!c) return null
  if (c.live) {
    return (
      <span className="inline-flex items-center gap-2 text-[#FAB616] font-extrabold text-lg">
        <span className="w-2 h-2 rounded-full bg-[#FAB616] animate-pulse" />
        Happening now
      </span>
    )
  }
  const units: [number, string][] = [
    [c.d, 'days'],
    [c.h, 'hours'],
    [c.m, 'mins'],
    [c.s, 'secs'],
  ]
  return (
    <div className="flex items-center gap-2.5" aria-label="event countdown">
      {units.map(([v, u]) => (
        <span key={u} className="text-center">
          <span className="block min-w-14 rounded-xl bg-white/8 border border-white/10 px-2 py-2.5 text-2xl font-extrabold tabular-nums text-white">
            {String(v).padStart(2, '0')}
          </span>
          <span className="block mt-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40 font-semibold">
            {u}
          </span>
        </span>
      ))}
    </div>
  )
}

function formatDateRange(ev: EventDetails): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const start = new Date(ev.event_date)
  const startStr = start.toLocaleDateString('en-IN', opts)
  if (ev.end_date && ev.end_date !== ev.event_date) {
    return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(ev.end_date).toLocaleDateString('en-IN', opts)}`
  }
  return startStr
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Monogram used when the event has no logo yet. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/* Numbered section kicker, same language as the homepage. */
function SectionKicker({ n, label, dark = false }: { n: string; label: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <span
        className={`inline-flex items-center justify-center w-9 h-7 rounded-lg border font-mono text-xs font-bold ${
          dark ? 'border-white/20 text-white/70' : 'border-[#1A1815]/15 text-[#1A1815]/60'
        }`}
      >
        {n}
      </span>
      <span className={`h-px w-10 ${dark ? 'bg-white/20' : 'bg-[#1A1815]/15'}`} />
      <span
        className={`text-xs uppercase tracking-[0.22em] font-semibold ${
          dark ? 'text-white/50' : 'text-[#1A1815]/50'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
 * PAGE
 * ────────────────────────────────────────────────────────────── */

export default function EventLandingPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<EventPayload | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    if (!params?.id) return
    let cancelled = false
    fetch(`/api/public/events/${params.id}`)
      .then(async (r) => {
        if (r.status === 404 || r.status === 400) return null
        if (!r.ok) throw new Error(await r.text())
        return (await r.json()) as EventPayload
      })
      .then((payload) => {
        if (cancelled) return
        if (!payload) setState('missing')
        else {
          setData(payload)
          setState('ready')
        }
      })
      .catch(() => !cancelled && setState('missing'))
    return () => {
      cancelled = true
    }
  }, [params?.id])

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#14121B] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50 text-sm">
          <span className="w-2 h-2 rounded-full bg-[#A78BFA] animate-ping" />
          Loading event…
        </div>
      </div>
    )
  }

  if (state === 'missing' || !data) {
    return (
      <div className="min-h-screen bg-[#14121B] flex flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="text-5xl">🗓️</p>
        <h1 className="text-2xl font-extrabold text-white">This event isn&apos;t on the calendar.</h1>
        <p className="text-sm text-white/50 max-w-sm">
          It may have been removed, or the link is off by a character.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to the district home
        </Link>
      </div>
    )
  }

  const { event, leaderboard, agenda, speakers } = data
  const accent = categoryAccent(event.category)
  const startTime = formatTime(event.start_time)
  const endTime = formatTime(event.end_time)
  const hasBookings = leaderboard.totals.clubs > 0

  return (
    <div className="min-h-screen bg-white text-[#1A1815] overflow-x-clip">
      {/* ============= NAV ============= */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#14121B]/85 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0" aria-label="VIBE — district home">
            <Image
              src="/vibe-logo.jpg"
              alt="Rotaract District 3233 — VIBE"
              width={2480}
              height={610}
              priority
              className="h-9 sm:h-10 w-auto rounded-lg bg-white p-1"
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/#events"
              className="hidden sm:inline text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              All events
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-4 sm:px-5 py-2 transition-colors"
            >
              Sign in <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============= HERO ============= */}
      <section className="relative bg-[#14121B] text-white pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="hidden md:block absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full blur-[140px]"
            style={{ backgroundColor: `${accent}33` }}
          />
          <div className="hidden md:block absolute -bottom-48 -right-40 w-[480px] h-[480px] rounded-full bg-[#6D28D9]/20 blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, #A78BFA 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-12 gap-10 items-center">
          {/* Copy */}
          <div className="lg:col-span-7 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full border"
                style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
              >
                <Sparkles className="w-3 h-3" />
                {event.category ?? 'District event'}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/45 bg-white/8 px-3 py-1.5 rounded-full">
                Rotaract District 3233
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="mt-6 text-[38px] sm:text-6xl lg:text-[68px] font-extrabold tracking-tight leading-[1.02]"
            >
              {event.name}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-5 text-base sm:text-lg text-white/60 leading-relaxed max-w-xl"
            >
              {event.description ??
                'A district gathering for Rotaractors — scan in on arrival, earn your points, and represent your club.'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-white/65"
            >
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: accent }} />
                {formatDateRange(event)}
              </span>
              {startTime && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: accent }} />
                  {startTime}
                  {endTime ? ` – ${endTime}` : ''}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: accent }} />
                  {event.location}
                </span>
              )}
            </motion.div>

            {hasBookings && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-6 text-sm text-white/50"
              >
                <span className="font-bold text-white tabular-nums">
                  {leaderboard.totals.attendees.toLocaleString('en-IN')}
                </span>{' '}
                Rotaractors registered from{' '}
                <span className="font-bold text-white tabular-nums">{leaderboard.totals.clubs}</span> clubs — and
                counting.
              </motion.p>
            )}
          </div>

          {/* Logo + countdown card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 min-w-0"
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-7">
              <div className="flex items-center gap-5">
                {event.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.logo_url}
                    alt={`${event.name} logo`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-white shrink-0"
                  />
                ) : (
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0 flex items-center justify-center text-3xl font-extrabold text-[#14121B]"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
                    aria-hidden
                  >
                    {initialsOf(event.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/45 mb-1">
                    The event
                  </p>
                  <p className="font-extrabold text-lg leading-snug">{event.name}</p>
                  {event.location && <p className="text-xs text-white/50 mt-1 truncate">{event.location}</p>}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/45 mb-3">
                  Doors open in
                </p>
                <Countdown target={event.start_time} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============= 01 · REGISTRATION LEADERBOARD ============= */}
      <section id="registrations" className="relative bg-[#FAF7F0] py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10 sm:mb-12">
            <SectionKicker n="01" label="Registrations" />
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Which clubs are <span className="text-[#6D28D9]">showing up.</span>
            </h2>
            <p className="mt-4 text-[#1A1815]/55">
              Live from club bookings — the five strongest delegations per segment.
            </p>
          </div>

          {hasBookings ? (
            <div className="grid lg:grid-cols-2 gap-5">
              <RegistrationCard
                title="College-based clubs"
                icon={GraduationCap}
                accent="#6D28D9"
                rows={leaderboard.college}
                emptyNote="No college club has booked yet."
              />
              <RegistrationCard
                title="Community-based clubs"
                icon={Building2}
                accent="#B8860B"
                rows={leaderboard.community}
                emptyNote="No community club has booked yet."
              />
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#1A1815]/15 bg-white/60 p-10 text-center">
              <Users className="w-8 h-8 mx-auto text-[#1A1815]/25 mb-3" />
              <p className="font-bold text-[#1A1815]/70">No club registrations yet.</p>
              <p className="text-sm text-[#1A1815]/45 mt-1">
                Club presidents can book their delegation from the portal — the board fills up here as they do.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============= 02 · AGENDA ============= */}
      <section id="agenda" className="relative bg-white py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 min-w-0">
            <SectionKicker n="02" label="Agenda" />
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              The run <span className="text-[#2D9DDB]">of day.</span>
            </h2>
            <p className="mt-4 text-[#1A1815]/55">
              Arrive for the scan-in window — punctuality earns bonus points on the district leaderboard.
            </p>
          </div>

          <div className="lg:col-span-8 min-w-0">
            {agenda.length > 0 ? (
              <ol className="relative border-l-2 border-[#1A1815]/10 ml-3 space-y-8">
                {agenda.map((item, i) => (
                  <motion.li
                    key={`${item.title}-${i}`}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="relative pl-8"
                  >
                    <span
                      className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white"
                      style={{ backgroundColor: i === 0 ? '#FAB616' : '#C7C2F5' }}
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      {item.time_label && (
                        <span className="font-mono text-xs font-bold text-[#6D28D9] bg-[#6D28D9]/8 px-2.5 py-1 rounded-lg tabular-nums">
                          {item.time_label}
                        </span>
                      )}
                      <h3 className="text-lg font-extrabold tracking-tight">{item.title}</h3>
                    </div>
                    {item.description && (
                      <p className="mt-1.5 text-sm text-[#1A1815]/55 leading-relaxed max-w-xl">{item.description}</p>
                    )}
                  </motion.li>
                ))}
              </ol>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#1A1815]/15 p-10 text-center">
                <Clock className="w-8 h-8 mx-auto text-[#1A1815]/25 mb-3" />
                <p className="font-bold text-[#1A1815]/70">The agenda is being finalised.</p>
                <p className="text-sm text-[#1A1815]/45 mt-1">Check back closer to the event for the full run of day.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============= 03 · SPEAKERS ============= */}
      <section id="speakers" className="relative bg-[#14121B] text-white py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="hidden md:block absolute -top-40 right-0 w-[480px] h-[480px] rounded-full bg-[#6D28D9]/20 blur-[140px]" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-2xl mb-10 sm:mb-12">
            <SectionKicker n="03" label="Speakers" dark />
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              On <span className="text-[#FAB616]">the mic.</span>
            </h2>
          </div>

          {speakers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {speakers.map((sp, i) => (
                <motion.div
                  key={`${sp.name}-${i}`}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, delay: i * 0.06 }}
                  className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
                >
                  {sp.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sp.photo_url}
                      alt={sp.name}
                      className="w-full aspect-square rounded-2xl object-cover bg-white/10"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="w-full aspect-square rounded-2xl flex items-center justify-center text-4xl font-extrabold text-white/85"
                      style={{
                        background: `linear-gradient(135deg, ${['#6D28D9', '#1A468F', '#B45309', '#0F766E'][i % 4]}, #14121B)`,
                      }}
                    >
                      {initialsOf(sp.name)}
                    </div>
                  )}
                  <p className="mt-4 font-extrabold leading-snug">{sp.name}</p>
                  {sp.designation && <p className="mt-1 text-xs text-white/50 leading-relaxed">{sp.designation}</p>}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center">
              <Mic2 className="w-8 h-8 mx-auto text-white/25 mb-3" />
              <p className="font-bold text-white/70">Speaker lineup drops soon.</p>
              <p className="text-sm text-white/40 mt-1">The district team is locking in the roster.</p>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
 * Registration leaderboard card
 * ────────────────────────────────────────────────────────────── */

function RegistrationCard({
  title,
  icon: Icon,
  accent,
  rows,
  emptyNote,
}: {
  title: string
  icon: React.ElementType
  accent: string
  rows: ClubRow[]
  emptyNote: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.attendees))
  return (
    <div className="min-w-0 rounded-3xl border border-[#1A1815]/10 bg-white p-6 sm:p-7 shadow-[0_18px_44px_-30px_rgba(26,24,21,0.35)]">
      <div className="flex items-center gap-2.5 mb-6">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-xl"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="font-extrabold tracking-tight">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[#1A1815]/45 py-6 text-center">{emptyNote}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r, i) => (
            <div key={r.name} className="min-w-0">
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                    i === 0 ? 'text-white' : 'bg-[#1A1815]/6 text-[#1A1815]/55'
                  }`}
                  style={i === 0 ? { backgroundColor: accent } : undefined}
                >
                  {i + 1}
                </span>
                <p className="flex-1 min-w-0 text-sm font-bold truncate">{r.name}</p>
                <p className="shrink-0 text-right">
                  <span className="text-sm font-extrabold tabular-nums" style={{ color: accent }}>
                    {r.attendees.toLocaleString('en-IN')}
                  </span>
                  <span className="ml-1.5 text-[10px] text-[#1A1815]/40 uppercase tracking-wide">
                    {r.attendees === 1 ? 'seat' : 'seats'}
                  </span>
                </p>
              </div>
              <div className="mt-1.5 ml-10 h-1.5 rounded-full bg-[#1A1815]/6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(r.attendees / max) * 100}%` }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: i === 0 ? accent : `${accent}55` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
