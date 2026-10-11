import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('D:/jumla/.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOldAccountsWithPhone() {
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, full_name, phone, role')
    .not('phone', 'is', null);

  const { data: users } = await adminClient.auth.admin.listUsers();
  const userMap = new Map(users.users.map(u => [u.id, u.email]));

  console.log('Profiles with phone numbers:');
  for (const p of profiles) {
    const authEmail = userMap.get(p.id);
    console.log(`- Name: ${p.full_name} | Phone: ${p.phone} | Auth Email: ${authEmail}`);
  }
}

checkOldAccountsWithPhone();
