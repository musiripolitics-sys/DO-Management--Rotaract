'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Search,
  Filter,
  Loader2,
  Plus,
  Users,
  GraduationCap,
  Users2,
  ChevronRight,
  Crown,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { CLUB_TYPES, initialsFor } from '@/lib/clubs'

type ClubRow = {
  id: string
  name: string
  short_name: string | null
  club_type: 'college' | 'community'
  parent_rotary_club: string | null
  institution_name: string | null
  status: 'active' | 'inactive'
  member_count: number
  officers: { president?: string; secretary?: string; treasurer?: string }
}

export default function ClubsDirectoryPage() {
  const router = useRouter()
  const [clubs, setClubs] = useState<ClubRow[] | null>(null)
  const [parents, setParents] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'college' | 'community'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sort, setSort] = useState<'name' | 'members'>('name')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', short_name: '', club_type: 'community', institution_name: '', parent_rotary_club: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/admin/clubs')
      .then((r) => r.json())
      .then((d) => {
        if (d?.clubs) { setClubs(d.clubs); setParents(d.parents ?? []) }
        else setError(d?.error || 'Could not load clubs')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Network error'))
  }
  useEffect(() => { load() }, [])

  const visible = useMemo(() => {
    if (!clubs) return []
    const q = search.trim().toLowerCase()
    let list = clubs.filter((c) => {
      if (typeFilter !== 'all' && c.club_type !== typeFilter) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        (c.short_name || '').toLowerCase().includes(q) ||
        (c.parent_rotary_club || '').toLowerCase().includes(q)
      )
    })
    list = [...list].sort((a, b) =>
      sort === 'members' ? b.member_count - a.member_count : a.name.localeCompare(b.name),
    )
    return list
  }, [clubs, search, typeFilter, statusFilter, sort])

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Club name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create club')
      router.push(`/admin/clubs/${data.club.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create club')
      setSaving(false)
    }
  }

  const counts = useMemo(() => ({
    total: clubs?.length ?? 0,
    college: clubs?.filter((c) => c.club_type === 'college').length ?? 0,
    community: clubs?.filter((c) => c.club_type === 'community').length ?? 0,
  }), [clubs])

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] mb-2">District 3233 · Clubs</p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
            Club <span className="text-[#6D28D9]">directory.</span>
          </h1>
          <p className="mt-2 text-sm text-[#1A1815]/65">
            {clubs ? `${counts.total} clubs — ${counts.college} college, ${counts.community} community.` : 'Loading clubs…'}
          </p>
        </div>
        <button onClick={() => { setForm({ name: '', short_name: '', club_type: 'community', institution_name: '', parent_rotary_club: '' }); setCreateOpen(true) }}
          className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-xl px-4 py-2.5 shadow-[0_8px_24px_-10px_rgba(109,40,217,0.55)]">
          <Plus className="w-4 h-4" /> Create Club
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-3 sm:p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search club, short name, parent club…"
            className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40" />
        </div>
        <div className="relative min-w-[150px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="w-full bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40">
            <option value="all">All types</option>
            {CLUB_TYPES.map((t) => <option key={t} value={t}>{t === 'college' ? 'College' : 'Community'}</option>)}
          </select>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="min-w-[130px] bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl py-2.5 px-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
          className="min-w-[150px] bg-[#FAFAF9] border border-[#1A1815]/10 rounded-xl py-2.5 px-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40">
          <option value="name">Sort: Name</option>
          <option value="members">Sort: Members</option>
        </select>
      </div>

      {!clubs && !error && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" /></div>}
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4">{error}</div>}

      {clubs && (
        <>
          {(search || typeFilter !== 'all' || statusFilter !== 'all') && (
            <p className="text-xs text-[#1A1815]/50">Showing <b>{visible.length}</b> of {clubs.length}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((c) => (
              <button key={c.id} onClick={() => router.push(`/admin/clubs/${c.id}`)}
                className="group text-left bg-white border border-[#1A1815]/8 rounded-2xl p-5 shadow-[0_1px_2px_rgba(26,24,21,0.04)] hover:border-[#6D28D9]/40 hover:shadow-[0_12px_32px_-18px_rgba(26,24,21,0.18)] transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${c.club_type === 'college' ? 'bg-[#1A468F]/10 text-[#1A468F]' : 'bg-[#6D28D9]/10 text-[#6D28D9]'}`}>
                    {initialsFor(c.short_name || c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-[#1A1815] leading-snug group-hover:text-[#6D28D9] transition-colors truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full ${c.club_type === 'college' ? 'bg-[#1A468F]/10 text-[#1A468F]' : 'bg-[#6D28D9]/10 text-[#6D28D9]'}`}>
                        {c.club_type === 'college' ? <GraduationCap className="w-2.5 h-2.5" /> : <Users2 className="w-2.5 h-2.5" />}
                        {c.club_type}
                      </span>
                      {c.status === 'inactive' && <span className="text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full bg-[#1A1815]/6 text-[#1A1815]/45">inactive</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#1A1815]/20 group-hover:text-[#6D28D9] transition-colors shrink-0" />
                </div>
                <div className="flex items-center justify-between text-xs text-[#1A1815]/60 pt-3 border-t border-[#1A1815]/6">
                  <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#6D28D9]/60" /> {c.member_count} member{c.member_count === 1 ? '' : 's'}</span>
                  {c.officers.president && (
                    <span className="inline-flex items-center gap-1 truncate max-w-[55%]"><Crown className="w-3 h-3 text-[#F2A410]" /> <span className="truncate">{c.officers.president}</span></span>
                  )}
                </div>
              </button>
            ))}
          </div>
          {visible.length === 0 && (
            <div className="bg-white border border-[#1A1815]/8 rounded-2xl p-14 text-center">
              <Building2 className="w-9 h-9 text-[#1A1815]/20 mx-auto mb-3" />
              <p className="text-sm text-[#1A1815]/55">No clubs match your filters.</p>
            </div>
          )}
        </>
      )}

      {/* Create dialog */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget && !saving) setCreateOpen(false) }}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#1A1815]">Create club</h3>
              <button onClick={() => !saving && setCreateOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/50 hover:bg-[#1A1815]/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Club name *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rotaract Club of …" className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Short name"><input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} placeholder="RAC …" className={inputCls} /></Field>
                <Field label="Type">
                  <select value={form.club_type} onChange={(e) => setForm({ ...form, club_type: e.target.value })} className={inputCls}>
                    <option value="community">Community</option>
                    <option value="college">College</option>
                  </select>
                </Field>
              </div>
              {form.club_type === 'college' && (
                <Field label="Institution"><input value={form.institution_name} onChange={(e) => setForm({ ...form, institution_name: e.target.value })} placeholder="College name" className={inputCls} /></Field>
              )}
              <Field label="Parent Rotary club"><input value={form.parent_rotary_club} onChange={(e) => setForm({ ...form, parent_rotary_club: e.target.value })} placeholder="Rotary Club of …" className={inputCls} /></Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCreateOpen(false)} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-[#1A1815]/12 text-[#1A1815]/65 hover:bg-[#1A1815]/5 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full bg-white border border-[#1A1815]/15 rounded-xl px-3 py-2.5 text-sm text-[#1A1815] placeholder:text-[#1A1815]/35 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#1A1815]/45 block mb-1">{label}</label>
      {children}
    </div>
  )
}
