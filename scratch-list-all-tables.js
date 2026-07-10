const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) console.error("profiles error:", error.message);
  
  // Actually, wait, let's try reading from attendance
  const { error: err2 } = await supabase.from('attendance').select('*').limit(1);
  if (err2) console.error("attendance error:", err2.message);
  else console.log("attendance exists!");
  
  // Try event_attendance? Maybe it's called event_attendance?
  const { error: err3 } = await supabase.from('event_attendance').select('*').limit(1);
  if (err3) console.error("event_attendance error:", err3.message);
  else console.log("event_attendance exists!");
}
check();
