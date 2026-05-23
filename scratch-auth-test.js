const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'test' + Date.now() + '@example.com',
    password: 'Rotaract@3233',
    email_confirm: true,
    user_metadata: { full_name: 'Test Member' }
  });
  console.log("Auth result:", error ? error.message : "Success");
}
test();
