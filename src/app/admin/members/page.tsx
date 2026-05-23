'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Pencil,
  Loader2,
  Mail,
  Phone,
  Hash,
  Briefcase,
  Building2,
  Award,
  CalendarCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

/* ── Types ───────────────────────────────────────────────────── */

type Member = {
  id: string
  full_name: string | null
  email: string | null
  designation: string | null
  club_name: string | null
  total_points: number | null
  ri_id: string | null
  phone_number: string | null
  created_at: string | null
  attendance_count: number
}

type EditForm = {
  full_name: string
  designation: string
  club_name: string
  ri_id: string
  phone_number: string
}

type SortKey = 'points' | 'name' | 'attendance' | 'club'

/* ── Helpers ─────────────────────────────────────────────────── */

function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-[#6D28D9]/12 text-[#6D28D9]',
  'bg-[#1A468F]/12 text-[#1A468F]',
  'bg-[#2D9DDB]/12 text-[#2D9DDB]',
  'bg-[#F2A410]/15 text-[#9B6A00]',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
]

function avatarColor(name: string | null) {
  const code = (name ?? 'X').charCodeAt(0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

/* ── Page ────────────────────────────────────────────────────── */

export default function MembersManagement() {
  const [members, setMembers] = useState<Member[]>([])
  const [clubs, setClubs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [clubFilter, setClubFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('points')

  // Edit dialog
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '', designation: '', club_name: '', ri_id: '', phone_number: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  /* ── Load ── */
  const load = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/members')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setMembers(data.members ?? [])
      setClubs(data.clubs ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  /* ── Filter / sort ── */
  const visible = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = members.filter((m) => {
      const matchClub = clubFilter === 'all' || m.club_name === clubFilter
      if (!matchClub) return false
      if (!q) return true
      return (
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.club_name?.toLowerCase().includes(q) ||
        m.designation?.toLowerCase().includes(q) ||
        m.ri_id?.toLowerCase().includes(q)
      )
    })

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'name':
          return (a.full_name ?? '').localeCompare(b.full_name ?? '')
        case 'attendance':
          return b.attendance_count - a.attendance_count
        case 'club':
          return (a.club_name ?? 'zzz').localeCompare(b.club_name ?? 'zzz')
        case 'points':
        default:
          return (b.total_points ?? 0) - (a.total_points ?? 0)
      }
    })
    return list
  }, [members, search, clubFilter, sort])

  /* ── Edit ── */
  const openEdit = (m: Member) => {
    setEditMember(m)
    setEditForm({
      full_name: m.full_name ?? '',
      designation: m.designation ?? '',
      club_name: m.club_name ?? '',
      ri_id: m.ri_id ?? '',
      phone_number: m.phone_number ?? '',
    })
  }

  const handleSave = async () => {
    if (!editMember) return
    if (!editForm.full_name.trim()) {
      toast.error('Full name is required')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/members/${editMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Member updated')
      setEditMember(null)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  /* ── Render ── */
  return (
    <div className="p-6 lg:p-10 space-y-6">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] mb-2">
            District 3233 · Members
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
            Member <span className="text-[#6D28D9]">directory.</span>
          </h1>
          <p className="mt-2 text-sm text-[#1A1815]/65 max-w-xl">
            {isLoading
              ? 'Loading members…'
              : `${members.length} members across ${clubs.length} club${clubs.length === 1 ? '' : 's'}.`}
          </p>
        </div>
      </header>

      {/* Filters bar */}
      <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-3 sm:p-4 shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, club, designation, RI ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1A1815] placeholder:text-[#1A1815]/40 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 focus:border-[#6D28D9]/40 transition-all"
            />
          </div>

          {/* Club filter */}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35 pointer-events-none" />
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-8 text-sm text-[#1A1815] appearance-none focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40"
            >
              <option value="all">All clubs ({members.length})</option>
              {clubs.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="relative min-w-[180px]">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-8 text-sm text-[#1A1815] appearance-none focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40"
            >
              <option value="points">Sort: Points (high → low)</option>
              <option value="attendance">Sort: Attendance count</option>
              <option value="name">Sort: Name (A → Z)</option>
              <option value="club">Sort: Club name</option>
            </select>
          </div>
        </div>

        {(search || clubFilter !== 'all') && (
          <div className="mt-3 text-xs text-[#1A1815]/50 flex items-center gap-2">
            Showing <span className="font-semibold text-[#1A1815]/75">{visible.length}</span>
            {search && <>· matching "<span className="font-medium">{search}</span>"</>}
            {clubFilter !== 'all' && <>· in <span className="font-medium">{clubFilter}</span></>}
            <button
              onClick={() => { setSearch(''); setClubFilter('all') }}
              className="ml-2 inline-flex items-center gap-1 text-[#6D28D9] hover:underline"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-16 text-center">
          <Users className="w-9 h-9 text-[#1A1815]/20 mx-auto mb-3" />
          <p className="text-sm text-[#1A1815]/55">No members match your filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(26,24,21,0.04)]">
          {/* Desktop header */}
          <div className="hidden md:grid md:grid-cols-[3rem_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_6rem_5rem_5rem] gap-4 px-5 py-3 bg-[#FAFAF9] border-b border-[#1A1815]/6 text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/45">
            <span>#</span>
            <span>Member</span>
            <span>Club / Role</span>
            <span>Contact</span>
            <span className="text-right">Points</span>
            <span className="text-right">Events</span>
            <span></span>
          </div>

          <ul className="divide-y divide-[#1A1815]/5">
            {visible.map((m, i) => {
              const av = avatarColor(m.full_name)
              return (
                <li
                  key={m.id}
                  className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[3rem_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_6rem_5rem_5rem] gap-3 md:gap-4 items-center px-4 md:px-5 py-3 hover:bg-[#FAFAF9] transition-colors"
                >
                  {/* Rank */}
                  <span className="hidden md:block text-xs font-bold text-[#1A1815]/30 tabular-nums">
                    {i + 1}
                  </span>

                  {/* Avatar + name + email */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${av}`}>
                      {initials(m.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#1A1815] truncate">
                        {m.full_name || '—'}
                      </p>
                      <p className="text-xs text-[#1A1815]/50 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 shrink-0" /> {m.email || '—'}
                      </p>
                      {/* Mobile-only club + role chip */}
                      <p className="md:hidden text-[11px] text-[#1A1815]/60 mt-1 truncate">
                        {m.club_name || 'No club'} · {m.designation || 'Member'}
                      </p>
                    </div>
                  </div>

                  {/* Club + designation (desktop) */}
                  <div className="hidden md:block min-w-0">
                    <p className="text-sm font-medium text-[#1A1815] truncate flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#6D28D9]/60 shrink-0" />
                      {m.club_name || '—'}
                    </p>
                    <p className="text-xs text-[#1A1815]/55 truncate flex items-center gap-1">
                      <Briefcase className="w-3 h-3 shrink-0" />
                      {m.designation || 'Member'}
                    </p>
                  </div>

                  {/* Contact (desktop) */}
                  <div className="hidden md:block min-w-0">
                    {m.phone_number && (
                      <p className="text-xs text-[#1A1815]/65 truncate flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        {m.phone_number}
                      </p>
                    )}
                    {m.ri_id && (
                      <p className="text-xs text-[#1A1815]/45 truncate flex items-center gap-1 font-mono">
                        <Hash className="w-3 h-3 shrink-0" />
                        {m.ri_id}
                      </p>
                    )}
                  </div>

                  {/* Points (desktop) */}
                  <div className="hidden md:block text-right">
                    <div className="inline-flex items-center gap-1 text-sm font-bold text-[#F2A410]">
                      <Award className="w-3.5 h-3.5" />
                      {m.total_points ?? 0}
                    </div>
                  </div>

                  {/* Attendance (desktop) */}
                  <div className="hidden md:block text-right">
                    <div className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A1815]/75">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                      {m.attendance_count}
                    </div>
                  </div>

                  {/* Edit button */}
                  <div className="flex justify-end md:justify-center md:col-span-1 col-start-3">
                    <button
                      onClick={() => openEdit(m)}
                      className="flex items-center gap-1 text-xs font-medium text-[#1A1815]/55 hover:text-[#6D28D9] hover:bg-[#6D28D9]/8 border border-transparent hover:border-[#6D28D9]/30 rounded-lg px-2 py-1.5 transition-all"
                      title="Edit member"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Edit</span>
                    </button>
                  </div>

                  {/* Mobile-only points & events row */}
                  <div className="md:hidden col-span-3 flex items-center gap-4 pt-2 border-t border-[#1A1815]/5 mt-1 text-xs">
                    <span className="flex items-center gap-1 text-[#F2A410] font-semibold">
                      <Award className="w-3.5 h-3.5" />
                      {m.total_points ?? 0} pts
                    </span>
                    <span className="flex items-center gap-1 text-[#1A1815]/65">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                      {m.attendance_count} events
                    </span>
                    {m.phone_number && (
                      <span className="flex items-center gap-1 text-[#1A1815]/50 ml-auto">
                        <Phone className="w-3 h-3" /> {m.phone_number}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Edit dialog ── */}
      {editMember && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setEditMember(null) }}
        >
          <div className="w-full max-w-md bg-white border border-[#1A1815]/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1A1815] text-lg">Edit member</h3>
              <button
                onClick={() => setEditMember(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/50 hover:text-[#1A1815] hover:bg-[#1A1815]/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Read-only email */}
              <div>
                <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/40 block mb-1">Email (read-only)</label>
                <div className="text-sm text-[#1A1815]/50 bg-[#FAFAF9] border border-[#1A1815]/8 rounded-xl px-3 py-2.5">
                  {editMember.email || '—'}
                </div>
              </div>

              <Input label="Full name *" value={editForm.full_name} onChange={(v) => setEditForm({ ...editForm, full_name: v })} />
              <Input label="Designation" value={editForm.designation} onChange={(v) => setEditForm({ ...editForm, designation: v })} placeholder="e.g. President, Secretary" />
              <Input label="Club name" value={editForm.club_name} onChange={(v) => setEditForm({ ...editForm, club_name: v })} placeholder="e.g. RAC Coimbatore" />

              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" value={editForm.phone_number} onChange={(v) => setEditForm({ ...editForm, phone_number: v })} placeholder="+91 …" />
                <Input label="RI ID" value={editForm.ri_id} onChange={(v) => setEditForm({ ...editForm, ri_id: v })} placeholder="12345678" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditMember(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#1A1815]/12 text-[#1A1815]/65 hover:text-[#1A1815] hover:bg-[#1A1815]/5 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/40 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#1A1815]/12 rounded-xl px-3 py-2.5 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40 focus:border-[#6D28D9]/40 transition-all"
      />
    </div>
  )
}
