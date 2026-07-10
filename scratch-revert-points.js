const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase.from('profiles').update({ total_points: 400 }).eq('id', '686cfde0-7431-474d-8152-4179cfad1c6f');
  await supabase.from('profiles').update({ total_points: 250 }).eq('id', '79c946b6-7577-4610-a142-241e63fb82b7');
  await supabase.from('profiles').update({ total_points: 250 }).eq('id', 'a97dfedc-200e-468b-8d71-c578aefb5178');
  console.log("Reverted successfully");
}
run();
