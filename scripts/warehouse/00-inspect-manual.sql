
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
