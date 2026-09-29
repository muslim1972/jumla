require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: masterProducts, error } = await supabase.from('master_products').select('id, name, category_id');
  if (error) { console.error('Error:', error); return; }

  const counts = {};
  for (const mp of masterProducts) {
    if (!counts[mp.category_id]) counts[mp.category_id] = 0;
    counts[mp.category_id]++;
  }
  console.log('Category usage in master_products:');
  console.log(counts);
}
run();
