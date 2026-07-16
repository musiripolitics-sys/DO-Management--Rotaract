'use client'

import { useState } from 'react'
import { X, Loader2, FolderOpen, TriangleAlert, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AREAS_OF_FOCUS,
  PROJECT_AVENUES,
  PROJECT_GROUPS,
  isDriveUrl,
  periodLabel,
  type ClubProject,
} from '@/lib/projects'

type Form = {
  project_name: string
  group_no: string
  project_date: string
  end_date: string
  chairperson_name: string
  secretary_name: string
  venue: string
  man_hours: string
  beneficiaries: string
  volunteers: string
  avenue: string
  areas_of_focus: string[]
  description: string
  outcome: string
  drive_folder_url: string
  social_media_url: string
  is_joint_project: boolean
  joint_partner: string
}

function fromProject(p: ClubProject | null): Form {
  return {
    project_name: p?.project_name ?? '',
    group_no: p?.group_no ?? '',
    project_date: p?.project_date ?? '',
    end_date: p?.end_date ?? '',
    chairperson_name: p?.chairperson_name ?? '',
    secretary_name: p?.secretary_name ?? '',
    venue: p?.venue ?? '',
    man_hours: p?.man_hours != null ? String(p.man_hours) : '',
    beneficiaries: p?.beneficiaries != null ? String(p.beneficiaries) : '',
    volunteers: p?.volunteers != null ? String(p.volunteers) : '',
    avenue: p?.avenue ?? '',
    areas_of_focus: p?.areas_of_focus ?? [],
    description: p?.description ?? '',
    outcome: p?.outcome ?? '',
    drive_folder_url: p?.drive_folder_url ?? '',
    social_media_url: p?.social_media_url ?? '',
    is_joint_project: p?.is_joint_project ?? false,
    joint_partner: p?.joint_partner ?? '',
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
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const isEdit = !!existing
  const driveWarn = form.drive_folder_url.trim() !== '' && !isDriveUrl(form.drive_folder_url)

  const toggleFocus = (area: string) =>
    setForm((f) => ({
      ...f,
      areas_of_focus: f.areas_of_focus.includes(area)
        ? f.areas_of_focus.filter((a) => a !== area)
        : [...f.areas_of_focus, area],
    }))

  const save = async () => {
    if (!form.project_name.trim()) {
      toast.error('Project name is required')
      return
    }
    if (form.is_joint_project && !form.joint_partner.trim()) {
      toast.error('Add the host/co-host club name with district number')
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
            <p className="text-xs text-white/40 mt-0.5">
              Reporting {periodLabel(existing?.report_month ?? reportMonth)}
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className={lbl}>Name of project *</label>
            <input
              className={inp}
              value={form.project_name}
              onChange={(e) => set('project_name', e.target.value)}
              placeholder="e.g. Blood Donation Camp"
            />
          </div>

          {/* Group */}
          <div>
            <label className={lbl}>Group No</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set('group_no', form.group_no === g ? '' : g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.group_no === g
                      ? 'bg-[#6D28D9] border-[#6D28D9] text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Start / End dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Project start date</label>
              <input
                type="date"
                className={`${inp} [color-scheme:dark]`}
                value={form.project_date}
                onChange={(e) => set('project_date', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Project end date</label>
              <input
                type="date"
                className={`${inp} [color-scheme:dark]`}
                value={form.end_date}
                onChange={(e) => set('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* Chairperson / Secretary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Project chairperson</label>
              <input
                className={inp}
                value={form.chairperson_name}
                onChange={(e) => set('chairperson_name', e.target.value)}
                placeholder="Name"
              />
            </div>
            <div>
              <label className={lbl}>Project secretary</label>
              <input
                className={inp}
                value={form.secretary_name}
                onChange={(e) => set('secretary_name', e.target.value)}
                placeholder="Name"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className={lbl}>Venue / location</label>
            <input
              className={inp}
              value={form.venue}
              onChange={(e) => set('venue', e.target.value)}
              placeholder="Where it happened"
            />
          </div>

          {/* Man hours / Beneficiaries / Volunteers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Man hours</label>
              <input
                type="number"
                min="0"
                className={inp}
                value={form.man_hours}
                onChange={(e) => set('man_hours', e.target.value)}
                placeholder="Total"
              />
            </div>
            <div>
              <label className={lbl}>Beneficiaries</label>
              <input
                type="number"
                min="0"
                className={inp}
                value={form.beneficiaries}
                onChange={(e) => set('beneficiaries', e.target.value)}
                placeholder="Served"
              />
            </div>
            <div>
              <label className={lbl}>Volunteers</label>
              <input
                type="number"
                min="0"
                className={inp}
                value={form.volunteers}
                onChange={(e) => set('volunteers', e.target.value)}
                placeholder="Members"
              />
            </div>
          </div>

          {/* Avenue */}
          <div>
            <label className={lbl}>Project avenue</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_AVENUES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => set('avenue', form.avenue === a ? '' : a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.avenue === a
                      ? 'bg-[#2D9DDB] border-[#2D9DDB] text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Areas of focus */}
          <div>
            <label className={lbl}>Project area of focus</label>
            <div className="space-y-1.5">
              {AREAS_OF_FOCUS.map((area) => {
                const checked = form.areas_of_focus.includes(area)
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocus(area)}
                    className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      checked
                        ? 'bg-[#6D28D9]/15 border-[#6D28D9]/50 text-white'
                        : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        checked ? 'bg-[#6D28D9] border-[#6D28D9]' : 'border-white/25'
                      }`}
                    >
                      {checked && (
                        <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none">
                          <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {area}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Joint project */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-white">Is it a joint project?</label>
              <div className="flex gap-2">
                {[
                  ['Yes', true],
                  ['No', false],
                ].map(([label, val]) => (
                  <button
                    key={label as string}
                    type="button"
                    onClick={() => set('is_joint_project', val as boolean)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      form.is_joint_project === val
                        ? 'bg-[#6D28D9] border-[#6D28D9] text-white'
                        : 'bg-white/5 border-white/10 text-white/55 hover:text-white'
                    }`}
                  >
                    {label as string}
                  </button>
                ))}
              </div>
            </div>
            {form.is_joint_project && (
              <div>
                <label className={lbl}>Host / co-host club name with district number</label>
                <input
                  className={inp}
                  value={form.joint_partner}
                  onChange={(e) => set('joint_partner', e.target.value)}
                  placeholder="e.g. Rotaract Club of XYZ, RID 3233"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Project description</label>
            <textarea
              rows={3}
              className={inp}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What did the club do?"
            />
          </div>

          {/* Outcome */}
          <div>
            <label className={lbl}>Outcome / impact</label>
            <textarea
              rows={2}
              className={inp}
              value={form.outcome}
              onChange={(e) => set('outcome', e.target.value)}
              placeholder="Result or impact achieved"
            />
          </div>

          {/* Drive link */}
          <div>
            <label className={lbl}>Project pictures drive link</label>
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
                <TriangleAlert className="w-3 h-3" /> That doesn&apos;t look like a Google Drive link.
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-white/35">
                Paste your Drive folder link. Set sharing to &ldquo;Anyone with the link&rdquo;.
              </p>
            )}
          </div>

          {/* Social / branding link */}
          <div>
            <label className={lbl}>Project social media / branding link</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                className={`${inp} pl-10`}
                value={form.social_media_url}
                onChange={(e) => set('social_media_url', e.target.value)}
                placeholder="https://instagram.com/… or post link"
              />
            </div>
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
