const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const util = require('util');

const scryptAsync = util.promisify(crypto.scrypt);

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function run() {
  const defaultPassword = 'Sergeant@123';
  const hashed = await hashPassword(defaultPassword);
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ president_password_hash: hashed })
    .eq('role', 'sergeant')
    .select('email, full_name');
    
  if (error) {
    console.error('Error updating sergeants:', error.message);
  } else {
    console.log(`Updated passwords for ${data.length} sergeants.`);
    console.log('Affected users:', data.map(u => u.email || u.full_name));
    console.log(`\nDefault password for all sergeants is now: ${defaultPassword}`);
  }
}

run();
