-- ============================================================================
-- فحص تمهيدي قراءة فقط (READ-ONLY) قبل تنفيذ ترحيل إزالة كود التحقق (DEC-36)
-- الملف المرجعي: scripts/storefront/03-remove-verification-code.sql
-- لا يعدل أي شيء إطلاقاً — انسخه كاملاً إلى Supabase SQL Editor ونفّذه،
-- ثم أرسل كامل الناتج (نتيجة كل استعلام بترتيبها) للمطابقة.
-- ============================================================================

-- ═══ 1) تواقيع دالة إنشاء الطلبات الموجودة فعلاً (كشف التحميل الزائد) ═══
select p.oid::regprocedure::text as signature,
       pg_get_userbyid(p.proowner) as owner
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'create_order_atomic';

-- ═══ 2) التعريف الحي الكامل للدالة (الأهم — للمطابقة الحرفية) ═══
select pg_get_functiondef(p.oid) as live_create_order_atomic
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'create_order_atomic';

-- ═══ 3) هل عمود كود التحقق موجود في orders ═══
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'orders'
   and column_name = 'verification_code';

-- ═══ 4) كل أعمدة orders (التأصيل الهيكلي: latitude/longitude/invoice_number...) ═══
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'orders'
 order by ordinal_position;

-- ═══ 5) الفهرس الفريد لكود التحقق ═══
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and tablename = 'orders'
   and indexdef ilike '%verification%';

-- ═══ 6) دالة ترقيم الفواتير (تعتمد عليها الدالة الحية) ═══
select pg_get_functiondef(p.oid) as get_next_invoice_number_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'get_next_invoice_number';

-- ═══ 7) جداول المخازن الثلاثة (تكامل 02-migrate) ═══
select table_name, table_type
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('warehouses', 'warehouse_items', 'warehouse_movements');

-- ═══ 8) أعمدة warehouse_movements المرجعية ═══
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'warehouse_movements'
 order by ordinal_position;

-- ═══ 9) أي دالة في المخطط العام ما زالت تشير إلى كود التحقق (بالمسمى أو الجسم) ═══
select p.oid::regprocedure::text as signature
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and (p.proname ilike '%verification%'
        or pg_get_functiondef(p.oid) ilike '%verification_code%');

-- ═══ 10) أي عرض (View) يشير إلى كود التحقق ═══
select viewname
  from pg_views
 where schemaname = 'public'
   and definition ilike '%verification_code%';

-- ═══ 11) أي مشغل (Trigger) يشير إلى كود التحقق ═══
select trigger_name, event_object_table, action_statement
  from information_schema.triggers
 where trigger_schema = 'public'
   and action_statement ilike '%verification_code%';

-- ═══ 12) أي سياسة RLS تشير إلى كود التحقق + كل سياسات orders ═══
select schemaname, tablename, policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and (coalesce(qual, '') ilike '%verification_code%'
        or coalesce(with_check, '') ilike '%verification_code%');

select policyname, cmd, roles
  from pg_policies
 where schemaname = 'public' and tablename = 'orders'
 order by policyname;

-- ═══ 13) صلاحيات التنفيذ الحالية على دالة إنشاء الطلبات ═══
select grantee, privilege_type
  from information_schema.role_routine_grants
 where routine_schema = 'public' and routine_name = 'create_order_atomic';

-- ═══ 14) أعمدة profiles التي تعتمد عليها الدالة (support_phone وغيرها) ═══
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
   and column_name in ('support_phone', 'store_name', 'address', 'phone',
                       'free_delivery_threshold', 'latitude', 'longitude');

-- ═══ 15) بنية cart_items (الدالة تحذف بـ cart_item_id) ═══
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'cart_items'
 order by ordinal_position;

-- ═══ 16) توزيع حالات الطلبات (استيعاب أثر حذف العمود على البيانات) ═══
select status, count(*) as orders_count
  from orders
 group by status
 order by orders_count desc;
