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
    
    // Check if user exists in auth
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: email,
      password: crypto.randomBytes(16).toString('hex'), // random password, they will use president_password_hash
      email_confirm: true
    }).catch(() => ({ data: null }));

    if (authUser && authUser.user) {
      const id = authUser.user.id;
      // Triggers might have created the profile, so try to update it first
      const { error: updateError } = await supabase.from('profiles').update({
        full_name: name.charAt(0).toUpperCase() + name.slice(1) + ' (Sergeant)',
        role: 'member',
        president_password_hash: hashed,
        designation: 'Sergeant at Arms',
        club_name: 'District 3233'
      }).eq('id', id);
      
      console.log(`Created auth and updated profile for ${name}`);
    } else {
      // Maybe user exists, try to get ID
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
        
      if (existing) {
         await supabase.from('profiles').update({ 
           president_password_hash: hashed, 
           designation: 'Sergeant at Arms',
           role: 'member'
         }).eq('id', existing.id);
         console.log(`Updated existing profile ${name}`);
      }
    }
  }
  console.log(`All sergeants initialized with password: ${defaultPassword}`);
}

run();
