'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Loader2, FolderKanban, Search, FolderOpen, Users, HeartHandshake, MapPin,
  CalendarClock, Building2, GraduationCap, CheckCircle2, AlertTriangle, Clock,
  Pencil, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  activeReportMonth, periodLabel, deadlineState, recentReportMonths,
} from '@/lib/projects'
import AdminProjectDrawer from './_components/AdminProjectDrawer'

type ProjectItem = {
  id: string
  project_name: string
  project_date: string | null
  avenue: string | null
  venue: string | null
  description: string | null
  outcome: string | null
  beneficiaries: number | null
  volunteers: number | null
  drive_folder_url: string | null
  submitted_by: string | null
}
type ClubGroup = { club_id: string; club_name: string; club_type: string | null; projects: ProjectItem[] }
type Data = {
  month: string
  months: string[]
  stats: { totalProjects: number; clubsSubmitted: number; totalClubs: number; participationPct: number; beneficiaries: number; volunteers: number }
  avenueBreakdown: { avenue: string; count: number }[]
  byClub: ClubGroup[]
  pendingClubs: { id: string; name: string; club_type: string | null }[]
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function ProjectReportsPage() {
  const [month, setMonth] = useState(activeReportMonth())
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [avenue, setAvenue] = useState('')
  const [editing, setEditing] = useState<{ project: ProjectItem; clubName: string } | null>(null)

  const reload = (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    fetch(`/api/admin/projects?month=${month}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [month])

  const deleteProject = async (p: ProjectItem) => {
    if (!confirm(`Delete "${p.project_name}"? This can't be undone.`)) return
    const res = await fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Project deleted'); reload(false) }
    else toast.error('Could not delete')
  }

  const dl = deadlineState(month)
  const monthOptions = data?.months ?? recentReportMonths(12)

  const filteredClubs = useMemo(() => {
    if (!data?.byClub) return []
    const q = query.trim().toLowerCase()
    return data.byClub
      .map((c) => ({
        ...c,
        projects: avenue ? c.projects.filter((p) => p.avenue === avenue) : c.projects,
      }))
      .filter((c) => c.projects.length > 0)
      .filter((c) => !q || c.club_name.toLowerCase().includes(q))
  }, [data, query, avenue])

  const filteredPending = useMemo(() => {
    if (!data?.pendingClubs) return []
    const q = query.trim().toLowerCase()
    return data.pendingClubs.filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [data, query])

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#6D28D9]/10 flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5 text-[#6D28D9]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1A1815]">Project Reports</h1>
            <p className="text-sm text-[#1A1815]/50">Monthly completed projects across the district</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full ${
            dl.status === 'overdue' ? 'bg-red-100 text-red-700' : dl.status === 'due-soon' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {dl.status === 'overdue' ? <AlertTriangle className="w-3.5 h-3.5" /> : dl.status === 'due-soon' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {dl.status === 'overdue' ? 'Window closed' : `${dl.days}d to deadline`}
          </span>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2 text-sm font-medium text-[#1A1815] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40">
            {monthOptions.map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}
          </select>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" /></div>
      ) : !data.stats ? (
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-12 text-center">
          <AlertTriangle className="w-9 h-9 text-amber-500/70 mx-auto mb-3" />
          <p className="text-sm text-[#1A1815]/55">Couldn't load project reports. Make sure the club_projects table has been created.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={FolderKanban} label="Projects" value={data.stats.totalProjects} color="#6D28D9" tint="bg-[#F5F3FF]" />
            <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-4 shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3"><CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /></div>
              <div className="text-2xl font-extrabold leading-none tabular-nums text-emerald-600">{data.stats.clubsSubmitted}<span className="text-[#1A1815]/30 text-lg">/{data.stats.totalClubs}</span></div>
              <div className="mt-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[#1A1815]/50">Clubs submitted · {data.stats.participationPct}%</div>
            </div>
            <Kpi icon={HeartHandshake} label="Beneficiaries" value={data.stats.beneficiaries.toLocaleString()} color="#F58220" tint="bg-[#F58220]/10" />
            <Kpi icon={Users} label="Volunteers" value={data.stats.volunteers.toLocaleString()} color="#1A468F" tint="bg-[#1A468F]/10" />
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clubs…"
                className="w-full bg-white border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40" />
            </div>
            {data.avenueBreakdown.length > 0 && (
              <select value={avenue} onChange={(e) => setAvenue(e.target.value)}
                className="bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2.5 text-sm text-[#1A1815] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40">
                <option value="">All avenues</option>
                {data.avenueBreakdown.map((a) => <option key={a.avenue} value={a.avenue}>{a.avenue} ({a.count})</option>)}
              </select>
            )}
          </div>

          {/* Submitted clubs */}
          {filteredClubs.length === 0 ? (
            <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-12 text-center">
              <FolderKanban className="w-10 h-10 text-[#1A1815]/12 mx-auto mb-3" />
              <p className="text-sm text-[#1A1815]/45">No projects reported for {periodLabel(month)}{query || avenue ? ' matching your filters' : ' yet'}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClubs.map((c) => (
                <div key={c.club_id} className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1A1815]/6 bg-[#FAFAF9]">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.club_type === 'college' ? 'bg-[#1A468F]/10 text-[#1A468F]' : 'bg-[#6D28D9]/10 text-[#6D28D9]'}`}>
                      {c.club_type === 'college' ? <GraduationCap className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                    <h3 className="font-bold text-[#1A1815] flex-1 min-w-0 truncate">{c.club_name}</h3>
                    <span className="text-xs font-semibold text-[#6D28D9] bg-[#F5F3FF] px-2.5 py-1 rounded-full shrink-0">{c.projects.length} {c.projects.length === 1 ? 'project' : 'projects'}</span>
                  </div>
                  <ul className="divide-y divide-[#1A1815]/5">
                    {c.projects.map((p) => (
                      <li key={p.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[#1A1815]">{p.project_name}</span>
                              {p.avenue && <span className="text-[10px] font-bold uppercase tracking-[0.1em] bg-[#6D28D9]/10 text-[#6D28D9] px-2 py-0.5 rounded-full">{p.avenue}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[#1A1815]/50">
                              {fmtDate(p.project_date) && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" />{fmtDate(p.project_date)}</span>}
                              {p.venue && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.venue}</span>}
                              {p.beneficiaries != null && <span className="inline-flex items-center gap-1"><HeartHandshake className="w-3 h-3" />{p.beneficiaries} served</span>}
                              {p.volunteers != null && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{p.volunteers} volunteers</span>}
                              {p.submitted_by && <span className="text-[#1A1815]/35">· {p.submitted_by}</span>}
                            </div>
                            {p.description && <p className="text-sm text-[#1A1815]/60 mt-2 line-clamp-2">{p.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {p.drive_folder_url && (
                              <a href={p.drive_folder_url} target="_blank" rel="noopener noreferrer" title="Open photos folder"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2D9DDB] hover:text-white hover:bg-[#2D9DDB] border border-[#2D9DDB]/30 rounded-lg px-2.5 py-1.5 transition-colors">
                                <FolderOpen className="w-3.5 h-3.5" /> Photos
                              </a>
                            )}
                            <button onClick={() => setEditing({ project: p, clubName: c.club_name })} title="Edit"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/45 hover:text-[#6D28D9] hover:bg-[#F5F3FF]">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteProject(p)} title="Delete"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/35 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Pending clubs */}
          {filteredPending.length > 0 && (
            <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-[#1A1815] inline-flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Not yet submitted
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{filteredPending.length}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {filteredPending.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 text-xs text-[#1A1815]/60 bg-[#1A1815]/4 border border-[#1A1815]/8 rounded-full px-3 py-1.5">
                    {c.club_type === 'college' ? <GraduationCap className="w-3 h-3 text-[#1A468F]" /> : <Building2 className="w-3 h-3 text-[#6D28D9]" />}
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {editing && (
        <AdminProjectDrawer
          project={editing.project}
          clubName={editing.clubName}
          onSaved={() => reload(false)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, color, tint }: { icon: React.ElementType; label: string; value: string | number; color: string; tint: string }) {
  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-4 shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
      <div className={`w-9 h-9 rounded-xl ${tint} flex items-center justify-center mb-3`}><Icon className="w-4.5 h-4.5" style={{ color }} /></div>
      <div className="text-2xl font-extrabold leading-none tabular-nums" style={{ color }}>{value}</div>
      <div className="mt-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[#1A1815]/50">{label}</div>
    </div>
  )
}
