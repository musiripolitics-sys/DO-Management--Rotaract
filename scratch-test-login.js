const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, designation, president_password_hash, email')
    .ilike('designation', '%sergeant%')
    .ilike('email', 'vignesh@sergeant.vibe')
    .maybeSingle();
    
  console.log(profile);
}
run();
