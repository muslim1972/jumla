import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('D:/jumla/.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: users, error: userErr } = await client.auth.admin.listUsers();
  if (userErr) {
    console.error('User list error:', userErr.message);
  } else {
    console.log('Total auth users:', users.users.length);
    const target = users.users.find(u => u.email?.includes('muslim') || u.phone?.includes('07'));
    if (target) {
      console.log('Target user in Auth:', {
        id: target.id,
        email: target.email,
        phone: target.phone,
        confirmed_at: target.confirmed_at
      });
    }
  }

  const { data: profiles, error: profErr } = await client
    .from('profiles')
    .select('id, full_name, phone, role, approval_status, banned_until')
    .ilike('full_name', '%مسلم%');

  console.log('Profiles matching مسلم:', profErr ? profErr.message : profiles);
}

test();
