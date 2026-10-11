require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: products, error } = await supabase.from('products').select('id, category_id');
  if (error) { console.error('Error:', error); return; }

  const counts = {};
  for (const p of products) {
    if (!counts[p.category_id]) counts[p.category_id] = 0;
    counts[p.category_id]++;
  }
  console.log('Category usage in products:');
  console.log(counts);
}
run();
