'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  LogOut, FileText, Plus, Pencil, Trash2, Loader2, CalendarClock, FolderOpen,
  Users, HeartHandshake, MapPin, CheckCircle2, AlertTriangle, ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  activeReportMonth, recentReportMonths, periodLabel, periodLabelShort,
  deadlineState, type ClubProject,
} from '@/lib/projects'
import ProjectDrawer from './_components/ProjectDrawer'

type Profile = {
  id: string
  full_name: string | null
  club_name: string | null
  role?: 'secretary' | 'president'
}

const STATUS_STYLE = {
  overdue: { chip: 'bg-red-500/15 text-red-300 border-red-500/30', dot: 'bg-red-400', icon: AlertTriangle },
  'due-soon': { chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400', icon: CalendarClock },
  open: { chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400', icon: CheckCircle2 },
} as const

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SecretaryPortal() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<ClubProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(activeReportMonth())
  const [drawer, setDrawer] = useState<{ mode: 'add' } | { mode: 'edit'; project: ClubProject } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/secretary/projects')
    if (res.status === 401) { window.location.href = '/'; return }
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setLoadError(d.error || 'Could not load your projects.'); setLoading(false); return }
    setLoadError(null)
    setProfile(d.profile)
    setProjects(d.projects ?? [])
    if (d.activeMonth) setSelectedMonth((m) => m || d.activeMonth)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const countByMonth = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of projects) m[p.report_month] = (m[p.report_month] ?? 0) + 1
    return m
  }, [projects])

  const months = useMemo(() => {
    const set = new Set<string>([...recentReportMonths(6), ...projects.map((p) => p.report_month)])
    return Array.from(set).sort().reverse()
  }, [projects])

  const visible = useMemo(
    () => projects.filter((p) => p.report_month === selectedMonth),
    [projects, selectedMonth],
  )

  const handleDelete = async (p: ClubProject) => {
    if (!confirm(`Delete "${p.project_name}"? This can't be undone.`)) return
    const res = await fetch(`/api/secretary/projects/${p.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Project deleted'); load() }
    else toast.error('Could not delete')
  }

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
        <button onClick={() => { setLoading(true); load() }} className="text-sm font-semibold text-[#A78BFA] hover:text-white border border-[#6D28D9]/30 hover:border-[#6D28D9]/70 rounded-xl px-4 py-2">
          Try again
        </button>
      </div>
    )
  }

  const dl = deadlineState(selectedMonth)
  const S = STATUS_STYLE[dl.status]
  const isActive = selectedMonth === activeReportMonth()

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Image src="/vibe-logo.jpg" alt="VIBE" width={2480} height={610} className="h-8 w-auto" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-[#6D28D9]/20 text-[#A78BFA] border border-[#6D28D9]/30 px-2.5 py-1 rounded-full">
            <ClipboardList className="w-3 h-3" />
            {profile?.role === 'president' ? 'Club Reports' : 'Secretary Portal'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'president' && (
            <a href="/portal" className="text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-full px-3 py-1.5 transition-colors">
              ← Portal
            </a>
          )}
          <span className="hidden sm:block text-sm text-white/45 truncate max-w-[180px]">{profile?.full_name}</span>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-full px-3 py-1.5 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Welcome */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-semibold mb-1">Monthly activity report</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{profile?.club_name || 'Your club'}</h1>
          <p className="text-white/45 mt-1 text-sm">Log last month's completed projects by the 5th. Photos go in a Google Drive folder — just paste the link.</p>
        </div>

        {/* Deadline hero */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#6D28D9]/15 flex items-center justify-center ring-1 ring-[#6D28D9]/25 shrink-0">
                <CalendarClock className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-[0.18em] font-semibold">Reporting period</p>
                <h2 className="text-xl font-bold leading-tight">{periodLabel(selectedMonth)}</h2>
                <p className="text-sm text-white/50 mt-1">
                  Due by {dl.deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}
                  <span className="text-white/70 font-medium">{visible.length} {visible.length === 1 ? 'project' : 'projects'} logged</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full border ${S.chip}`}>
                <S.icon className="w-3.5 h-3.5" />
                {dl.status === 'overdue' ? `${dl.days}d overdue` : dl.status === 'due-soon' ? `${dl.days}d left` : `${dl.days}d left`}
              </span>
              <button onClick={() => setDrawer({ mode: 'add' })} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-xl px-4 py-2.5">
                <Plus className="w-4 h-4" /> Add project
              </button>
            </div>
          </div>
        </section>

        {/* Period switcher */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {months.map((m) => {
            const active = m === selectedMonth
            const n = countByMonth[m] ?? 0
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  active ? 'bg-white text-[#050505] border-white font-semibold' : 'border-white/12 text-white/60 hover:text-white hover:border-white/30'
                }`}
              >
                {periodLabelShort(m)}
                {m === activeReportMonth() && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#6D28D9]' : 'bg-[#A78BFA]'}`} />}
                {n > 0 && <span className={`text-[10px] font-bold px-1.5 rounded-full ${active ? 'bg-[#6D28D9]/15 text-[#6D28D9]' : 'bg-white/10 text-white/60'}`}>{n}</span>}
              </button>
            )
          })}
        </div>

        {/* Projects */}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-12 text-center">
            <FileText className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/45 text-sm">No projects logged for {periodLabel(selectedMonth)}{isActive ? ' yet' : ''}.</p>
            <button onClick={() => setDrawer({ mode: 'add' })} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#A78BFA] hover:text-white border border-[#6D28D9]/30 hover:border-[#6D28D9]/70 rounded-xl px-4 py-2 transition-colors">
              <Plus className="w-4 h-4" /> Add the first one
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/15 p-5 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{p.project_name}</h3>
                      {p.avenue && <span className="text-[10px] font-bold uppercase tracking-[0.12em] bg-[#6D28D9]/15 text-[#A78BFA] border border-[#6D28D9]/25 px-2 py-0.5 rounded-full">{p.avenue}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-white/45">
                      {fmtDate(p.project_date) && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" />{fmtDate(p.project_date)}</span>}
                      {p.venue && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.venue}</span>}
                      {p.beneficiaries != null && <span className="inline-flex items-center gap-1"><HeartHandshake className="w-3 h-3" />{p.beneficiaries} served</span>}
                      {p.volunteers != null && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{p.volunteers} volunteers</span>}
                    </div>
                    {p.description && <p className="text-sm text-white/55 mt-2.5 line-clamp-2">{p.description}</p>}
                    {p.drive_folder_url && (
                      <a href={p.drive_folder_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#2D9DDB] hover:text-white border border-[#2D9DDB]/25 hover:border-[#2D9DDB]/60 rounded-lg px-2.5 py-1.5 transition-colors">
                        <FolderOpen className="w-3.5 h-3.5" /> Photos folder
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setDrawer({ mode: 'edit', project: p })} title="Edit" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/8"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p)} title="Delete" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {drawer && (
        <ProjectDrawer
          reportMonth={selectedMonth}
          existing={drawer.mode === 'edit' ? drawer.project : null}
          onSaved={load}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  )
}
