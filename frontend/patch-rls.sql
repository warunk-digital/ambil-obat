const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

// We don't have service_role_key in .env.local usually, but wait! 
// Let's just write a sql patch and run it via psql if needed.
