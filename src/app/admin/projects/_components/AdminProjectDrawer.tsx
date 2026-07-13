'use client'

import { useState } from 'react'
import { X, Loader2, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { AVENUES } from '@/lib/mom'

export type AdminProject = {
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
}

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

const inp =
  'w-full bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2.5 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40'
const lbl = 'text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/45 block mb-1'

export default function AdminProjectDrawer({
  project,
  clubName,
  onSaved,
  onClose,
}: {
  project: AdminProject
  clubName: string
  onSaved: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Form>({
    project_name: project.project_name,
    project_date: project.project_date ?? '',
    avenue: project.avenue ?? '',
    venue: project.venue ?? '',
    beneficiaries: project.beneficiaries != null ? String(project.beneficiaries) : '',
    volunteers: project.volunteers != null ? String(project.volunteers) : '',
    description: project.description ?? '',
    outcome: project.outcome ?? '',
    drive_folder_url: project.drive_folder_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.project_name.trim()) {
      toast.error('Project name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      toast.success('Project updated')
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
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div className="w-full max-w-lg h-full bg-[#FAFAF9] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-[#1A1815]/8 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1815]">Edit project</h2>
            <p className="text-xs text-[#1A1815]/45 mt-0.5">{clubName}</p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/50 hover:bg-[#1A1815]/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={lbl}>Project name *</label>
            <input className={inp} value={form.project_name} onChange={(e) => set('project_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Project date</label>
              <input type="date" className={`${inp} [color-scheme:light]`} value={form.project_date} onChange={(e) => set('project_date', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Avenue</label>
              <select className={inp} value={form.avenue} onChange={(e) => set('avenue', e.target.value)}>
                <option value="">—</option>
                {AVENUES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Venue</label>
            <input className={inp} value={form.venue} onChange={(e) => set('venue', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Beneficiaries</label>
              <input type="number" min="0" className={inp} value={form.beneficiaries} onChange={(e) => set('beneficiaries', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Volunteers</label>
              <input type="number" min="0" className={inp} value={form.volunteers} onChange={(e) => set('volunteers', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea rows={3} className={inp} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Outcome / impact</label>
            <textarea rows={2} className={inp} value={form.outcome} onChange={(e) => set('outcome', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Google Drive photos folder</label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/30" />
              <input className={`${inp} pl-10`} value={form.drive_folder_url} onChange={(e) => set('drive_folder_url', e.target.value)} placeholder="https://drive.google.com/…" />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#1A1815]/8 px-6 py-4 flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
          </button>
          <button
            onClick={() => !saving && onClose()}
            className="py-2.5 px-5 rounded-xl border border-[#1A1815]/12 text-[#1A1815]/65 hover:bg-[#1A1815]/5 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
