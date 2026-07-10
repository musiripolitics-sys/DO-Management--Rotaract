const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function findUsers() {
  const names = ['Rtr. Kumaresan', 'Rtr. Hariharan M', 'Rtr. Mahalakshmi'];
  
  for (const name of names) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, club_name, total_points')
      .ilike('full_name', `%${name.replace('Rtr. ', '')}%`);
      
    if (error) {
      console.error("Error:", error.message);
    } else {
      console.log(`Found for ${name}:`, data);
    }
  }
}
findUsers();
