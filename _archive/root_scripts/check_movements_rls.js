require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `select json_agg(row_to_json(p)) from (select policyname, cmd, qual from pg_policies where tablename = 'warehouse_movements') p`
  });
  console.log('Policies for warehouse_movements:', JSON.stringify(data[0].json_agg, null, 2));
}
test();
