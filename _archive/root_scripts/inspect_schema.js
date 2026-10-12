require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: nData, error: nErr } = await supabase.from('notifications').select('*').limit(1);
  console.log('notifications columns sample:', nData ? Object.keys(nData[0] || {}) : nErr);

  const { data: mData, error: mErr } = await supabase.from('warehouse_movements').select('*').limit(1);
  console.log('warehouse_movements columns sample:', mData ? Object.keys(mData[0] || {}) : mErr);

  const { data: rpcData, error: rpcErr } = await supabase.rpc('warehouse_apply_movement', {
    p_item_id: '00000000-0000-0000-0000-000000000000',
    p_kind: 'in',
    p_quantity: 0,
    p_note: 'test',
    p_reference_type: null,
    p_reference_id: null
  });
  console.log('warehouse_apply_movement rpc result:', rpcErr?.message);
}
inspect();
