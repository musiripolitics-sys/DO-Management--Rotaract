const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function findPresidents() {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, club_name, email, designation')
    .not('president_password_hash', 'is', null);
    
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Presidents with password set:");
    console.log(data);
  }
}
findPresidents();
