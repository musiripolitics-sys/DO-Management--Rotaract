'use client'

import { useState } from 'react'
import { Pencil, Trash2, Eye, Copy, ChevronDown } from 'lucide-react'
import { SOURCE_LABEL, type MomUpdate } from '@/lib/mom'

const SOURCE_COLOR: Record<string, string> = {
  district: 'bg-[#1A468F]/10 text-[#1A468F]',
  avenue: 'bg-[#F2A410]/15 text-[#9B6A00]',
  group: 'bg-[#2D9DDB]/12 text-[#1A6DA3]',
  club: 'bg-[#6D28D9]/10 text-[#6D28D9]',
}

export default function UpdateCard({
  update,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  update: MomUpdate
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const [open, setOpen] = useState(false)
  const counts = [
    update.completed_projects.length && `${update.completed_projects.length} completed`,
    update.upcoming_projects.length && `${update.upcoming_projects.length} upcoming`,
    update.cohost_proposals.length && `${update.cohost_proposals.length} co-host`,
    update.action_items.length && `${update.action_items.length} action`,
  ].filter(Boolean)

  return (
    <div className="bg-white border border-[#1A1815]/8 rounded-2xl shadow-[0_1px_2px_rgba(26,24,21,0.04)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full ${SOURCE_COLOR[update.source] ?? 'bg-[#1A1815]/6 text-[#1A1815]/60'}`}>
          {SOURCE_LABEL[update.source]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1A1815] truncate">{update.source_ref}</p>
          {counts.length > 0 && <p className="text-[11px] text-[#1A1815]/50 truncate">{counts.join(' · ')}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <IconBtn title="View" onClick={() => setOpen((v) => !v)}><Eye className="w-4 h-4" /></IconBtn>
          <IconBtn title="Edit" onClick={onEdit}><Pencil className="w-4 h-4" /></IconBtn>
          <IconBtn title="Duplicate" onClick={onDuplicate}><Copy className="w-4 h-4" /></IconBtn>
          <IconBtn title="Delete" onClick={onDelete} danger><Trash2 className="w-4 h-4" /></IconBtn>
          <button onClick={() => setOpen((v) => !v)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/40 hover:bg-[#1A1815]/5">
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1A1815]/6 px-4 py-3 space-y-3 text-sm bg-[#FAFAF9]">
          {update.completed_projects.length > 0 && (
            <DetailList label="Completed" items={update.completed_projects.map((p) => p.project_name)} />
          )}
          {update.upcoming_projects.length > 0 && (
            <DetailList label="Upcoming" items={update.upcoming_projects.map((p) => p.project_name)} />
          )}
          {update.cohost_proposals.length > 0 && (
            <DetailList label="Co-host" items={update.cohost_proposals.map((p) => p.project_name)} />
          )}
          {update.action_items.length > 0 && (
            <DetailList label="Actions" items={update.action_items.map((p) => p.task)} />
          )}
          {update.general_updates && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A1815]/45 mb-1">General</p>
              <div className="text-[#1A1815]/75 prose-sm [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-[#6D28D9]" dangerouslySetInnerHTML={{ __html: update.general_updates }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${danger ? 'text-[#1A1815]/40 hover:text-red-600 hover:bg-red-50' : 'text-[#1A1815]/50 hover:text-[#6D28D9] hover:bg-[#F5F3FF]'}`}>
      {children}
    </button>
  )
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A1815]/45 mb-1">{label}</p>
      <ul className="list-disc pl-5 text-[#1A1815]/75 space-y-0.5">
        {items.map((t, i) => <li key={i}>{t || '—'}</li>)}
      </ul>
    </div>
  )
}
