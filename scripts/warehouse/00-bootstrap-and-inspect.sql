-- ============================================================================
-- جُملتي — نظام المخازن | خطوة الإقلاع (تنفيذ واحد يدوي في SQL Editor)
-- ----------------------------------------------------------------------------
-- ماذا يفعل هذا الملف؟
--   1) ينشئ دالة exec_sql لأتمتة سكربتات الترحيل لاحقاً — محصورة بمفتاح الخدمة
--      (service_role) فقط: لا يمكن لـ anon ولا authenticated تنفيذها إطلاقاً،
--      وهي تعمل داخل القاعدة بحدود صلاحيات المالك ولا تمنح صلاحيات إضافية لأحد.
--   2) ينفّذ فحصاً حياً للقراءة فقط (لا يعدّل أي بيانات) ويعيد صورة دقيقة عن:
--      القيود الفعلية، الأعمدة، الدوال الحساسة، الجداول المخططة، السياسات.
--
-- ماذا تفعل بعد التشغيل؟
--   انسخ ناتج الخلية الوحيدة (اسم العمود: warehouse_dump) والصقه في المحادثة.
-- ============================================================================

-- ① أداة التنفيذ المحصورة (لأتمتة الترحيلات اللاحقة فقط)
create or replace function public.exec_sql(sql_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- حماية: لا تُنفَّذ إلا من مفتاح الخدمة أو المالك — تُرفض من أي جلسة مستخدم عادية
  if current_user not in ('service_role', 'postgres') then
    raise exception 'exec_sql: غير مسموح إلا بمفتاح الخدمة';
  end if;
  begin
    -- محاولة إرجاع النتيجة كـ JSON (للاستعلامات)
    execute format('select coalesce(jsonb_agg(t), to_jsonb(true)) from (%s) t', sql_query) into v_result;
  exception when others then
    -- عبارات DDL/DML لا تُغلَّف كاستعلام: تُنفَّذ مباشرة (فشل التغليف يحدث قبل أي تنفيذ)
    execute sql_query;
    return to_jsonb(true);
  end;
  return v_result;
end;
$$;

revoke all on function public.exec_sql(text) from public;
revoke all on function public.exec_sql(text) from anon;
revoke all on function public.exec_sql(text) from authenticated;
grant execute on function public.exec_sql(text) to service_role;

-- ② الفحص الحي للقراءة فقط
select json_build_object(
  'db_version', current_setting('server_version'),
  'orders_columns', (select json_agg(json_build_object('name',column_name,'type',data_type,'udt',udt_name,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='orders'),
  'order_items_columns', (select json_agg(json_build_object('name',column_name,'type',data_type,'udt',udt_name,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='order_items'),
  'orders_status_checks', (select json_agg(json_build_object('name',conname,'def',pg_get_constraintdef(oid))) from pg_constraint where conrelid='public.orders'::regclass and contype='c'),
  'orders_count', (select count(*) from public.orders),
  'orders_by_status', (select json_object_agg(coalesce(status,'null'), cnt) from (select status, count(*) cnt from public.orders group by status) s),
  'profiles_columns', (select json_agg(json_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='profiles'),
  'profiles_role_checks', (select json_agg(json_build_object('name',conname,'def',pg_get_constraintdef(oid))) from pg_constraint where conrelid='public.profiles'::regclass and contype='c'),
  'profiles_by_role', (select json_object_agg(coalesce(role,'null'), cnt) from (select role, count(*) cnt from public.profiles group by role) s),
  'merchant_count', (select count(*) from public.profiles where role='merchant'),
  'products_stock_cols', (select json_agg(json_build_object('name',column_name,'type',data_type,'udt',udt_name,'nullable',is_nullable,'default',column_default)) from information_schema.columns where table_schema='public' and table_name='products' and column_name in ('stock_quantity','stock_unit','min_stock_alert','units','unit_conversions','master_product_id','merchant_id','price','unit_type')),
  'products_count', (select count(*) from public.products),
  'planned_tables', (select json_object_agg(t, coalesce((select 'EXISTS' from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t), 'absent'))
    from (values ('warehouses'),('warehouse_items'),('warehouse_movements'),('picking_lists'),('picking_list_items'),('exec_sql_probe')) v(t)),
  'handle_new_user_def', (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='handle_new_user'),
  'get_user_role_def', (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_user_role' limit 1),
  'create_order_atomic_def', (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_order_atomic'),
  'restore_stock_quantity_def', (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='restore_stock_quantity'),
  'decrement_stock_def', (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='decrement_stock'),
  'audit_funcs', (select coalesce(json_agg(json_build_object('name',p.proname,'def',pg_get_functiondef(p.oid))),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('audit_trigger_func','audit_log_trigger')),
  'audit_triggers', (select coalesce(json_agg(json_build_object('table',event_object_table,'name',trigger_name,'timing',action_timing,'event',event_manipulation,'stmt',action_statement)),'[]') from information_schema.triggers where trigger_schema='public' and action_statement ilike '%audit%'),
  'triggers_on_products', (select coalesce(json_agg(json_build_object('name',trigger_name,'timing',action_timing,'event',event_manipulation,'stmt',action_statement)),'[]') from information_schema.triggers where trigger_schema='public' and event_object_table='products'),
  'rls_products_profiles_orders', (select coalesce(json_agg(json_build_object('table',tablename,'name',policyname,'cmd',cmd,'roles',roles,'qual',qual,'with_check',with_check) order by tablename,policyname),'[]') from pg_policies where schemaname='public' and tablename in ('products','profiles','orders','audit_logs')),
  'realtime_tables', (select coalesce(json_agg(prel.relname),'[]') from pg_publication pub join pg_publication_rel ppr on pub.oid=ppr.prpubid join pg_class prel on prel.oid=ppr.prrelid join pg_namespace n on n.oid=prel.relnamespace where pub.pubname='supabase_realtime' and n.nspname='public')
) as warehouse_dump;
