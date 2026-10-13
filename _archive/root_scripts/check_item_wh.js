require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const merchantId = '65fde2ad-9fd8-4a97-9b29-7bb67cf03540';
  const { data: items } = await supabase
    .from("warehouse_items")
    .select("id, warehouse_id, product_id, quantity, product:products(name)")
    .eq("merchant_id", merchantId);
  console.log('Items in warehouse:');
  console.log(items);
}
test();
