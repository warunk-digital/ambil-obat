import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwlbrjesywyarkrrfsbj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3bGJyamVzeXd5YXJrcnJmc2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTU4NDgsImV4cCI6MjA5NjkzMTg0OH0.s7fgkKOsr2eXooUtjzf9C_RZQeP253PKzJZXP095OhE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createSuperAdmin() {
  console.log("Mendaftarkan akun superadmin...");
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'superadmin@gmail.com',
    password: 'Admin123!',
    options: {
      data: {
        full_name: 'Super Admin',
        phone: '081234567890'
      }
    }
  });

  if (authError) {
    console.error("Gagal mendaftar:", authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log("Berhasil mendaftar. ID User:", userId);

  // Wait 2 seconds for trigger to create profile
  console.log("Menunggu trigger database...");
  await new Promise(r => setTimeout(r, 2000));

  console.log("Menjadikan akun ini super_admin...");
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'super_admin' })
    .eq('id', userId);

  if (updateError) {
    console.error("Gagal update role:", updateError.message);
  } else {
    console.log("✅ SELESAI! superadmin@gmail.com berhasil dibuat dengan password Admin123!");
  }
}

createSuperAdmin();
