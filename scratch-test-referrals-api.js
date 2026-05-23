const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferrals() {
  const callerProfileId = 'c627fe9d-c2f3-4332-9bf6-7ad4ac37a57d'; // nk131129@gmail.com

  // 1. All Referred
  const { data: allReferred, error: e1 } = await supabase
    .from('profiles')
    .select('referred_by')
    .not('referred_by', 'is', null);

  if (e1) return console.error(e1);

  const referralCounts = {};
  allReferred.forEach((row) => {
    referralCounts[row.referred_by] = (referralCounts[row.referred_by] || 0) + 1;
  });

  const referrerIds = Object.keys(referralCounts);
  let leaderboard = [];

  if (referrerIds.length > 0) {
    const { data: referrerProfiles, error: e2 } = await supabase
      .from('profiles')
      .select('id, full_name, designation')
      .in('id', referrerIds);

    if (e2) return console.error(e2);

    leaderboard = referrerProfiles.map(p => ({
      profile: p,
      count: referralCounts[p.id]
    })).sort((a, b) => b.count - a.count);
  }

  console.log("Leaderboard top entry:", leaderboard[0]);
  
  let myRank = null;
  const myLeaderboardEntry = leaderboard.findIndex(entry => entry.profile?.id === callerProfileId);
  if (myLeaderboardEntry !== -1) {
    myRank = myLeaderboardEntry + 1;
  }
  console.log("My Rank:", myRank);
}
testReferrals();
