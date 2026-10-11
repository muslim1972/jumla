require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Fetching deleted records from audit_logs...');
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('id, old_data, created_at')
    .eq('table_name', 'master_products')
    .eq('action', 'DELETE')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log(`Found ${logs.length} deleted items.`);
  
  // Get all current IDs to avoid violating unique constraint on primary key
  const { data: currentProducts } = await supabase.from('master_products').select('id');
  const currentIds = new Set(currentProducts.map(p => p.id));

  let restoredCount = 0;
  for (const log of logs) {
    const product = log.old_data;
    if (currentIds.has(product.id)) {
      console.log(`Product ${product.id} (${product.name}) already exists. Skipping.`);
      continue;
    }
    
    // Insert back
    const { error: insertErr } = await supabase.from('master_products').insert(product);
    if (insertErr) {
      console.error(`Failed to restore ${product.name}:`, insertErr.message);
    } else {
      restoredCount++;
    }
  }

  console.log(`Successfully restored ${restoredCount} items!`);
}
run();
