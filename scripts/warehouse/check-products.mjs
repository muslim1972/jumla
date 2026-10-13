import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv(path = '.env.local') {
  const env = {}
  try {
    for (const line of readFileSync(path, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/)
      if (m) env[m[1]] = m[2]
    }
  } catch { /* ignore */ }
  return env
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, key)

async function main() {
  const { data: products } = await admin.from('products').select('*').like('name', '%فاصوليا%')
  console.log('Products:', products)
}

main()