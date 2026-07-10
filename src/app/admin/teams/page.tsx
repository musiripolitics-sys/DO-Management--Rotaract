'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Loader2,
  ChevronRight,
  Shield,
  Megaphone,
  Palette,
  Database,
  Droplet,
  Newspaper,
  Camera,
  Crown,
  HeartHandshake,
  Handshake,
  Briefcase,
  Globe,
  Layers,
  Gavel,
  UsersRound,
} from 'lucide-react'
import { SECTION_ORDER } from '@/lib/teams'

type TeamSummary = { key: string; label: string; section: string; count: number }

const ICONS: Record<string, React.ElementType> = {
  leadership: Crown,
  sergeant: Shield,
  'club-service': Handshake,
  'community-service': HeartHandshake,
  'professional-service': Briefcase,
  'international-service': Globe,
  pro: Megaphone,
  creatives: Palette,
  database: Database,
  'blood-donation': Droplet,
  editorial: Newspaper,
  photography: Camera,
  groups: Layers,
  chairpersons: Gavel,
  other: UsersRound,
}

export default function TeamsDirectoryPage() {
  const [teams, setTeams] = useState<TeamSummary[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/teams')
      .then((r) => r.json())
      .then((d) => {
        if (d?.teams) { setTeams(d.teams); setTotal(d.total) }
        else setError(d?.error || 'Could not load teams')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Network error'))
  }, [])

  const bySection = useMemo(() => {
    const map = new Map<string, TeamSummary[]>()
    for (const t of teams ?? []) {
      const list = map.get(t.section) ?? []
      list.push(t)
      map.set(t.section, list)
    }
    return SECTION_ORDER.filter((s) => map.has(s)).map((s) => ({
      section: s,
      teams: (map.get(s) ?? []).sort((a, b) => b.count - a.count),
    }))
  }, [teams])

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] mb-2">
          District 3233 · Teams
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1815]">
          District <span className="text-[#6D28D9]">teams.</span>
        </h1>
        <p className="mt-2 text-sm text-[#1A1815]/65 max-w-xl">
          {teams ? `${total} district officials across ${teams.length} teams.` : 'Every district team — tap a team to see its members.'}
        </p>
      </header>

      {!teams && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-[#6D28D9]/60 animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4">{error}</div>
      )}

      {bySection.map(({ section, teams: list }) => (
        <div key={section}>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#1A1815]/45 mb-3">{section}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((t) => {
              const Icon = ICONS[t.key] ?? Users
              return (
                <Link
                  key={t.key}
                  href={`/admin/teams/${t.key}`}
                  className="group bg-white border border-[#1A1815]/8 rounded-2xl p-5 shadow-[0_1px_2px_rgba(26,24,21,0.04)] hover:border-[#6D28D9]/40 hover:shadow-[0_12px_32px_-18px_rgba(26,24,21,0.18)] transition-all flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#F5F3FF] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#6D28D9]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1A1815] leading-tight group-hover:text-[#6D28D9] transition-colors truncate">
                      {t.label}
                    </p>
                    <p className="text-xs text-[#1A1815]/55 mt-0.5">
                      {t.count} member{t.count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#1A1815]/25 group-hover:text-[#6D28D9] transition-colors shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
