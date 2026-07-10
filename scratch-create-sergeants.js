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

const sergeants = [
  'vignesh', 'john', 'shanmuga', 'prakash', 'priyanka', 
  'pooja', 'varsha', 'anantha', 'mithun', 'deenadhayalan'
];

async function run() {
  const defaultPassword = 'Sergeant@123';
  const hashed = await hashPassword(defaultPassword);
  
  for (const name of sergeants) {
    const email = `${name}@sergeant.vibe`;
    
    // Check if exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existing) {
      await supabase.from('profiles').update({ president_password_hash: hashed, role: 'sergeant' }).eq('id', existing.id);
      console.log(`Updated ${name}`);
    } else {
      const { error } = await supabase.from('profiles').insert({
        email: email,
        full_name: name.charAt(0).toUpperCase() + name.slice(1) + ' (Sergeant)',
        role: 'sergeant',
        president_password_hash: hashed,
        designation: 'Sergeant at Arms',
        club_name: 'District 3233'
      });
      if (error) {
        console.error(`Failed to create ${name}:`, error.message);
      } else {
        console.log(`Created ${name}`);
      }
    }
  }
  console.log(`All sergeants initialized with password: ${defaultPassword}`);
}

run();
