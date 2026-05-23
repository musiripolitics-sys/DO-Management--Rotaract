const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdd() {
  const email = 'nk131129@gmail.com'; // This is a secretary
  
  // 1. Verify caller
  const { data: callerProfile, error: callerError } = await supabase
    .from('profiles')
    .select('id, designation, role')
    .eq('email', email)
    .single();
    
  if (callerError) return console.log("Caller error", callerError);

  const isAuthorized = Boolean(
    callerProfile.role === 'president' || 
    callerProfile.designation?.toLowerCase().includes('president') ||
    callerProfile.designation?.toLowerCase().includes('secretary')
  );
  
  console.log("Authorized?", isAuthorized);

  const memberEmail = `test_member_${Date.now()}@example.com`;
  const name = "Test Member";
  const riId = "123456";

  // 2. Create Auth User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: memberEmail.trim().toLowerCase(),
    password: 'Rotaract@3233', // Default password
    email_confirm: true,
    user_metadata: { full_name: name }
  });

  if (authError) {
    return console.log("Auth error", authError.message);
  }

  // 3. Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      ri_id: riId || null,
      referred_by: callerProfile.id
    })
    .eq('email', memberEmail.trim().toLowerCase());

  if (updateError) {
    return console.log("Update error", updateError.message);
  }

  console.log("Success! Added member", memberEmail);
}

testAdd();
