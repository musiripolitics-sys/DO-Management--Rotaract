'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Trophy, Medal, Star, Shield, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { getBadgeForCount } from '@/lib/badges'

export default function Leaderboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/referrals')
        if (res.ok) {
          const json = await res.json()
          setData(json.data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="animate-spin w-8 h-8 border-2 border-[#2d9ddb] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6 text-center">
        <Trophy className="w-16 h-16 text-white/20 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Unavailable</h1>
        <p className="text-white/50 mb-6 max-w-md">The leaderboard is currently unavailable or you do not have permission to view it.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const { leaderboard, myRank } = data

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white">
      <nav className="w-full px-6 py-4 flex items-center border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="text-white/70 hover:text-white mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Referral Leaderboard</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        
        {/* Top 3 Podium */}
        <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 pt-8 pb-12">
          
          {/* 2nd Place */}
          {leaderboard[1] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center order-2 md:order-1 flex-1 max-w-[200px]">
              <div className="w-16 h-16 rounded-full bg-slate-400/20 flex items-center justify-center mb-4 ring-4 ring-slate-400 shadow-[0_0_30px_rgba(148,163,184,0.3)]">
                <span className="text-2xl font-bold text-slate-300">2</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-400" />
                <p className="font-bold text-white truncate">{leaderboard[1].profile?.full_name}</p>
                <p className="text-xs text-white/50 truncate mb-2">{leaderboard[1].profile?.designation}</p>
                <p className="text-xl font-bold text-[#2d9ddb]">{leaderboard[1].count} <span className="text-sm font-normal text-white/50">recruits</span></p>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {leaderboard[0] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center order-1 md:order-2 flex-1 max-w-[220px] z-10 md:-mt-8">
              <div className="w-20 h-20 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4 ring-4 ring-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.4)] relative">
                <Trophy className="w-8 h-8 text-yellow-400 absolute -top-4" />
                <span className="text-3xl font-bold text-yellow-400">1</span>
              </div>
              <div className="bg-gradient-to-b from-yellow-400/10 to-white/5 border border-yellow-400/30 rounded-xl p-5 w-full text-center relative overflow-hidden ring-1 ring-yellow-400/20 shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400" />
                <p className="font-bold text-white text-lg truncate">{leaderboard[0].profile?.full_name}</p>
                <p className="text-xs text-white/60 truncate mb-2">{leaderboard[0].profile?.designation}</p>
                <p className="text-3xl font-bold text-yellow-400 mb-1">{leaderboard[0].count} <span className="text-sm font-normal text-white/70">recruits</span></p>
                <div className="text-[10px] uppercase tracking-widest text-yellow-400/80 font-bold bg-yellow-400/10 py-1 rounded">Top Recruiter</div>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {leaderboard[2] && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col items-center order-3 flex-1 max-w-[200px]">
              <div className="w-16 h-16 rounded-full bg-amber-700/20 flex items-center justify-center mb-4 ring-4 ring-amber-700 shadow-[0_0_30px_rgba(180,83,9,0.3)]">
                <span className="text-2xl font-bold text-amber-600">3</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-700" />
                <p className="font-bold text-white truncate">{leaderboard[2].profile?.full_name}</p>
                <p className="text-xs text-white/50 truncate mb-2">{leaderboard[2].profile?.designation}</p>
                <p className="text-xl font-bold text-[#2d9ddb]">{leaderboard[2].count} <span className="text-sm font-normal text-white/50">recruits</span></p>
              </div>
            </motion.div>
          )}
        </div>

        {/* The Rest of the Leaderboard */}
        <Card className="bg-[#0f0f13] border-white/10 border-0 ring-1 ring-white/10 shadow-xl">
          <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Medal className="w-5 h-5 text-[#2d9ddb]" /> 
              District Rankings
            </CardTitle>
            {myRank && (
              <div className="bg-[#2d9ddb]/20 text-[#2d9ddb] px-3 py-1 rounded-full text-xs font-bold ring-1 ring-[#2d9ddb]/50">
                Your Rank: #{myRank}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.slice(3).map((entry: any, index: number) => {
              const rank = index + 4
              const badge = getBadgeForCount(entry.count)
              return (
                <div key={entry.profile.id} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/50 font-bold text-sm">
                      {rank}
                    </div>
                    <div>
                      <p className="font-bold text-white">{entry.profile?.full_name}</p>
                      <p className="text-xs text-white/50">{entry.profile?.designation || entry.profile?.club_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${badge.color}`} />
                      <span className="text-xs text-white/40">{badge.name}</span>
                    </div>
                    <div className="bg-white/5 px-3 py-1 rounded-lg">
                      <span className="font-bold text-white">{entry.count}</span>
                      <span className="text-xs text-white/40 ml-1">recruits</span>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {leaderboard.length <= 3 && (
              <div className="p-8 text-center text-white/40 text-sm">
                No more recruiters to show. Start adding members to appear here!
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  )
}
