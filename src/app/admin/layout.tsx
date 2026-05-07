'use client'

import { useEffect, useState } from 'react'
import { LogOut, LayoutDashboard, QrCode, CalendarPlus, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const isAdmin = document.cookie.split('; ').some((c) => c.startsWith('vibe_admin=1'))
    if (!isAdmin) {
      window.location.href = '/'
      return
    }
    const timer = setTimeout(() => setAuthorized(true), 0)
    return () => clearTimeout(timer)
  }, [])

  const handleSignOut = () => {
    document.cookie = 'vibe_admin=; path=/; max-age=0; SameSite=Lax'
    window.location.href = '/'
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Events', href: '/admin/events', icon: CalendarPlus },
    { name: 'Attendance', href: '/admin/attendance', icon: ClipboardList },
    { name: 'Scanner', href: '/admin/scanner', icon: QrCode },
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/50 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center bg-white rounded-lg px-2 py-1.5 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <img src="/vibe-logo.jpg" alt="Rotaract District 3233 VIBE Logo" className="h-7 w-auto" />
          </div>
          <span className="font-bold tracking-tight text-xl text-white/90">Admin</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-white/10 text-white font-medium' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </div>
              </Link>
            )
          })}
        </nav>

        <Button variant="ghost" className="justify-start text-white/60 hover:text-white hover:bg-white/5 mt-auto" onClick={handleSignOut}>
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-[#050505] to-[#0a0a0f] flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <footer className="w-full text-center py-4 text-white/40 text-xs mt-auto border-t border-white/5">
          Copyrights Rotaract District 3233.
        </footer>
      </main>
    </div>
  )
}
