'use client'

import { useEffect, useState } from 'react'
import {
  LogOut,
  LayoutDashboard,
  QrCode,
  CalendarPlus,
  ClipboardList,
  Users,
  BookMarked,
  FileText,
  Shield,
  UsersRound,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  // "admin" = full admin; "secretariat" = DRS/ADRS (MoM + read-only oversight);
  // "chief" = chief sergeant (team + scan); "sergeant" = scan only
  const [role, setRole] = useState<'admin' | 'secretariat' | 'chief' | 'sergeant' | null>(null)

  useEffect(() => {
    fetch('/api/auth/me?t=' + Date.now())
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated || (!d.canAdmin && !d.canScan && !d.canMom)) {
          window.location.href = '/'
          return
        }
        const uiRole: 'admin' | 'secretariat' | 'chief' | 'sergeant' = d.canAdmin
          ? 'admin'
          : d.canMom
          ? 'secretariat'
          : d.canManageSergeants
          ? 'chief'
          : 'sergeant'
        setAuthorized(true)
        setRole(uiRole)

        if (uiRole === 'sergeant' || uiRole === 'chief') {
          // Sergeants: scanner/attendance/DRC. Chief also gets the team page.
          const base =
            pathname.startsWith('/admin/scanner') ||
            pathname.startsWith('/admin/attendance') ||
            pathname.startsWith('/admin/drc')
          const allowed = base || (uiRole === 'chief' && pathname.startsWith('/admin/sergeant-team'))
          if (!allowed) router.replace(uiRole === 'chief' ? '/admin/sergeant-team' : '/admin/scanner')
        } else if (uiRole === 'secretariat') {
          // DRS/ADRS: MoM (manage) + read-only Overview, DRC, Attendance
          const allowed =
            pathname === '/admin' ||
            pathname.startsWith('/admin/mom') ||
            pathname.startsWith('/admin/drc') ||
            pathname.startsWith('/admin/attendance')
          if (!allowed) router.replace('/admin/mom')
        }
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [pathname, router])

  const handleSignOut = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/'
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#6D28D9] border-t-transparent rounded-full" />
      </div>
    )
  }

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'secretariat'] },
    { name: 'Events', href: '/admin/events', icon: CalendarPlus, roles: ['admin'] },
    { name: 'Members', href: '/admin/members', icon: Users, roles: ['admin'] },
    { name: 'MoM', href: '/admin/mom', icon: FileText, roles: ['admin', 'secretariat'] },
    { name: 'Teams', href: '/admin/teams', icon: UsersRound, roles: ['admin'] },
    { name: 'My Team', href: '/admin/sergeant-team', icon: Shield, roles: ['chief'] },
    { name: 'DRC', href: '/admin/drc', icon: BookMarked, roles: ['admin', 'secretariat', 'chief', 'sergeant'] },
    { name: 'Attendance', href: '/admin/attendance', icon: ClipboardList, roles: ['admin', 'secretariat', 'chief', 'sergeant'] },
    { name: 'Scanner', href: '/admin/scanner', icon: QrCode, roles: ['admin', 'chief', 'sergeant'] },
  ].filter(item => role && item.roles.includes(role))

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1A1815] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-[#1A1815]/8 bg-white p-6 flex flex-col md:sticky md:top-0 md:h-screen">
        <Link href="/admin" className="flex items-center gap-3 mb-10">
          <Image
            src="/vibe-logo.jpg"
            alt="Rotaract District 3233 — VIBE"
            width={2480}
            height={610}
            priority
            className="h-9 w-auto"
          />
          <span className="hidden md:inline-flex text-[10px] font-semibold tracking-[0.2em] uppercase text-[#6D28D9] bg-[#6D28D9]/10 rounded-full px-2 py-0.5">
            {role === 'sergeant'
              ? 'Sergeant'
              : role === 'chief'
              ? 'Chief Sergeant'
              : role === 'secretariat'
              ? 'Secretariat'
              : 'Admin'}
          </span>
        </Link>

        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#6D28D9] text-white shadow-[0_8px_24px_-10px_rgba(109,40,217,0.55)]'
                      : 'text-[#1A1815]/70 hover:bg-[#F5F3FF] hover:text-[#6D28D9]'
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#1A1815]/65 hover:bg-[#1A1815]/5 hover:text-[#1A1815] transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#FAFAF9] flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="w-full text-center py-4 text-[#1A1815]/40 text-xs border-t border-[#1A1815]/6 bg-white">
          © {new Date().getFullYear()} Rotaract District 3233 — VIBE Admin
        </footer>
      </main>
    </div>
  )
}
