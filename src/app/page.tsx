'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Zap, Trophy, Calendar, MapPin, Clock, Users, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

const ADMIN_USERNAME = 'Kumar'
const ADMIN_PASSWORD = '1234098'

type UpcomingEvent = {
  id: string
  name: string
  location: string | null
  event_date: string
  start_time: string
}

type LeaderboardEntry = {
  full_name: string | null
  club_name: string | null
  total_points: number | null
}

type HomeData = {
  upcomingEvents: UpcomingEvent[]
  leaderboard: LeaderboardEntry[]
  memberCount: number
}

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [home, setHome] = useState<HomeData | null>(null)

  useEffect(() => {
    fetch('/api/public/home')
      .then((r) => r.json())
      .then((d) => {
        if (d?.upcomingEvents) setHome(d)
      })
      .catch(() => {})
  }, [])

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')

      toast.success(`Welcome back, ${data.member?.full_name || email}!`)
      window.location.href = '/dashboard'
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminUsername === ADMIN_USERNAME && adminPassword === ADMIN_PASSWORD) {
      document.cookie = `vibe_admin=1; path=/; max-age=86400; SameSite=Lax`
      toast.success('Admin authenticated')
      window.location.href = '/admin'
    } else {
      toast.error('Invalid admin credentials')
    }
  }

  const formatDate = (date: string, time: string) => {
    const d = new Date(time)
    return `${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white overflow-hidden selection:bg-[#e0165c]/30">
      <div className="absolute top-0 -left-1/4 w-[150%] h-[1000px] bg-gradient-to-br from-[#1a468f]/20 via-[#2d9ddb]/10 to-transparent blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[40%] -right-1/4 w-[100%] h-[800px] bg-gradient-to-tl from-[#f58220]/10 via-[#e0165c]/10 to-transparent blur-[100px] rounded-full pointer-events-none -z-10" />

      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex font-extrabold text-2xl tracking-tight bg-white rounded-lg px-3 py-1 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <span className="text-[#1a468f]">V</span>
            <span className="text-[#e0165c]">I</span>
            <span className="text-[#2d9ddb]">B</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fab616] to-[#f58220]">E</span>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2">
          <div className="text-sm font-medium text-white/50 tracking-widest">DISTRICT 3233</div>
          <button
            onClick={() => setAdminDialogOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 rounded-full px-3 py-1 transition-colors"
          >
            <Shield className="w-3 h-3" />
            Admin Login
          </button>
        </div>
      </nav>

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="bg-[#0f0f13] border-white/10 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#2d9ddb]" />
              Admin Login
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Restricted access. Enter admin credentials to continue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdminLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="admin-username" className="text-white/70">Username</Label>
              <Input
                id="admin-username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="bg-black/50 border-white/10 text-white"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-white/70">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="bg-black/50 border-white/10 text-white"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-[#1a468f] to-[#2d9ddb] hover:opacity-90 text-white font-semibold border-0 mt-2">
              Sign in as Admin
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 flex items-center justify-center relative z-10 py-6 lg:py-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16 w-full">
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#2d9ddb] mb-4 lg:mb-6"
            >
              <Zap className="w-4 h-4 text-[#fab616]" />
              <span>VISION • INNOVATE • BELIEVE • EVOLVE</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-4 lg:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60 leading-tight"
            >
              Elevate Your <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2d9ddb] via-[#e0165c] to-[#f58220]">
                Rotaract Experience
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base lg:text-lg text-white/60 mb-6 lg:mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              The premier gamified engagement platform for District 3233.
              {home?.memberCount ? (
                <> Join <span className="text-white font-semibold">{home.memberCount}</span> members tracking attendance, earning points, and climbing the leaderboard.</>
              ) : (
                ' Track attendance, earn points for punctuality, and climb the district leaderboard.'
              )}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="max-w-md mx-auto lg:mx-0 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl"
            >
              <form onSubmit={handleMemberLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80 block">Check your profile</label>
                  <p className="text-xs text-white/50">Enter the email registered with the district.</p>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@rotaract3233.org"
                    className="bg-black/50 border-white/10 text-white placeholder:text-white/30 h-12 focus-visible:ring-[#e0165c] mt-2"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#1a468f] to-[#2d9ddb] hover:opacity-90 text-white font-semibold border-0"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'View My Profile'}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 w-full max-w-lg lg:max-w-none relative mt-8 lg:mt-0"
          >
            <div className="space-y-6">
              <div className="bg-[#0f0f13] border border-white/10 p-5 lg:p-6 rounded-3xl shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2d9ddb]" />
                    Upcoming Events
                  </h3>
                  {home?.upcomingEvents && home.upcomingEvents.length > 0 && (
                    <span className="text-xs text-white/40">{home.upcomingEvents.length} scheduled</span>
                  )}
                </div>
                {!home ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                  </div>
                ) : home.upcomingEvents.length === 0 ? (
                  <div className="text-sm text-white/40 py-3">No upcoming events scheduled yet.</div>
                ) : (
                  <div className="space-y-3">
                    {home.upcomingEvents.map((ev) => (
                      <div key={ev.id} className="bg-white/5 border border-white/10 rounded-xl p-3 hover:border-[#2d9ddb]/30 transition-colors">
                        <p className="font-semibold text-white/90 text-sm">{ev.name}</p>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(ev.event_date, ev.start_time)}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-[#1a468f]/10 to-[#e0165c]/10 border border-white/10 p-5 lg:p-6 rounded-3xl backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#fab616]" />
                    Live Leaderboard
                  </h3>
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
                </div>
                {!home ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                  </div>
                ) : home.leaderboard.length === 0 ? (
                  <div className="text-sm text-white/40 py-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    No points earned yet — be the first!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {home.leaderboard.map((u, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5">
                        <div className="font-bold text-white/40 text-sm w-5">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/90 truncate">{u.full_name || '—'}</p>
                          <p className="text-xs text-white/40 truncate">{u.club_name || 'No club'}</p>
                        </div>
                        <div className="text-xs font-bold text-[#f58220] whitespace-nowrap">{u.total_points || 0} pt</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
