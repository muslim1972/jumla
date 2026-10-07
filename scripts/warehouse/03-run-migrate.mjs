/**
 * منفّذ الترحيل — يقرأ ملف SQL ويقسّمه بوعي كامل ($$ ... $$ وأجساد الدوال والنصوص)
 * ثم ينفّذ كل عبارة عبر exec_sql (service_role فقط) مع تقرير واضح لكل عبارة.
 * الاستخدام: node scripts/warehouse/03-run-migrate.mjs scripts/warehouse/02-migrate.sql
 */
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
if (!url || !key) { console.error('❌ متغيرات البيئة ناقصة'); process.exit(1) }
const admin = createClient(url, key)

/** تقسيم يفهم $$ dollar-quoting والنصوص المفردة، ولا يقصع داخل أجساد الدوال */
export function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let i = 0
  let dollarTag = null      // اسم الوسم داخل $$ الحالي
  let inSingleQuote = false
  while (i < sql.length) {
    const ch = sql[i]
    // تعليقات سطرية — تُحذف من العبارة المُرسلة (exec_sql يقبلها لكن ننظف)
    if (!dollarTag && !inSingleQuote && ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }
    // تعليقات كتلية
    if (!dollarTag && !inSingleQuote && ch === '/' && sql[i + 1] === '*') {
      i += 2
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (!dollarTag && !inSingleQuote && ch === "'") {
      inSingleQuote = true
      current += ch; i++
      continue
    }
    if (inSingleQuote) {
      if (ch === "'") {
        if (sql[i + 1] === "'") { current += "''"; i += 2; continue }
        inSingleQuote = false
      }
      current += ch; i++
      continue
    }
    // dollar-quoting: $$ أو $tag$
    if (!dollarTag && ch === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))
      if (m) {
        dollarTag = m[0]
        current += m[0]
        i += m[0].length
        continue
      }
    } else if (dollarTag && ch === '$') {
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag
        i += dollarTag.length
        dollarTag = null
        continue
      }
    }
    if (!dollarTag && ch === ';') {
      const stmt = current.trim()
      if (stmt) statements.push(stmt)
      current = ''
      i++
      continue
    }
    current += ch
    i++
  }
  const tail = current.trim()
  if (tail) statements.push(tail)
  return statements
}

async function execSql(query) {
  const { data, error } = await admin.rpc('exec_sql', { sql_query: query })
  if (error) throw new Error(error.message)
  return data
}

async function main() {
  const file = process.argv[2] || 'scripts/warehouse/02-migrate.sql'
  const sql = readFileSync(file, 'utf-8')
  const statements = splitSqlStatements(sql)
  console.log(`📄 ${file}: ${statements.length} عبارة`)
  let ok = 0, failed = 0
  for (let n = 0; n < statements.length; n++) {
    const stmt = statements[n]
    const label = stmt.replace(/\s+/g, ' ').slice(0, 72)
    try {
      await execSql(stmt)
      ok++
      console.log(`  ✅ [${n + 1}/${statements.length}] ${label}`)
    } catch (e) {
      failed++
      console.error(`  ❌ [${n + 1}/${statements.length}] ${label}\n     ${e.message}`)
      // نتوقف عند أول فشل — الترحيل يجب أن يكتمل بالترتيب ولا نكتم الفشل
      console.error(`\n🛑 توقّف عند العبارة ${n + 1}. صحّح السكربت ثم أعد التشغيل (العبارات المكتملة idempotent).`)
      process.exit(3)
    }
  }
  console.log(`\nالنتيجة: ${ok} نجح، ${failed} فشل`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
