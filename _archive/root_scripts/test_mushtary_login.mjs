import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('D:/jumla/.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testMushtaryLogin() {
  console.log('Testing signing in for mushtary1@gmail.com with password 123456...');
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: 'mushtary1@gmail.com',
    password: '123456'
  });

  if (error) {
    console.log('Sign in failed:', error.message);
  } else {
    console.log('Sign in SUCCESS! User ID:', data.user.id);
  }
}

testMushtaryLogin();
