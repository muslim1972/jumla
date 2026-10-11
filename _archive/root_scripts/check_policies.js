require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('pg_query', { query: "SELECT * FROM pg_policies WHERE tablename = 'trusted_buyers'" });
  console.log(data, error);
}
checkPolicies();
