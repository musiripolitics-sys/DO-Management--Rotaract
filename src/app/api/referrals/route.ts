import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionEmail } from '@/lib/session'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET() {
  try {
    const email = await getSessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const supabase = getAdminClient()

    // 1. Get caller profile
    const { data: callerProfile, error: callerError } = await supabase
      .from('profiles')
      .select('id, designation, role')
      .ilike('email', email)
      .maybeSingle()

    if (callerError || !callerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 2. Fetch all profiles to compute leaderboard and counts
    // (In a very large app, we would use an RPC or aggregated view. Since this is a Rotaract district, fetching all or grouping in JS is acceptable, but we can just use supabase count/filter)
    
    // My total referrals
    const { count: totalReferrals } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', callerProfile.id)

    // My recent referrals
    const { data: recentReferrals } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('referred_by', callerProfile.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Monthly referrals
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { count: monthlyReferrals } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', callerProfile.id)
      .gte('created_at', startOfMonth.toISOString())

    // Leaderboard: group by referred_by
    const { data: allReferred } = await supabase
      .from('profiles')
      .select('referred_by')
      .not('referred_by', 'is', null)

    const referralCounts: Record<string, number> = {}
    
    if (allReferred) {
      allReferred.forEach((row: any) => {
        const referrerId = row.referred_by
        referralCounts[referrerId] = (referralCounts[referrerId] || 0) + 1
      })
    }

    const referrerIds = Object.keys(referralCounts)
    
    let leaderboard: any[] = []
    
    if (referrerIds.length > 0) {
      const { data: referrerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, designation, club_name, professional_photo_url')
        .in('id', referrerIds)
        
      if (referrerProfiles) {
        leaderboard = referrerProfiles.map(p => ({
          profile: p,
          count: referralCounts[p.id]
        })).sort((a, b) => b.count - a.count)
      }
    }

    const top20 = leaderboard.slice(0, 20)

    // My Rank
    let myRank = null
    const myLeaderboardEntry = leaderboard.findIndex(entry => entry.profile?.id === callerProfile.id)
    if (myLeaderboardEntry !== -1) {
      myRank = myLeaderboardEntry + 1
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReferrals: totalReferrals || 0,
        recentReferrals: recentReferrals || [],
        monthlyReferrals: monthlyReferrals || 0,
        leaderboard: top20,
        myRank
      }
    })

  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
