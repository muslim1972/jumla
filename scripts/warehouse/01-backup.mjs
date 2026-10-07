/**
 * نسخة احتياطية محلية قبل أي ترحيل — تصدير الجداول التي سيلمسها الترحيل:
 * orders, order_items, products, profiles (كل صفوفها) إلى backups/<timestamp>/*.json
 * القراءة فقط — لا يعدّل شيئاً. تشغيل: node scripts/warehouse/01-backup.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

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
if (!url || !key) { console.error('❌ متغيرات البيئة ناقصة'); process.exit(1) }
const admin = createClient(url, key)

const TABLES = ['orders', 'order_items', 'products', 'profiles']
const PAGE = 1000

async function dumpTable(name) {
  const rows = []
  let from = 0
  for (;;) {
    const { data, error } = await admin.from(name).select('*').range(from, from + PAGE - 1)
    if (error) throw new Error(`${name}: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return rows
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dir = `backups/${stamp}`
  mkdirSync(dir, { recursive: true })
  const summary = {}
  for (const t of TABLES) {
    const rows = await dumpTable(t)
    writeFileSync(`${dir}/${t}.json`, JSON.stringify(rows, null, 1))
    summary[t] = rows.length
    console.log(`✅ ${t}: ${rows.length} صف → ${dir}/${t}.json`)
  }
  writeFileSync(`${dir}/summary.json`, JSON.stringify({ when: new Date().toISOString(), ...summary }, null, 2))
  console.log(`\n🛡️ النسخة الاحتياطية جاهزة في ${dir}`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
