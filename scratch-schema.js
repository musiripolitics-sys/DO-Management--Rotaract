const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: pData } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles:", Object.keys(pData[0] || {}));
  const { data: aData } = await supabase.from('attendance').select('*').limit(1);
  console.log("Attendance:", Object.keys(aData[0] || {}));
}
run();
