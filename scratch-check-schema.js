const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_schema_columns', { table_name: 'profiles' });
  if (error) {
     // If RPC doesn't exist, just fetch a row and dump keys
     const { data: row, error: e2 } = await supabase.from('profiles').select('*').limit(1).single();
     if (e2) console.error(e2);
     else console.log(Object.keys(row));
  } else {
    console.log(data);
  }
}
check();
