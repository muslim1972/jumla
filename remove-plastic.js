require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const plasticId = '6c3347fe-3edc-4216-b1fb-0b0a77250feb';
  await supabase.from('master_products').update({ category_id: null }).eq('category_id', plasticId);
  await supabase.from('products').update({ category_id: null }).eq('category_id', plasticId);
  await supabase.from('categories').delete().eq('id', plasticId);
  console.log('Removed ادوات بلاستيكية and remapped its products to null.');
}
run();
