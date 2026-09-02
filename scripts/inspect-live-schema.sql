-- ==============================================================================
-- سكربت معاينة للقراءة فقط (لا يعدّل أي شيء في القاعدة)
-- الهدف: سحب صورة كاملة ودقيقة عن القاعدة الحية:
--   الجداول + حالة RLS | الأعمدة وأنواعها | السياسات الموجودة | القيود (CHECK + FK)
--   الدوال (وما بينها SECURITY DEFINER) | المشغلات
-- الاستخدام: نفّذه في SQL Editor ثم انسخ قيمة الخلية الوحيدة (schema_dump)
-- والصقها في المحادثة ليعاد فحص سكربت التحصين على الواقع لا على التخمين
-- ==============================================================================

select json_build_object(
  'tables', (
    select json_agg(json_build_object(
      'name', t.relname,
      'kind', case t.relkind when 'r' then 'table' when 'v' then 'view' when 'p' then 'partitioned' end,
      'rls_enabled', t.relrowsecurity,
      'rls_forced', t.relforcerowsecurity
    ) order by t.relname)
    from pg_class t
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relkind in ('r','v','p')
  ),
  'columns', (
    select json_agg(json_build_object(
      'table', c.table_name,
      'name', c.column_name,
      'type', c.data_type,
      'udt', c.udt_name,
      'nullable', c.is_nullable,
      'default', c.column_default
    ) order by c.table_name, c.ordinal_position)
    from information_schema.columns c
    where c.table_schema = 'public'
  ),
  'policies', (
    select json_agg(json_build_object(
      'table', p.tablename,
      'name', p.policyname,
      'permissive', p.permissive,
      'roles', p.roles,
      'cmd', p.cmd,
      'using', p.qual,
      'with_check', p.with_check
    ) order by p.tablename, p.policyname)
    from pg_policies p
    where p.schemaname = 'public'
  ),
  'check_constraints', (
    select json_agg(json_build_object(
      'table', tc.table_name,
      'name', tc.constraint_name,
      'clause', cc.check_clause
    ) order by tc.table_name, tc.constraint_name)
    from information_schema.table_constraints tc
    join information_schema.check_constraints cc
      on cc.constraint_schema = tc.constraint_schema
     and cc.constraint_name = tc.constraint_name
    where tc.table_schema = 'public' and tc.constraint_type = 'CHECK'
  ),
  'foreign_keys', (
    select json_agg(json_build_object(
      'table', tc.table_name,
      'column', kcu.column_name,
      'ref_table', ccu.table_name,
      'ref_column', ccu.column_name,
      'on_update', rc.update_rule,
      'on_delete', rc.delete_rule
    ) order by tc.table_name, kcu.column_name)
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_schema = tc.constraint_schema
     and kcu.constraint_name = tc.constraint_name
    join information_schema.referential_constraints rc
      on rc.constraint_schema = tc.constraint_schema
     and rc.constraint_name = tc.constraint_name
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_schema = rc.unique_constraint_schema
     and ccu.constraint_name = rc.unique_constraint_name
    where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'
  ),
  'functions', (
    select json_agg(json_build_object(
      'name', f.proname,
      'args', pg_get_function_identity_arguments(f.oid),
      'return_type', f.prorettype::regtype::text,
      'security_definer', f.prosecdef,
      'lang', l.lanname,
      'config', f.proconfig
    ) order by f.proname)
    from pg_proc f
    join pg_namespace n on n.oid = f.pronamespace
    join pg_language l on l.oid = f.prolang
    where n.nspname = 'public' and f.prokind = 'f'
  ),
  'triggers', (
    select json_agg(json_build_object(
      'table', t.event_object_table,
      'name', t.trigger_name,
      'timing', t.action_timing,
      'event', t.event_manipulation,
      'statement', t.action_statement
    ) order by t.event_object_table, t.trigger_name)
    from information_schema.triggers t
    where t.trigger_schema = 'public'
  )
) as schema_dump;
