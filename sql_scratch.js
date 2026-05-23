const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const q1 = "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ri_id TEXT;";
  const q2 = "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);";
  const { error: e1 } = await supabase.rpc('exec_sql', { sql: q1 });
  console.log(e1);
}
run();
