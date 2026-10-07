-- ============================================================================
-- جُملتي — 07-pool-origin.sql (تنفيذ يدوي واحد في SQL Editor)
-- ----------------------------------------------------------------------------
-- مبدأ «الـ Pool هو المكان الموحد للمواد»: عندما يضيف تاجر مادة من واجهته
-- غير موجودة في الكتالوج المركزي، تُرفع إليه منسوبة إليه (إشارة مصدر) —
-- مع بقاء أسعاره ووحداته البيعية خاصة به فقط.
--
-- ماذا يفعل هذا السكربت؟
--   1) عمود origin على master_products: 'admin' (من إدارة المواد) أو 'merchant'
--      (مساهمة تاجر) — القائمة القديمة كلها تُصنف admin تلقائياً.
--   2) سياسة إدخال للمساهمات: التاجر (أو موظفه بصلاحية الأسعار) يضيف مادة
--      origin='merchant' و created_by = نفسه فقط — ولا يعدّل مواد غيره.
--   3) مشغل تدقيق INSERT على master_products (كان التدقيق القديم UPDATE/DELETE
--      فقط) لتوثيق «من أضاف أي مادة ومتى» تاريخياً.
--   4) فحص ختامي للقراءة فقط يطبع نتيجة التحقق — انسخها للمحادثة.
-- ============================================================================

alter table public.master_products add column if not exists origin text not null default 'admin';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.master_products'::regclass
      and conname = 'master_products_origin_check'
  ) then
    alter table public.master_products
      add constraint master_products_origin_check check (origin in ('admin', 'merchant'));
  end if;
end $$;

drop policy if exists master_products_merchant_insert on public.master_products;
create policy master_products_merchant_insert on public.master_products
  for insert with check (
    origin = 'merchant'
    and created_by = auth.uid()
    and (
      public.get_user_role(auth.uid()) = 'merchant'
      or public.staff_has_perm(public.get_staff_parent(auth.uid()), 'pricing')
    )
  );

drop trigger if exists audit_master_products_insert on public.master_products;
create trigger audit_master_products_insert
  after insert on public.master_products
  for each row execute function public.audit_trigger_func();

-- ============================================================================
-- ترحيل «الكتالوج يعلم كل شيء»: كل منتج تاجر غير مرتبط بالكتالوج يُربط أو يُرفع
--   1) مطابقة بالاسم المطابق تماماً مع أي مادة كتالوج (تفضيل مساهمة التاجر نفسه) → ربط
--   2) ما بقي بلا مطابقة → مادة كتالوج جديدة origin='merchant' منسوبة لصاحبها → ربط
-- الخطوتان idempotent (تفلتر على master_product_id is null) — آمن إعادة تنفيذهما
-- ============================================================================

-- 1) ربط بما هو موجود في الكتالوج (مطابقة اسم مطابق، مفضلين مساهمة صاحب المنتج ثم الأقدم)
with matched as (
  select distinct on (p.id)
    p.id as product_id, m.id as master_id
  from public.products p
  join public.master_products m
    on lower(m.name) = lower(btrim(p.name))
  where p.master_product_id is null
    and p.merchant_id is not null
  order by p.id,
           (m.origin = 'merchant' and m.created_by = p.merchant_id) desc,
           m.created_at asc
)
update public.products p
set master_product_id = matched.master_id
from matched
where p.id = matched.product_id;

-- 2) ما بقي بلا مطابقة → مواد كتالوج جديدة منسوبة (وحدات بلا أسعار — الأسعار تبقى لدى التاجر)
with unlinked as (
  select distinct on (p.merchant_id, lower(btrim(p.name)))
    p.merchant_id, btrim(p.name) as clean_name, p.description, p.category_id,
    p.image_url, p.price, p.units, p.unit_conversions
  from public.products p
  where p.master_product_id is null
    and p.merchant_id is not null
  order by p.merchant_id, lower(btrim(p.name)), p.created_at asc
), inserted as (
  insert into public.master_products
    (name, description, category_id, image_url, base_price, units, unit_conversions, created_by, origin)
  select u.clean_name, u.description, u.category_id, u.image_url, u.price,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'type', ue->>'type',
             'multiplier_to_base', coalesce((ue->>'multiplier_to_base')::numeric, 1)
           ) order by ord)
           from jsonb_array_elements(coalesce(u.units, '[]'::jsonb)) with ordinality as t(ue, ord)
         ), '[]'::jsonb),
         coalesce(u.unit_conversions, '[]'::jsonb),
         u.merchant_id, 'merchant'
  from unlinked u
  returning id, name, created_by
)
update public.products p
set master_product_id = i.id
from inserted i
where p.master_product_id is null
  and p.merchant_id is not null
  and lower(btrim(p.name)) = lower(i.name)
  and p.merchant_id = i.created_by;

-- الفحص الختامي — انسخ ناتج الخلية pool_origin_verify والصقه في المحادثة
select json_build_object(
  'origin_column', (select json_build_object('exists', count(*) > 0, 'default', min(column_default))
    from information_schema.columns
    where table_schema = 'public' and table_name = 'master_products' and column_name = 'origin'),
  'origin_check', (select pg_get_constraintdef(oid) from pg_constraint
    where conrelid = 'public.master_products'::regclass and conname = 'master_products_origin_check'),
  'merchant_insert_policy', (select with_check from pg_policies
    where schemaname = 'public' and tablename = 'master_products' and policyname = 'master_products_merchant_insert'),
  'insert_trigger', (select count(*) from information_schema.triggers
    where trigger_schema = 'public' and event_object_table = 'master_products' and trigger_name = 'audit_master_products_insert'),
  'existing_rows_origin', (select json_object_agg(coalesce(origin, 'null'), cnt)
    from (select origin, count(*) cnt from public.master_products group by origin) s),
  'backfill_result', (select json_build_object(
    'products_still_unlinked', (select count(*) from public.products where merchant_id is not null and master_product_id is null),
    'products_linked_total', (select count(*) from public.products where merchant_id is not null and master_product_id is not null),
    'merchant_origin_masters', (select count(*) from public.master_products where origin = 'merchant')))
) as pool_origin_verify;
