'use client'

import { useMemo, useState } from 'react'
import { Search, Plus, Pencil, Trash2, Crown, Award, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { initialsFor, POSITION_LABEL, type ClubPosition } from '@/lib/clubs'
import MemberForm, { type ClubMember } from './MemberForm'

export default function MemberManager({
  clubId,
  members,
  onChanged,
}: {
  clubId: string
  members: ClubMember[]
  onChanged: () => void
}) {
  const [query, setQuery] = useState('')
  const [formFor, setFormFor] = useState<{ mode: 'add' } | { mode: 'edit'; member: ClubMember } | null>(null)
  const [posMenu, setPosMenu] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.avenue || '').toLowerCase().includes(q) ||
        (m.ri_id || '').toLowerCase().includes(q),
    )
  }, [members, query])

  const setPosition = async (memberId: string, position: ClubPosition) => {
    setPosMenu(null)
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ club_position: position }),
    })
    if (res.ok) { toast.success('Position updated'); onChanged() }
    else toast.error('Could not update position')
  }

  const removeMember = async (m: ClubMember) => {
    if (!confirm(`Remove ${m.full_name || 'this member'} from the club? Their account stays, but they'll be unassigned.`)) return
    const res = await fetch(`/api/admin/members/${m.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Removed from club'); onChanged() }
    else toast.error('Could not remove member')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/35" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, avenue, RI ID…"
            className="w-full bg-white border border-[#1A1815]/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/40" />
        </div>
        <button onClick={() => setFormFor({ mode: 'add' })}
          className="inline-flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-xl px-4 py-2.5 shrink-0">
          <Plus className="w-4 h-4" /> Add member
        </button>
      </div>

      <div className="bg-white border border-[#1A1815]/8 rounded-2xl overflow-visible">
        <ul className="divide-y divide-[#1A1815]/5">
          {filtered.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-[#FAFAF9]">
              <div className="w-9 h-9 rounded-full bg-[#6D28D9]/12 text-[#6D28D9] flex items-center justify-center text-xs font-bold shrink-0">{initialsFor(m.full_name)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1A1815] truncate">{m.full_name || '—'}</p>
                <p className="text-[11px] text-[#1A1815]/50 truncate">{[m.avenue, m.membership_type, m.email].filter(Boolean).join(' · ') || '—'}</p>
              </div>

              {typeof m.total_points === 'number' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#F58220] shrink-0"><Award className="w-3.5 h-3.5" />{m.total_points}</span>
              )}

              {m.club_position !== 'member' && (
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-[#F2A410]/15 text-[#9B6A00] shrink-0">{POSITION_LABEL[m.club_position]}</span>
              )}

              {/* Position menu */}
              <div className="relative shrink-0">
                <button onClick={() => setPosMenu(posMenu === m.id ? null : m.id)} title="Set position"
                  className="inline-flex items-center gap-0.5 text-xs text-[#1A1815]/55 hover:text-[#6D28D9] border border-[#1A1815]/10 hover:border-[#6D28D9]/30 rounded-lg px-2 py-1.5 transition-colors">
                  <Crown className="w-3.5 h-3.5" /><ChevronDown className="w-3 h-3" />
                </button>
                {posMenu === m.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPosMenu(null)} />
                    <div className="absolute right-0 mt-1 z-20 w-40 bg-white border border-[#1A1815]/10 rounded-xl shadow-xl overflow-hidden py-1">
                      {(['president', 'secretary', 'treasurer', 'member'] as ClubPosition[]).map((p) => (
                        <button key={p} onClick={() => setPosition(m.id, p)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F5F3FF] ${m.club_position === p ? 'text-[#6D28D9] font-semibold' : 'text-[#1A1815]'}`}>
                          {POSITION_LABEL[p]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button onClick={() => setFormFor({ mode: 'edit', member: m })} title="Edit"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/50 hover:text-[#6D28D9] hover:bg-[#F5F3FF] shrink-0"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => removeMember(m)} title="Remove from club"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#1A1815]/40 hover:text-red-600 hover:bg-red-50 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-[#1A1815]/45">
              {members.length === 0 ? 'No members yet — add the first one.' : 'No members match your search.'}
            </li>
          )}
        </ul>
      </div>

      {formFor && (
        <MemberForm
          clubId={clubId}
          existing={formFor.mode === 'edit' ? formFor.member : null}
          onSaved={onChanged}
          onCancel={() => setFormFor(null)}
        />
      )}
    </div>
  )
}
