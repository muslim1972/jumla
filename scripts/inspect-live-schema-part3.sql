-- ==============================================================================
-- سكربت معاينة - الجزء الثالث والأخير (للقراءة فقط، لا يعدّل شيئاً)
-- الأقسام التي انقطعت سابقاً فقط — نتيجة صغيرة:
--   الدوال (والتحقق من get_user_role) | المشغلات | المفاتيح الأجنبية
--   + شرائح قيود الدور (profiles_role_check و orders_status_check)
-- نفّذه والصق النتيجة (أو Export → JSON)
-- ==============================================================================

select json_build_object(
  'role_check_clause', (
    select cc.check_clause
    from information_schema.table_constraints tc
    join information_schema.check_constraints cc
      on cc.constraint_schema = tc.constraint_schema
     and cc.constraint_name = tc.constraint_name
    where tc.table_schema = 'public'
      and tc.table_name = 'profiles'
      and tc.constraint_type = 'CHECK'
      and cc.check_clause like '%role%'
    limit 1
  ),
  'status_check_clause', (
    select cc.check_clause
    from information_schema.table_constraints tc
    join information_schema.check_constraints cc
      on cc.constraint_schema = tc.constraint_schema
     and cc.constraint_name = tc.constraint_name
    where tc.table_schema = 'public'
      and tc.table_name = 'merchant_billings'
      and tc.constraint_type = 'CHECK'
      and cc.check_clause like '%status%'
    limit 1
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
) as schema_dump_part3;
