require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: reqs, error: rErr } = await supabase
    .from('warehouse_deduction_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('--- RECENT DEDUCTION REQUESTS ---');
  console.log(reqs);

  const { data: movs, error: mErr } = await supabase
    .from('warehouse_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('--- RECENT MOVEMENTS ---');
  console.log(movs);
}
inspect();
