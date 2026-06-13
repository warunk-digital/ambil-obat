import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwlbrjesywyarkrrfsbj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3bGJyamVzeXd5YXJrcnJmc2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTU4NDgsImV4cCI6MjA5NjkzMTg0OH0.s7fgkKOsr2eXooUtjzf9C_RZQeP253PKzJZXP095OhE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixRole() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'superadmin@gmail.com',
    password: 'Admin123!',
  });
  
  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  
  console.log("Logged in. Updating role...");
  
  const { error } = await supabase
    .from('users')
    .update({ role: 'super_admin' })
    .eq('id', authData.user.id);
    
  if (error) {
    console.error("Failed to update role:", error.message);
  } else {
    console.log("Role successfully updated to super_admin!");
  }
  
  const { data } = await supabase.from('users').select('role').eq('id', authData.user.id).single();
  console.log("Current role:", data?.role);
}

fixRole();
