require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('audit_logs').select('id, old_data, created_at').eq('table_name', 'master_products').eq('action', 'DELETE');
  console.log('Deleted master_products in audit_logs:', data?.length);
  if (data && data.length > 0) {
    console.log('Sample:', data[0].old_data.name, data[0].old_data.description);
  }
}
run();
