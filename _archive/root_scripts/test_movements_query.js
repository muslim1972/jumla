require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const merchantId = '65fde2ad-9fd8-4a97-9b29-7bb67cf03540';
  const res = await supabase
    .from("warehouse_movements")
    .select("id, merchant_id, warehouse_id, product_id, kind, quantity, balance_after, reference_type, reference_id, note, performed_by, created_at, product:products(name, unit_conversions), actor:profiles!warehouse_movements_performed_by_fkey(full_name)")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(150);
  
  console.log('Error:', res.error);
  console.log('Data length:', res.data ? res.data.length : 0);
  if (res.data && res.data.length > 0) {
    console.log('Sample data:', JSON.stringify(res.data[0], null, 2));
  }
}
test();
