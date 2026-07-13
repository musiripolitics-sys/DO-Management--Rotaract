'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Pencil, Users, Mail, Phone, Building2, GraduationCap,
  MapPin, Calendar, Globe, Check, LayoutDashboard, UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { initialsFor, type Club } from '@/lib/clubs'
import ClubDashboard from './_components/ClubDashboard'
import MemberManager from './_components/MemberManager'
import { type ClubMember } from './_components/MemberForm'

type Tab = 'dashboard' | 'members' | 'profile'

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Club>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/clubs/${id}`)
    if (!res.ok) { window.location.href = '/admin/clubs'; return }
    const d = await res.json()
    setClub(d.club)
    setMembers(d.members ?? [])
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  const saveClub = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/clubs/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Club updated'); setEditing(false); load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  if (loading || !club) {
    return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" /></div>
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <Link href="/admin/clubs" className="inline-flex items-center gap-1.5 text-sm text-[#1A1815]/55 hover:text-[#6D28D9]">
        <ArrowLeft className="w-4 h-4" /> All clubs
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${club.club_type === 'college' ? 'bg-[#1A468F]/10 text-[#1A468F]' : 'bg-[#6D28D9]/10 text-[#6D28D9]'}`}>
          {initialsFor(club.short_name || club.name)}
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1A1815]">{club.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ${club.club_type === 'college' ? 'bg-[#1A468F]/10 text-[#1A468F]' : 'bg-[#6D28D9]/10 text-[#6D28D9]'}`}>
              {club.club_type === 'college' ? <GraduationCap className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}{club.club_type}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ${club.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1A1815]/6 text-[#1A1815]/45'}`}>{club.status}</span>
            <span className="text-xs text-[#1A1815]/50">{members.length} members</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A1815]/5 rounded-xl p-1 w-fit">
        <TabBtn active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={LayoutDashboard}>Dashboard</TabBtn>
        <TabBtn active={tab === 'members'} onClick={() => setTab('members')} icon={UsersRound}>Members</TabBtn>
        <TabBtn active={tab === 'profile'} onClick={() => setTab('profile')} icon={Building2}>Profile</TabBtn>
      </div>

      {tab === 'dashboard' && <ClubDashboard clubId={id} />}

      {tab === 'members' && <MemberManager clubId={id} members={members} onChanged={load} />}

      {tab === 'profile' && (
        editing ? (
          <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#1A1815]">Edit club profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Ef label="Name"><input className={inp} value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Ef>
              <Ef label="Short name"><input className={inp} value={form.short_name ?? ''} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></Ef>
              <Ef label="Type">
                <select className={inp} value={form.club_type} onChange={(e) => setForm({ ...form, club_type: e.target.value as Club['club_type'] })}>
                  <option value="community">Community</option><option value="college">College</option>
                </select>
              </Ef>
              <Ef label="Status">
                <select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Club['status'] })}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </Ef>
              {form.club_type === 'college' && <Ef label="Institution"><input className={inp} value={form.institution_name ?? ''} onChange={(e) => setForm({ ...form, institution_name: e.target.value })} /></Ef>}
              <Ef label="Parent Rotary club"><input className={inp} value={form.parent_rotary_club ?? ''} onChange={(e) => setForm({ ...form, parent_rotary_club: e.target.value })} /></Ef>
              <Ef label="Charter number"><input className={inp} value={form.charter_number ?? ''} onChange={(e) => setForm({ ...form, charter_number: e.target.value })} /></Ef>
              <Ef label="Charter date"><input type="date" className={`${inp} [color-scheme:light]`} value={form.charter_date ?? ''} onChange={(e) => setForm({ ...form, charter_date: e.target.value })} /></Ef>
              <Ef label="Email"><input className={inp} value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Ef>
              <Ef label="Phone"><input className={inp} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Ef>
              <Ef label="Meeting venue"><input className={inp} value={form.meeting_venue ?? ''} onChange={(e) => setForm({ ...form, meeting_venue: e.target.value })} /></Ef>
              <Ef label="Meeting day"><input className={inp} value={form.meeting_day ?? ''} onChange={(e) => setForm({ ...form, meeting_day: e.target.value })} /></Ef>
              <Ef label="Meeting time"><input className={inp} value={form.meeting_time ?? ''} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} /></Ef>
              <Ef label="Website"><input className={inp} value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Ef>
              <Ef label="Instagram"><input className={inp} value={form.instagram ?? ''} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></Ef>
            </div>
            <Ef label="Description"><textarea rows={3} className={inp} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Ef>
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} disabled={saving} className="py-2.5 px-5 rounded-xl border border-[#1A1815]/12 text-[#1A1815]/65 hover:bg-[#1A1815]/5 text-sm">Cancel</button>
              <button onClick={saveClub} disabled={saving} className="py-2.5 px-5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setForm(club); setEditing(true) }} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6D28D9] border border-[#6D28D9]/30 hover:bg-[#F5F3FF] rounded-xl px-4 py-2">
                <Pencil className="w-4 h-4" /> Edit club
              </button>
            </div>
            <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <Info icon={GraduationCap} label="Institution" value={club.institution_name} />
              <Info icon={Building2} label="Parent Rotary club" value={club.parent_rotary_club} />
              <Info icon={Calendar} label="Charter" value={[club.charter_number, club.charter_date].filter(Boolean).join(' · ') || null} />
              <Info icon={Mail} label="Email" value={club.email} />
              <Info icon={Phone} label="Phone" value={club.phone} />
              <Info icon={MapPin} label="Meeting" value={[club.meeting_venue, club.meeting_day, club.meeting_time].filter(Boolean).join(' · ') || null} />
              <Info icon={Globe} label="Website" value={club.website} />
              {club.description && <div className="sm:col-span-2 text-sm text-[#1A1815]/70 pt-2 border-t border-[#1A1815]/6">{club.description}</div>}
            </div>
          </div>
        )
      )}
    </div>
  )
}

const inp = 'w-full bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2.5 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40'

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3.5 py-2 transition-colors ${active ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#1A1815]/55 hover:text-[#1A1815]'}`}>
      <Icon className="w-4 h-4" /> {children}
    </button>
  )
}
function Ef({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/45 block mb-1">{label}</label>{children}</div>
}
function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-[#6D28D9]/50 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A1815]/40">{label}</p>
        <p className="text-sm text-[#1A1815]/80 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}
