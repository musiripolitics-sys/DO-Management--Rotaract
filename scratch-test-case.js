const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: d1, error: e1 } = await supabase.from('Attendance').select('*').limit(1);
  if (e1) console.error("Capital Attendance error:", e1.message);
  else console.log("Capital Attendance exists!", d1);

  const { data: d2, error: e2 } = await supabase.from('attendance').select('*').limit(1);
  if (e2) console.error("Lowercase attendance error:", e2.message);
  else console.log("Lowercase attendance exists!", d2);
}
check();
