'use client'

import {
  buildExecutiveSummary,
  buildHighlights,
  SOURCE_LABEL,
  type Completion,
  type MomMeeting,
  type MomStats,
  type MomUpdate,
  type UpdateSource,
} from '@/lib/mom'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MomPreview({
  meeting,
  updates,
  completion,
  stats,
}: {
  meeting: MomMeeting
  updates: MomUpdate[]
  completion: Completion
  stats: MomStats
}) {
  const bySource = (s: UpdateSource) => updates.filter((u) => u.source === s)
  const summary = buildExecutiveSummary(meeting, completion, stats)
  const highlights = buildHighlights(completion, stats)

  const allCohost = updates.flatMap((u) => u.cohost_proposals.map((p) => ({ ...p, from: u.source_ref })))
  const allUpcoming = updates
    .flatMap((u) => u.upcoming_projects.map((p) => ({ ...p, from: u.source_ref })))
    .sort((a, b) => (a.project_date ?? '9999').localeCompare(b.project_date ?? '9999'))
  const allActions = updates.flatMap((u) => u.action_items.map((p) => ({ ...p, from: u.source_ref })))

  const completionPct =
    completion.clubs.total > 0 ? Math.round((completion.clubs.done / completion.clubs.total) * 100) : 0

  return (
    <div className="mom-doc bg-white text-[#1A1815] max-w-3xl mx-auto">
      {/* 1. Cover */}
      <section className="text-center py-10 border-b-2 border-[#6D28D9]/20">
        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#6D28D9] mb-4">Rotaract District 3233</p>
        <h1 className="text-3xl font-extrabold leading-tight">{meeting.event?.name ?? 'DRC Meeting'}</h1>
        <p className="mt-2 text-lg text-[#1A1815]/70">Minutes of Meeting</p>
        <div className="mt-6 inline-flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-[#1A1815]/70">
          {meeting.meeting_number && <span><b>Meeting:</b> {meeting.meeting_number}</span>}
          <span><b>Date:</b> {fmtDate(meeting.event?.event_date)}</span>
          {(meeting.venue || meeting.event?.location) && <span><b>Venue:</b> {meeting.venue || meeting.event?.location}</span>}
          {meeting.chairperson && <span><b>Chairperson:</b> {meeting.chairperson}</span>}
        </div>
      </section>

      {/* 2. Executive summary */}
      <Block title="Executive Summary">
        <p className="text-[15px] leading-relaxed text-[#1A1815]/80">{summary}</p>
      </Block>

      {/* 3. Highlights */}
      <Block title="Meeting Highlights">
        <ul className="list-disc pl-5 space-y-1 text-[15px] text-[#1A1815]/80">
          {highlights.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      </Block>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
        <Stat label="Clubs Updated" value={`${completion.clubs.done}/${completion.clubs.total}`} />
        <Stat label="District Updates" value={completion.district.done} />
        <Stat label="Avenue Updates" value={completion.avenues.done} />
        <Stat label="Group Updates" value={completion.groups.done} />
        <Stat label="Completed" value={stats.completedProjects} />
        <Stat label="Upcoming" value={stats.upcomingProjects} />
        <Stat label="Co-host" value={stats.cohostProposals} />
        <Stat label="Action Items" value={stats.actionItems} />
      </div>

      {/* 4-7. Grouped updates */}
      {(['district', 'avenue', 'group', 'club'] as UpdateSource[]).map((src) => {
        const list = bySource(src)
        if (list.length === 0) return null
        return (
          <Block key={src} title={`${SOURCE_LABEL[src]} Updates`}>
            <div className="space-y-5">
              {list.map((u) => (
                <div key={u.id} className="border border-[#1A1815]/10 rounded-xl p-4">
                  <h4 className="font-bold text-[#6D28D9] mb-2">{u.source_ref}</h4>
                  {u.completed_projects.length > 0 && (
                    <MiniList label="Completed Projects" items={u.completed_projects.map((p) => `${p.project_name}${p.outcome ? ` — ${p.outcome}` : ''}`)} />
                  )}
                  {u.upcoming_projects.length > 0 && (
                    <MiniList label="Upcoming Projects" items={u.upcoming_projects.map((p) => `${p.project_name}${p.project_date ? ` (${fmtDate(p.project_date)})` : ''}`)} />
                  )}
                  {u.cohost_proposals.length > 0 && (
                    <MiniList label="Co-host Proposals" items={u.cohost_proposals.map((p) => p.project_name)} />
                  )}
                  {u.general_updates && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A1815]/45 mb-1">General</p>
                      <div className="text-sm text-[#1A1815]/75 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-[#6D28D9]" dangerouslySetInnerHTML={{ __html: u.general_updates }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Block>
        )
      })}

      {/* 8. Co-host board */}
      {allCohost.length > 0 && (
        <Block title="Co-host Opportunity Board">
          <Table
            head={['Project', 'From', 'Date', 'Venue', 'Clubs', 'Contact']}
            rows={allCohost.map((p) => [p.project_name, p.from, fmtDate(p.proposal_date), p.venue ?? '—', p.clubs_needed?.toString() ?? '—', p.contact_person ?? '—'])}
          />
        </Block>
      )}

      {/* 9. Upcoming events timeline */}
      {allUpcoming.length > 0 && (
        <Block title="Upcoming Events Calendar">
          <div className="space-y-2">
            {allUpcoming.map((p, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="shrink-0 w-24 text-xs font-bold text-[#6D28D9] pt-0.5">{fmtDate(p.project_date)}</div>
                <div className="border-l-2 border-[#6D28D9]/20 pl-4 pb-2">
                  <p className="font-semibold text-sm">{p.project_name}</p>
                  <p className="text-xs text-[#1A1815]/55">{p.from}{p.venue ? ` · ${p.venue}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* 10. Action items */}
      {allActions.length > 0 && (
        <Block title="Action Items">
          <Table
            head={['Task', 'From', 'Assigned', 'Due', 'Priority', 'Status']}
            rows={allActions.map((p) => [p.task, p.from, p.assigned_to ?? '—', fmtDate(p.due_date), p.priority, p.status])}
          />
        </Block>
      )}

      {/* 11. Analytics */}
      <Block title="Meeting Analytics">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Total Updates" value={stats.totalUpdates} />
          <Stat label="Total Projects" value={stats.completedProjects + stats.upcomingProjects} />
          <Stat label="Clubs Updated" value={stats.clubsUpdated} />
          <Stat label="Upcoming Events" value={stats.upcomingProjects} />
          <Stat label="Co-host Requests" value={stats.cohostProposals} />
          <Stat label="Completion" value={`${completionPct}%`} />
        </div>
      </Block>

      <footer className="text-center text-xs text-[#1A1815]/40 py-8 border-t border-[#1A1815]/10 mt-6">
        Generated by VIBE · Rotaract District 3233
      </footer>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 border-b border-[#1A1815]/8 break-inside-avoid">
      <h2 className="text-lg font-extrabold text-[#1A1815] mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#FAFAF9] border border-[#1A1815]/8 rounded-xl p-3 text-center break-inside-avoid">
      <div className="text-xl font-extrabold text-[#6D28D9] tabular-nums">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#1A1815]/50 mt-1">{label}</div>
    </div>
  )
}

function MiniList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A1815]/45 mb-0.5">{label}</p>
      <ul className="list-disc pl-5 text-sm text-[#1A1815]/75 space-y-0.5">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#FAFAF9] border-b border-[#1A1815]/10">
            {head.map((h) => <th key={h} className="text-left font-bold px-3 py-2 text-[#1A1815]/60 uppercase tracking-wide text-[10px]">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#1A1815]/6">
              {r.map((c, j) => <td key={j} className="px-3 py-2 align-top text-[#1A1815]/80">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
