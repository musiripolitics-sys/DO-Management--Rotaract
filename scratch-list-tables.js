const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('events').select('*').limit(1);
  if (error) console.error("events error:", error.message);
  else console.log("events ok:", data);

  // We can query the pg_tables if we have RPC or we can just fetch some data
  // But since we can't easily run custom SQL via JS client without an RPC, let's just use the Supabase CLI if possible
}
check();
