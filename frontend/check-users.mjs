import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwlbrjesywyarkrrfsbj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3bGJyamVzeXd5YXJrcnJmc2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTU4NDgsImV4cCI6MjA5NjkzMTg0OH0.s7fgkKOsr2eXooUtjzf9C_RZQeP253PKzJZXP095OhE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUsers() {
  // Login first as superadmin
  const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'superadmin@gmail.com',
    password: 'Admin123!'
  });
  
  if (loginError) {
    console.error("Gagal login sebagai superadmin:", loginError.message);
    return;
  }
  
  console.log("Berhasil login! Mengambil data...");

  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, role');
    
  if (error) {
    console.error("Error fetching users:", error.message);
  } else {
    console.log("Registered Users in Database:");
    console.log(users);
  }
  
  const { data: staff, error: staffError } = await supabase
    .from('pharmacy_staff')
    .select('*, pharmacy:pharmacies(name)');
    
  if (staffError) {
    console.error("Error fetching staff:", staffError.message);
  } else {
    console.log("\nRegistered Pharmacy Staff:");
    console.log(staff);
  }
}

checkUsers();
