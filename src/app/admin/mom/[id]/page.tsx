'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Loader2,
  ListChecks,
  BarChart3,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SOURCE_LABEL,
  type Completion,
  type MomMeeting,
  type MomStats,
  type MomUpdate,
  type UpdateSource,
} from '@/lib/mom'
import UpdateForm from './_components/UpdateForm'
import UpdateCard from './_components/UpdateCard'
import MomPreview from './_components/MomPreview'
import PublishDialog from './_components/PublishDialog'

type Tab = 'updates' | 'review' | 'preview'

export default function MomBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [meeting, setMeeting] = useState<MomMeeting | null>(null)
  const [updates, setUpdates] = useState<MomUpdate[]>([])
  const [completion, setCompletion] = useState<Completion | null>(null)
  const [stats, setStats] = useState<MomStats | null>(null)
  const [clubs, setClubs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('updates')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MomUpdate | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [presidentCount, setPresidentCount] = useState(0)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/mom/${id}`)
    if (!res.ok) { window.location.href = '/admin/mom'; return }
    const d = await res.json()
    setMeeting(d.meeting)
    setUpdates(d.updates)
    setCompletion(d.completion)
    setStats(d.stats)
    setPresidentCount(d.presidentCount ?? 0)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    // distinct clubs for the searchable dropdown
    fetch('/api/member/list')
      .then((r) => r.json())
      .then((d) => {
        const set = new Set<string>()
        for (const m of d.members ?? []) if (m.club_name) set.add(m.club_name)
        setClubs(Array.from(set).sort())
      })
      .catch(() => {})
  }, [load])

  const openAdd = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (u: MomUpdate) => { setEditing(u); setFormOpen(true) }

  const handleDelete = async (u: MomUpdate) => {
    if (!confirm(`Delete the ${SOURCE_LABEL[u.source]} update from ${u.source_ref}?`)) return
    const res = await fetch(`/api/admin/mom/updates/${u.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Update deleted'); load() }
    else toast.error('Could not delete')
  }

  const handleDuplicate = async (u: MomUpdate) => {
    const res = await fetch(`/api/admin/mom/${id}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: u.source,
        source_ref: u.source_ref,
        general_updates: u.general_updates,
        completed_projects: u.completed_projects,
        upcoming_projects: u.upcoming_projects,
        cohost_proposals: u.cohost_proposals,
        action_items: u.action_items,
      }),
    })
    if (res.ok) { toast.success('Update duplicated'); load() }
    else toast.error('Could not duplicate')
  }

  const setPublish = async (status: 'draft' | 'published', notify = false) => {
    setPublishing(true)
    try {
      const res = await fetch(`/api/admin/mom/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notify }),
      })
      if (!res.ok) throw new Error()
      const d = await res.json()
      if (status !== 'published') toast.success('Reverted to draft')
      else if (!notify) toast.success('Published — no email sent')
      else if (d.emailed > 0) toast.success(`Published — emailed ${d.emailed} president${d.emailed === 1 ? '' : 's'}`)
      else toast.error(`Published, but the email failed: ${d.emailError ?? 'unknown error'}`, { duration: 8000 })
      setConfirmOpen(false)
      load()
    } catch {
      toast.error('Could not update status')
    } finally {
      setPublishing(false)
    }
  }

  if (loading || !meeting || !completion || !stats) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" />
      </div>
    )
  }

  const grouped = (['district', 'avenue', 'group', 'club'] as UpdateSource[]).map((s) => ({
    source: s,
    items: updates.filter((u) => u.source === s),
  }))

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="no-print">
        <Link href="/admin/mom" className="inline-flex items-center gap-1.5 text-sm text-[#1A1815]/55 hover:text-[#6D28D9] mb-3">
          <ArrowLeft className="w-4 h-4" /> All meetings
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1A1815]">
              {meeting.event?.name}
            </h1>
            <p className="text-sm text-[#1A1815]/60 mt-1">
              {meeting.meeting_number ? `Meeting ${meeting.meeting_number} · ` : ''}
              {meeting.venue || meeting.event?.location || 'No venue'}
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full ${meeting.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F2A410]/15 text-[#9B6A00]'}`}>
            {meeting.status}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-[#1A1815]/5 rounded-xl p-1 w-fit">
          <TabBtn active={tab === 'updates'} onClick={() => setTab('updates')} icon={ListChecks}>Updates</TabBtn>
          <TabBtn active={tab === 'review'} onClick={() => setTab('review')} icon={BarChart3}>Review</TabBtn>
          <TabBtn active={tab === 'preview'} onClick={() => setTab('preview')} icon={FileText}>Preview</TabBtn>
        </div>
      </div>

      {/* UPDATES TAB */}
      {tab === 'updates' && (
        <div className="no-print space-y-5">
          <button onClick={openAdd} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-xl px-4 py-2.5 shadow-[0_8px_24px_-10px_rgba(109,40,217,0.55)]">
            <Plus className="w-4 h-4" /> Add Update
          </button>

          {updates.length === 0 ? (
            <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-14 text-center">
              <ListChecks className="w-9 h-9 text-[#1A1815]/20 mx-auto mb-3" />
              <p className="text-sm text-[#1A1815]/55">No updates yet. Add the first update from a district official, avenue, group, or club.</p>
            </div>
          ) : (
            grouped.filter((g) => g.items.length > 0).map((g) => (
              <div key={g.source}>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#1A1815]/45 mb-2">
                  {SOURCE_LABEL[g.source]} · {g.items.length}
                </h3>
                <div className="space-y-2">
                  {g.items.map((u) => (
                    <UpdateCard key={u.id} update={u} onEdit={() => openEdit(u)} onDelete={() => handleDelete(u)} onDuplicate={() => handleDuplicate(u)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* REVIEW TAB */}
      {tab === 'review' && (
        <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ProgressCard label="Clubs Updated" done={completion.clubs.done} total={completion.clubs.total} hint="of registered clubs" />
          <ProgressCard label="Groups Updated" done={completion.groups.done} total={completion.groups.total} />
          <ProgressCard label="Avenues Updated" done={completion.avenues.done} total={completion.avenues.total} />
          <ProgressCard label="District Updated" done={completion.district.done} total={completion.district.total} />
          <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <MiniStat label="Completed Projects" value={stats.completedProjects} />
            <MiniStat label="Upcoming Projects" value={stats.upcomingProjects} />
            <MiniStat label="Co-host Proposals" value={stats.cohostProposals} />
            <MiniStat label="Action Items" value={stats.actionItems} />
          </div>
        </div>
      )}

      {/* PREVIEW TAB */}
      {tab === 'preview' && (
        <div>
          <div className="no-print flex flex-wrap gap-3 mb-5">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-xl px-4 py-2.5">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-[#1A1815]/12 hover:bg-[#1A1815]/5 text-[#1A1815] text-sm font-medium rounded-xl px-4 py-2.5">
              <Printer className="w-4 h-4" /> Print
            </button>
            {meeting.status === 'draft' ? (
              <button onClick={() => setConfirmOpen(true)} disabled={publishing} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl px-4 py-2.5">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Publish</>}
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 text-sm font-medium rounded-xl px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4" /> Published
                <button onClick={() => setPublish('draft')} className="ml-2 text-[#1A1815]/50 hover:text-[#1A1815] underline text-xs">revert</button>
              </div>
            )}
          </div>
          <div className="mom-print-area bg-white border border-[#1A1815]/8 rounded-2xl p-6 sm:p-10 shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
            <MomPreview meeting={meeting} updates={updates} completion={completion} stats={stats} />
          </div>
        </div>
      )}

      {formOpen && (
        <UpdateForm
          momId={id}
          clubs={clubs}
          existing={editing}
          onSaved={load}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {confirmOpen && (
        <PublishDialog
          presidentCount={presidentCount}
          publishing={publishing}
          onCancel={() => setConfirmOpen(false)}
          onPublish={(notify) => setPublish('published', notify)}
        />
      )}

      {/* Print: show only the MoM document */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .mom-print-area, .mom-print-area * { visibility: visible !important; }
          .mom-print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3.5 py-2 transition-colors ${active ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#1A1815]/55 hover:text-[#1A1815]'}`}>
      <Icon className="w-4 h-4" /> {children}
    </button>
  )
}

function ProgressCard({ label, done, total, hint }: { label: string; done: number; total: number; hint?: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#1A1815]">{label}</h3>
        <span className="text-lg font-extrabold text-[#6D28D9] tabular-nums">{done}/{total}</span>
      </div>
      <div className="h-2.5 bg-[#1A1815]/6 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-[#6D28D9] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-[#1A1815]/45 mt-1.5">{pct}% {hint || 'complete'}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-xl p-4 text-center">
      <div className="text-2xl font-extrabold text-[#1A1815] tabular-nums">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#1A1815]/50 mt-1">{label}</div>
    </div>
  )
}
