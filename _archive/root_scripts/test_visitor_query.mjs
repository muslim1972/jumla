import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('D:/jumla/.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

// Let's test with anon client (same as visitor)
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testVisitorQuery() {
  console.log('--- Testing Anon (Visitor) query ---');
  const { data: anonProducts, error: anonErr } = await anonClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Anon products count:', anonProducts ? anonProducts.length : 0);
  if (anonErr) console.error('Anon products error:', anonErr);

  console.log('\n--- Testing Admin (Service Role) query ---');
  const { data: adminProducts, error: adminErr } = await adminClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Admin products count:', adminProducts ? adminProducts.length : 0);
  if (adminErr) console.error('Admin products error:', adminErr);

  if (adminProducts && adminProducts.length > 0) {
    console.log('Sample product merchant_id:', adminProducts[0].merchant_id);
    const mIds = [...new Set(adminProducts.map(p => p.merchant_id).filter(Boolean))];
    console.log('Testing merchants query for anon...');
    const { data: anonMerchants, error: anonMErr } = await anonClient
      .from('profiles')
      .select('id, full_name, delivery_fee, role')
      .in('id', mIds)
      .eq('role', 'merchant');
    console.log('Anon merchants count:', anonMerchants ? anonMerchants.length : 0);
    if (anonMErr) console.error('Anon merchants error:', anonMErr);
  }
}

testVisitorQuery();
