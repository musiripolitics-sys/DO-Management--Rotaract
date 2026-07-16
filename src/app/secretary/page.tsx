'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderOpen,
  LogOut,
} from 'lucide-react'
import { activeReportMonth, deadlineState, DEADLINE_LABEL, periodLabel, type ClubProject } from '@/lib/projects'

/* ────────────────────────────────────────────────────────────────
 * Secretary landing — mirrors the president portal: identity pass
 * (QR) and club info first; the project-report flow lives behind
 * the "Upload projects" button at /secretary/projects.
 * ────────────────────────────────────────────────────────────── */

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  club_name: string | null
  role?: 'secretary' | 'president'
}

const STATUS_STYLE = {
  overdue: { chip: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertTriangle },
  'due-soon': { chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: CalendarClock },
  open: { chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
} as const

export default function SecretaryHome() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<ClubProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/secretary/projects')
    if (res.status === 401) {
      window.location.href = '/'
      return
    }
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setLoadError(d.error || 'Could not load your portal.')
      setLoading(false)
      return
    }
    setLoadError(null)
    setProfile(d.profile)
    setProjects(d.projects ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const month = activeReportMonth()
  const monthCount = useMemo(
    () => projects.filter((p) => p.report_month === month).length,
    [projects, month],
  )
  const dl = deadlineState(month)
  const S = STATUS_STYLE[dl.status]

  const handleSignOut = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6D28D9] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400/80" />
        <p className="text-white/70 max-w-sm text-sm">{loadError}</p>
        <button
          onClick={() => {
            setLoading(true)
            load()
          }}
          className="text-sm font-semibold text-[#A78BFA] hover:text-white border border-[#6D28D9]/30 hover:border-[#6D28D9]/70 rounded-xl px-4 py-2"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src="/vibe-logo.jpg"
            alt="VIBE"
            width={2480}
            height={610}
            className="h-8 w-auto rounded bg-white p-0.5"
          />
          <span className="hidden sm:inline text-sm font-semibold text-white/50">Secretary Portal</span>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-xl px-3 py-2 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Welcome */}
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#A78BFA] mb-2">
            Rotaract District 3233
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hi, {profile?.full_name?.split(' ')[0] ?? 'Secretary'} 👋
          </h1>
          <p className="text-sm text-white/45 mt-1">
            {profile?.club_name}
            {' · '}
            {profile?.role === 'president' ? 'President' : 'Club Secretary'}
          </p>
        </div>

        {/* Identity pass */}
        <section className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          <div className="shrink-0 text-center">
            {profile?.email ? (
              <div className="bg-white p-3 rounded-2xl shadow-[0_0_30px_-10px_rgba(109,40,217,0.5)]">
                <QRCodeSVG
                  value={`vibe:email:${profile.email}`}
                  size={150}
                  bgColor={'#ffffff'}
                  fgColor={'#000000'}
                  level={'Q'}
                  includeMargin={false}
                />
              </div>
            ) : (
              <div className="w-[150px] h-[150px] flex items-center justify-center text-center text-xs text-red-400 px-4 border border-red-400/30 rounded-2xl">
                Email missing — contact admin.
              </div>
            )}
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-[#6D28D9]/15 text-[#A78BFA] border border-[#6D28D9]/30 px-2.5 py-1 rounded-full">
                <BadgeCheck className="w-3 h-3" />
                Identity Pass
              </span>
            </div>
            <h2 className="font-bold text-lg leading-tight">Your Identity Pass</h2>
            <p className="text-sm text-white/45 mt-1">
              Show this at event check-ins to log your attendance and earn points.
            </p>
            <p className="mt-3 text-[11px] text-white/35 font-mono break-all">{profile?.email}</p>
          </div>
        </section>

        {/* Project reports */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#6D28D9]/15 flex items-center justify-center ring-1 ring-[#6D28D9]/25 shrink-0">
              <ClipboardList className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg leading-tight">Monthly project reports</h2>
              <p className="text-sm text-white/45 mt-1">
                {periodLabel(month)} — {monthCount === 0 ? 'no projects logged yet' : `${monthCount} project${monthCount === 1 ? '' : 's'} logged`}
              </p>
            </div>
            <span
              className={`shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 text-[11px] font-semibold border px-2.5 py-1 rounded-full ${S.chip}`}
            >
              <S.icon className="w-3 h-3" />
              {DEADLINE_LABEL[dl.status]}
              {dl.status === 'overdue' ? ` · ${dl.days}d` : dl.status === 'due-soon' ? ` · ${dl.days}d left` : ''}
            </span>
          </div>
          <Link
            href="/secretary/projects"
            className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold rounded-xl px-5 py-3.5 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Upload projects
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-3 text-[11px] text-white/35 text-center">
            Opens your club&apos;s report book — add, edit, and review this month&apos;s projects there.
          </p>
        </section>
      </main>
    </div>
  )
}
