const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: allReferred, error } = await supabase
      .from('profiles')
      .select('referred_by, referrer:profiles!referred_by(id, full_name)')
      .not('referred_by', 'is', null)
      .limit(1);
  if (error) {
    console.log("Error querying self join:", error.message);
  } else {
    console.log("Self join data:", allReferred);
  }
}
check();
