import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('D:/jumla/.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSignIn() {
  // Let's test signing in with dummy wrong password
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: 'muslimakkeel@gmail.com',
    password: 'wrong_password_test_12345'
  });

  console.log('Test Sign In result with wrong password:');
  console.log('Error message:', error ? error.message : 'NO ERROR');
}

testSignIn();
