'use client'

import { useState } from 'react'
import { X, Loader2, FolderOpen, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { AVENUES } from '@/lib/mom'
import { isDriveUrl, periodLabel, type ClubProject } from '@/lib/projects'

type Form = {
  project_name: string
  project_date: string
  avenue: string
  venue: string
  beneficiaries: string
  volunteers: string
  description: string
  outcome: string
  drive_folder_url: string
}

function fromProject(p: ClubProject | null): Form {
  return {
    project_name: p?.project_name ?? '',
    project_date: p?.project_date ?? '',
    avenue: p?.avenue ?? '',
    venue: p?.venue ?? '',
    beneficiaries: p?.beneficiaries != null ? String(p.beneficiaries) : '',
    volunteers: p?.volunteers != null ? String(p.volunteers) : '',
    description: p?.description ?? '',
    outcome: p?.outcome ?? '',
    drive_folder_url: p?.drive_folder_url ?? '',
  }
}

const inp =
  'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/50 transition-all'
const lbl = 'text-[11px] uppercase tracking-[0.15em] text-white/50 font-semibold block mb-1.5'

export default function ProjectDrawer({
  reportMonth,
  existing,
  onSaved,
  onClose,
}: {
  reportMonth: string
  existing: ClubProject | null
  onSaved: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Form>(fromProject(existing))
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const isEdit = !!existing
  const driveWarn = form.drive_folder_url.trim() !== '' && !isDriveUrl(form.drive_folder_url)

  const save = async () => {
    if (!form.project_name.trim()) {
      toast.error('Project name is required')
      return
    }
    setSaving(true)
    try {
      const url = isEdit ? `/api/secretary/projects/${existing.id}` : '/api/secretary/projects'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, report_month: existing?.report_month ?? reportMonth }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      toast.success(isEdit ? 'Project updated' : 'Project added')
      onSaved()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div className="w-full max-w-lg h-full bg-[#0b0b0f] border-l border-white/10 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0b0b0f] border-b border-white/8 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit project' : 'Add project'}</h2>
            <p className="text-xs text-white/40 mt-0.5">Reporting {periodLabel(existing?.report_month ?? reportMonth)}</p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className={lbl}>Project name *</label>
            <input className={inp} value={form.project_name} onChange={(e) => set('project_name', e.target.value)} placeholder="e.g. Blood Donation Camp" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Project date</label>
              <input type="date" className={`${inp} [color-scheme:dark]`} value={form.project_date} onChange={(e) => set('project_date', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Avenue</label>
              <select className={inp} value={form.avenue} onChange={(e) => set('avenue', e.target.value)}>
                <option value="" className="bg-[#0b0b0f]">—</option>
                {AVENUES.map((a) => (
                  <option key={a} value={a} className="bg-[#0b0b0f]">{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Venue / location</label>
            <input className={inp} value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Where it happened" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Beneficiaries</label>
              <input type="number" min="0" className={inp} value={form.beneficiaries} onChange={(e) => set('beneficiaries', e.target.value)} placeholder="People served" />
            </div>
            <div>
              <label className={lbl}>Volunteers</label>
              <input type="number" min="0" className={inp} value={form.volunteers} onChange={(e) => set('volunteers', e.target.value)} placeholder="Members involved" />
            </div>
          </div>

          <div>
            <label className={lbl}>Description</label>
            <textarea rows={3} className={inp} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What did the club do?" />
          </div>

          <div>
            <label className={lbl}>Outcome / impact</label>
            <textarea rows={2} className={inp} value={form.outcome} onChange={(e) => set('outcome', e.target.value)} placeholder="Result or impact achieved" />
          </div>

          <div>
            <label className={lbl}>Google Drive photos folder</label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                className={`${inp} pl-10`}
                value={form.drive_folder_url}
                onChange={(e) => set('drive_folder_url', e.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
              />
            </div>
            {driveWarn ? (
              <p className="mt-1.5 text-[11px] text-amber-400/90 inline-flex items-center gap-1">
                <TriangleAlert className="w-3 h-3" /> That doesn't look like a Google Drive link.
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-white/35">
                Paste your Drive folder link. Set sharing to "Anyone with the link". No photo uploads here.
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-[#0b0b0f] border-t border-white/8 px-6 py-4 flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save changes' : 'Add project'}
          </button>
          <button
            onClick={() => !saving && onClose()}
            className="py-2.5 px-5 rounded-xl border border-white/12 text-white/65 hover:text-white hover:border-white/25 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
