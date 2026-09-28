require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_table_info'); // No RPC. Let's just do a raw pg query
  // Wait, supabase-js doesn't support raw SQL easily unless through RPC.
  // We can try fetching with ANON key WITHOUT user token, if RLS is on, it will fail or return [].
  const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: anonData, error: anonError } = await supabaseAnon.from('audit_logs').select('*').limit(1);
  console.log('Anon fetch:', anonData?.length, anonError);
}
run();
