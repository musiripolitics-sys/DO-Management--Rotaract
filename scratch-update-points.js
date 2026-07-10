const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = '133c3c5b-4d86-4d89-bfce-b5b4a14565a7';
  
  // 1. Get all attendees for this event
  const { data: attendees, error: e1 } = await supabase
    .from('attendance')
    .select('user_id')
    .eq('event_id', eventId);
    
  if (e1) {
    console.error("Error fetching attendees:", e1.message);
    return;
  }
  
  if (!attendees || attendees.length === 0) {
    console.log("No attendees found for this event.");
    return;
  }
  
  console.log(`Found ${attendees.length} attendees for event. Updating points_awarded to 100...`);
  
  // 2. Update points_awarded for this event
  const { error: e2 } = await supabase
    .from('attendance')
    .update({ points_awarded: 100 })
    .eq('event_id', eventId);
    
  if (e2) {
    console.error("Error updating attendance points:", e2.message);
    return;
  }
  
  console.log("Updated points_awarded successfully. Now recalculating total_points for affected profiles...");
  
  // 3. Recalculate total_points for each affected user
  const userIds = [...new Set(attendees.map(a => a.user_id))];
  
  for (const userId of userIds) {
    // Get all attendance records for this user
    const { data: userAttendance, error: e3 } = await supabase
      .from('attendance')
      .select('points_awarded')
      .eq('user_id', userId);
      
    if (e3) {
      console.error(`Error fetching attendance for user ${userId}:`, e3.message);
      continue;
    }
    
    const totalPoints = userAttendance.reduce((sum, record) => sum + (record.points_awarded || 0), 0);
    
    // Update profile
    const { error: e4 } = await supabase
      .from('profiles')
      .update({ total_points: totalPoints })
      .eq('id', userId);
      
    if (e4) {
      console.error(`Error updating total_points for user ${userId}:`, e4.message);
    } else {
      console.log(`User ${userId} total_points updated to ${totalPoints}`);
    }
  }
  
  console.log("Done updating points!");
}
run();
