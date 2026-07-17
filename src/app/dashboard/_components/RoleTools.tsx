'use client'

import Link from 'next/link'
import { QrCode, ClipboardList, UserPlus, BookMarked, Shield, ArrowRight, type LucideIcon } from 'lucide-react'

/* The personal home is the same for everyone — profile + QR + rank. Roles
 * with operational duties get a "Your Tools" strip here that links out to
 * their feature areas, so they navigate to their work from their own pass
 * rather than being dropped straight into it. */

type Tool = {
  name: string
  href: string
  icon: LucideIcon
  desc: string
  /* Primary tools get accent styling and lead the grid. */
  primary?: boolean
}

const SCAN_TOOLS: Tool[] = [
  { name: 'Scanner', href: '/admin/scanner', icon: QrCode, desc: 'Scan member passes to check them in', primary: true },
  { name: 'Attendance', href: '/admin/attendance', icon: ClipboardList, desc: 'View and manage event attendance', primary: true },
  { name: 'Requests', href: '/admin/registrations', icon: UserPlus, desc: 'Approve new member registrations' },
  { name: 'DRC', href: '/admin/drc', icon: BookMarked, desc: 'District council meeting bookings' },
]

const CHIEF_TEAM: Tool = {
  name: 'My Team',
  href: '/admin/sergeant-team',
  icon: Shield,
  desc: 'Manage your sergeant team',
}

/** Tools shown for a given role, in display order (primary first). */
export function toolsForRole(role: string): Tool[] {
  if (role === 'chief_sergeant') return [...SCAN_TOOLS, CHIEF_TEAM]
  if (role === 'sergeant') return SCAN_TOOLS
  return []
}

export default function RoleTools({ role }: { role: string }) {
  const tools = toolsForRole(role)
  if (tools.length === 0) return null

  return (
    <section aria-label="Your tools">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/50 mb-4">Your Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all ${
              t.primary
                ? 'border-[#6D28D9]/30 bg-gradient-to-br from-[#6D28D9]/15 to-[#2d9ddb]/[0.06] hover:border-[#6D28D9]/60'
                : 'border-white/10 bg-white/5 hover:bg-white/[0.08]'
            }`}
          >
            <div
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                t.primary ? 'bg-[#6D28D9] text-white' : 'bg-white/10 text-white/80'
              }`}
            >
              <t.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white text-sm">{t.name}</p>
              <p className="text-xs text-white/50 truncate">{t.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  )
}
