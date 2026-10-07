/**
 * فحص حي للقراءة فقط قبل ترحيل «المخازن» — لا يعدّل أي شيء.
 * يجيب بدقة على: القيود الفعلية لحالة الطلب، أعمدة profiles/products،
 * دالة handle_new_user ومشغلات التدقيق والدوال المساعدة، وجود جداولنا المخططة،
 * وسياسات RLS على الجداول الثلاثة الحرجة. إن لم يتوفر exec_sql يكتب ملف SQL للتشغيل اليدوي.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

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
if (!url || !key) {
  console.error('❌ لا يوجد NEXT_PUBLIC_SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY في .env.local')
  process.exit(1)
}
const admin = createClient(url, key)

const INSPECT_SQL = `
select json_build_object(
  'exec_sql_exists', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='exec_sql'),
  'planned_tables_exist', (select json_object_agg(t, coalesce((select 'EXISTS' from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t), 'absent'))
    from (values ('warehouses'),('warehouse_items'),('warehouse_movements'),('picking_lists'),('picking_list_items')) v(t)),
  'orders_columns', (select json_agg(json_build_object('name',column_name,'type',data_type,'udt',udt_name,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='orders'),
  'orders_status_checks', (select json_agg(json_build_object('name',conname,'def',pg_get_constraintdef(oid))) from pg_constraint where conrelid='public.orders'::regclass and contype='c'),
  'orders_count', (select count(*) from public.orders),
  'orders_by_status', (select json_object_agg(status, cnt) from (select status, count(*) cnt from public.orders group by status) s),
  'profiles_columns', (select json_agg(json_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='profiles'),
  'profiles_role_checks', (select json_agg(json_build_object('name',conname,'def',pg_get_constraintdef(oid))) from pg_constraint where conrelid='public.profiles'::regclass and contype='c'),
  'profiles_by_role', (select json_object_agg(coalesce(role,'null'), cnt) from (select role, count(*) cnt from public.profiles group by role) s),
  'merchant_count', (select count(*) from public.profiles where role='merchant'),
  'products_stock_cols', (select json_agg(json_build_object('name',column_name,'type',data_type,'udt',udt_name,'nullable',is_nullable,'default',column_default)) from information_schema.columns where table_schema='public' and table_name='products' and column_name in ('stock_quantity','stock_unit','min_stock_alert','units','unit_conversions','master_product_id','merchant_id','price','unit_type')),
  'products_count', (select count(*) from public.products),
  'handle_new_user_def', (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='handle_new_user'),
  'get_user_role_def', (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_user_role' limit 1),
  'audit_funcs', (select coalesce(json_agg(json_build_object('name',p.proname,'def',pg_get_functiondef(p.oid))),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('audit_trigger_func','audit_log_trigger')),
  'audit_triggers', (select coalesce(json_agg(json_build_object('table',event_object_table,'name',trigger_name,'timing',action_timing,'event',event_manipulation,'stmt',action_statement)),'[]') from information_schema.triggers where trigger_schema='public' and action_statement ilike '%audit%'),
  'rls_products_profiles_orders', (select coalesce(json_agg(json_build_object('table',tablename,'name',policyname,'cmd',cmd,'roles',roles,'qual',qual,'with_check',with_check) order by tablename,policyname),'[]') from pg_policies where schemaname='public' and tablename in ('products','profiles','orders')),
  'realtime_publication_tables', (select coalesce(json_agg(prel.relname),'[]') from pg_publication pub join pg_publication_rel ppr on pub.oid=ppr.prpubid join pg_class prel on prel.oid=ppr.prrelid join pg_namespace n on n.oid=prel.relnamespace where pub.pubname='supabase_realtime' and n.nspname='public'),
  'username_col_profile', (select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='username'),
  'db_version', (select current_setting('server_version'))
) as dump;
`

async function main() {
  const { data, error } = await admin.rpc('exec_sql', { sql_query: INSPECT_SQL })
  if (error) {
    console.error('⚠️ RPC exec_sql فشل:', error.message)
    writeFileSync('scripts/warehouse/00-inspect-manual.sql', INSPECT_SQL)
    console.error('→ كُتب السكربت في scripts/warehouse/00-inspect-manual.sql — نفّذه في SQL Editor ثم الصق ناتج الخلية dump هنا.')
    process.exit(2)
  }
  const dump = typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data[0].dump : data[0].dump ?? data[0])
  writeFileSync('scripts/warehouse/inspect-result.json', JSON.stringify(dump, null, 2))
  // طباعة ملخص مركّز
  const summary = {
    exec_sql_exists: dump.exec_sql_exists,
    planned_tables: dump.planned_tables_exist,
    orders_status_checks: dump.orders_status_checks,
    orders_count: dump.orders_count,
    orders_by_status: dump.orders_by_status,
    profiles_role_checks: dump.profiles_role_checks,
    profiles_by_role: dump.profiles_by_role,
    merchant_count: dump.merchant_count,
    products_stock_cols: dump.products_stock_cols,
    products_count: dump.products_count,
    username_col_profile: dump.username_col_profile,
    audit_trigger_tables: (dump.audit_triggers || []).map(t => `${t.table}:${t.event}`),
    realtime_tables: dump.realtime_publication_tables,
    db_version: dump.db_version,
  }
  console.log(JSON.stringify(summary, null, 2))
  console.log('\n— handle_new_user_def —\n' + (dump.handle_new_user_def ?? 'NOT FOUND'))
  console.log('\n— get_user_role_def —\n' + (dump.get_user_role_def ?? 'NOT FOUND'))
  console.log('\n— audit_funcs —')
  for (const f of dump.audit_funcs || []) console.log(`\n[${f.name}]\n` + f.def)
  console.log('\n— rls (products/profiles/orders) —')
  for (const p of dump.rls_products_profiles_orders || []) {
    console.log(`• ${p.table} | ${p.name} | ${p.cmd} | roles=${JSON.stringify(p.roles)}\n  USING: ${p.qual}\n  WITH CHECK: ${p.with_check}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
