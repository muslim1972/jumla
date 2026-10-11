import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('D:/jumla/.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function findUser() {
  const { data: users } = await client.auth.admin.listUsers();
  const targetId = 'db479dcc-aa2e-43d1-838d-b7971286d850';
  const u = users.users.find(x => x.id === targetId);
  console.log('User for profile db479dcc (مسلم ابو سجاد):', u ? { id: u.id, email: u.email, phone: u.phone } : 'NOT FOUND');

  const akkeel = users.users.find(x => x.email?.includes('akkeel'));
  console.log('User with akkeel in email:', akkeel ? { id: akkeel.id, email: akkeel.email } : 'NOT FOUND');
}

findUser();
