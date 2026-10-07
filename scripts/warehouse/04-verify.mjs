/**
 * تحقق نهائي بعد الترحيل — يقرأ الواقع الجديد ويعرضه: القيود الموسعة، الجداول
 * والسياسات، الدوال المعاد كتابتها، المشغلات، والبث اللحظي. لا يعدّل شيئاً.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv(path = '.env.local') {
  const env = {}
  for (const line of readFileSync(path, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}
const env = loadEnv()
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const VERIFY_SQL = `
select json_build_object(
  'orders_status_check', (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.orders'::regclass and conname='orders_status_check'),
  'profiles_role_check', (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_role_check'),
  'tables', (select json_object_agg(t, coalesce((select json_build_object('rls', c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t), to_json('absent'::text)))
    from (values ('warehouses'),('warehouse_items'),('warehouse_movements'),('picking_lists'),('picking_list_items')) v(t)),
  'policies_count', (select count(*) from pg_policies where schemaname='public' and tablename in ('warehouses','warehouse_items','warehouse_movements','picking_lists','picking_list_items')),
  'staff_policies', (select count(*) from pg_policies where schemaname='public' and policyname in ('orders_staff_select','orders_staff_update','products_staff_insert','products_staff_update','profiles_staff_select','profiles_staff_update')),
  'create_order_uses_warehouse_items', (select position('warehouse_items' in pg_get_functiondef(p.oid)) > 0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_order_atomic'),
  'restore_uses_warehouse_items', (select position('warehouse_items' in pg_get_functiondef(p.oid)) > 0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='restore_stock_quantity'),
  'new_funcs', (select json_object_agg(p.proname, true) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('warehouse_apply_movement','enable_merchant_warehouse','get_merchant_activity','get_staff_parent','staff_has_perm','staff_is_active_of','sync_product_stock_from_items','products_stock_to_default_item')),
  'triggers', (select coalesce(json_agg(distinct t.trigger_name), '[]') from information_schema.triggers t where t.trigger_schema='public' and t.event_object_table in ('warehouses','warehouse_items','warehouse_movements','picking_lists','picking_list_items','products') and (t.trigger_name like 'audit_trg%' or t.trigger_name like 'trg_%')),
  'realtime_new', (select coalesce(json_agg(prel.relname),'[]') from pg_publication pub join pg_publication_rel ppr on pub.oid=ppr.prpubid join pg_class prel on prel.oid=ppr.prrelid join pg_namespace n on n.oid=prel.relnamespace where pub.pubname='supabase_realtime' and n.nspname='public' and prel.relname in ('warehouse_items','warehouse_movements','picking_lists')),
  'sanity', (select json_build_object('profiles', (select count(*) from public.profiles), 'products', (select count(*) from public.products), 'orders', (select count(*) from public.orders), 'products_null_stock', (select count(*) from public.products where stock_quantity is null)))
) as verify;
`

async function main() {
  // نزع الفاصلة المنقوطة الختامية كي ينجح التغليف داخل exec_sql ويعيد النتيجة لا true
  const { data, error } = await admin.rpc('exec_sql', { sql_query: VERIFY_SQL.trim().replace(/;+\s*$/, '') })
  if (error) { console.error('❌', error.message); process.exit(1) }
  const v0 = Array.isArray(data) ? data[0] : data
  const v = v0?.verify ?? v0?.jsonb_agg ?? v0
  console.log(JSON.stringify(v, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
