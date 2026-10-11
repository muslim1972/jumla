import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('D:/jumla/.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectPhoneAccount() {
  const phone = '07707707700';
  console.log(`Searching for phone: ${phone}...`);

  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('id, full_name, phone, role, approval_status, banned_until')
    .eq('phone', phone)
    .maybeSingle();

  console.log('Profile result:', profErr ? profErr.message : profile);

  if (profile) {
    const { data: users, error: userErr } = await adminClient.auth.admin.listUsers();
    const authUser = users?.users?.find(u => u.id === profile.id);
    console.log('Auth user for this profile:', authUser ? {
      id: authUser.id,
      email: authUser.email,
      phone: authUser.phone,
      confirmed_at: authUser.confirmed_at
    } : 'NOT FOUND IN AUTH');
  } else {
    // Check if phone or email exists in auth users directly
    const { data: users } = await adminClient.auth.admin.listUsers();
    const matching = users?.users?.filter(u => u.phone?.includes('7700') || u.email?.includes('7700'));
    console.log('Auth users matching 7700:', matching?.map(u => ({ id: u.id, email: u.email, phone: u.phone })));
  }
}

inspectPhoneAccount();
