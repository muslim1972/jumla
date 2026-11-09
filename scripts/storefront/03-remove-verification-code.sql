-- ============================================================================
-- استئصال ميزة كود التحقق من نظام الطلبات نهائياً (DEC-36)
-- يُنفَّذ يدوياً في Supabase SQL Editor — مرة واحدة
-- ----------------------------------------------------------------------------
-- ⚠️ تحذيرات إلزامية قبل التنفيذ:
--   1. الباقة المجانية بلا نسخ احتياطي (PITR): DROP COLUMN لا رجعة فيه،
--      وستمحو أكواد التحقق من الطلبات التاريخية نهائياً.
--   2. فحص تمهيدي (المسلمة 6): تأكد أولاً أن التعريف الحي يطابق التعريف
--      المرجعي بتنفيذ ما يلي ومقارنة الناتج مع تعريف الدالة في
--      scripts/warehouse/02-migrate.sql (بعد تطهيره من معامل كود التحقق):
--        select pg_get_functiondef('public.create_order_atomic(uuid, text, text, text, text, numeric, numeric, numeric, boolean, numeric, jsonb)'::regprocedure);
--   3. تسلسل النشر: ادفع كود التطبيق إلى GitHub أولاً، ثم نفّذ هذا الملف
--      فوراً ضمن نافذة بناء Vercel (~دقيقتين) حتى لا ينكسر إتمام الشراء.
-- ----------------------------------------------------------------------------

-- 1. إنشاء الدالة الجديدة (10 معاملات) — منسوخة حرفياً من التعريف الحي
--    في warehouse/02-migrate.sql مع حذف معامل كود التحقق فقط لا غير
--    (التكامل الكامل مع نظام المخازن ودفتر warehouse_movements محفوظ)
create or replace function public.create_order_atomic(p_merchant_id uuid, p_store_name text, p_address text, p_phone text, p_subtotal numeric, p_delivery_fee numeric, p_total_rounded numeric, p_is_credit boolean, p_amount_paid numeric, p_items jsonb)
 returns table(order_id uuid, invoice_number text)
 language plpgsql
 security definer
 set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_support_phone text;
  v_editing_id uuid;
  v_editing_invoice integer;
  v_invoice_num integer;
  v_new_order_id uuid;
  v_item jsonb;
  v_rec record;
  v_unit jsonb;
  v_units jsonb;
  v_multiplier numeric := 1;
  v_qty_base numeric;
  v_lat text;
  v_lon text;
  -- نظام المخازن: بند المخزن الافتراضي وحركته
  v_item_id uuid;
  v_new_balance integer;
  v_default_warehouse uuid;
  v_movements jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  -- 1. تحديث بيانات المشتري
  update profiles
     set store_name = p_store_name,
         address = p_address,
         phone = p_phone
   where profiles.id = v_user_id;

  -- 2. هاتف الدعم الخاص بالتاجر
  select pr.support_phone into v_support_phone
    from profiles pr
   where pr.id = p_merchant_id;

  -- إحداثيات المشتري من metadata التسجيل (لزر فتح الخريطة عند المندوب)
  select u.raw_user_meta_data->>'latitude', u.raw_user_meta_data->>'longitude'
    into v_lat, v_lon
    from auth.users u
   where u.id = v_user_id;

  -- 3. فحص طلب قيد التعديل لنفس التاجر
  select o.id, o.invoice_number
    into v_editing_id, v_editing_invoice
    from orders o
   where o.user_id = v_user_id
     and o.merchant_id = p_merchant_id
     and o.status = 'editing'
   order by o.created_at desc
   limit 1;

  if v_editing_id is not null then
    -- إرجاع مخزون عناصر الطلب القديم — عبر بند المخزن الافتراضي إن وجد وإلا بطريقة المنتجات
    for v_rec in
      select oi.product_id, oi.quantity, oi.unit_type
        from order_items oi
       where oi.order_id = v_editing_id
    loop
      select p.units into v_units from products p where p.id = v_rec.product_id;

      v_multiplier := 1;
      if v_units is not null then
        for v_unit in select * from jsonb_array_elements(v_units) loop
          if v_unit->>'type' = v_rec.unit_type and v_unit ? 'multiplier_to_base' then
            v_multiplier := (v_unit->>'multiplier_to_base')::numeric;
          end if;
        end loop;
      end if;

      v_qty_base := (v_rec.quantity * v_multiplier);

      select wi.id, wi.warehouse_id into v_item_id, v_default_warehouse
        from warehouse_items wi
        join warehouses w on w.id = wi.warehouse_id
       where wi.product_id = v_rec.product_id and w.is_default = true
       limit 1;

      if v_item_id is not null then
        update warehouse_items
           set quantity = (quantity + ceil(v_qty_base))::int
         where id = v_item_id
        returning quantity into v_new_balance;

        v_movements := v_movements || jsonb_build_object(
          'product_id', v_rec.product_id,
          'qty', ceil(v_qty_base)::int,
          'balance', v_new_balance,
          'kind', 'order_restore'
        )::jsonb;
      else
        update products
           set stock_quantity = coalesce(stock_quantity, 0) + ceil(v_qty_base)::int
         where products.id = v_rec.product_id;
      end if;
      v_item_id := null;
    end loop;

    delete from order_items oi where oi.order_id = v_editing_id;
  end if;

  -- 4. خصم المخزون ذرياً — نقص أي كمية يتراجع عن المعاملة كاملة
  --    (من بند المخزن الافتراضي عند تفعيل وحدة المخازن، وإلا من products كالسابق)
  for v_item in select * from jsonb_array_elements(p_items) loop
    select p.units into v_units from products p where p.id = (v_item->>'product_id')::uuid;

    v_multiplier := 1;
    if v_units is not null then
      for v_unit in select * from jsonb_array_elements(v_units) loop
        if v_unit->>'type' = v_item->>'unit_type' and v_unit ? 'multiplier_to_base' then
          v_multiplier := (v_unit->>'multiplier_to_base')::numeric;
        end if;
      end loop;
    end if;

    v_qty_base := (v_item->>'quantity')::numeric * v_multiplier;

    select wi.id, wi.warehouse_id into v_item_id, v_default_warehouse
      from warehouse_items wi
      join warehouses w on w.id = wi.warehouse_id
     where wi.product_id = (v_item->>'product_id')::uuid and w.is_default = true
     limit 1;

    if v_item_id is not null then
      update warehouse_items wi
         set quantity = (wi.quantity - ceil(v_qty_base))::int
       where wi.id = v_item_id
         and wi.quantity >= ceil(v_qty_base)
      returning wi.quantity into v_new_balance;

      if not found then
        raise exception 'عذراً، الكمية غير متوفرة في المخزن للمنتج: %', v_item->>'product_name';
      end if;

      v_movements := v_movements || jsonb_build_object(
        'product_id', (v_item->>'product_id')::uuid,
        'qty', -ceil(v_qty_base)::int,
        'balance', v_new_balance,
        'kind', 'order_deduction'
      )::jsonb;
    else
      update products
         set stock_quantity = coalesce(stock_quantity, 0) - v_qty_base
       where products.id = (v_item->>'product_id')::uuid
         and coalesce(stock_quantity, 0) >= v_qty_base;

      if not found then
        raise exception 'عذراً، الكمية غير متوفرة في المخزن للمنتج: %', v_item->>'product_name';
      end if;
    end if;
    v_item_id := null;
  end loop;

  -- 5. إنشاء أو تحديث الطلب
  if v_editing_id is not null then
    update orders set
      store_name = p_store_name,
      address = p_address,
      phone = p_phone,
      subtotal = p_subtotal,
      delivery_fee = p_delivery_fee,
      total_rounded = p_total_rounded,
      status = 'pending',
      support_phone = v_support_phone,
      is_credit = p_is_credit,
      amount_paid = coalesce(p_amount_paid, p_total_rounded),
      latitude = nullif(v_lat, '')::numeric,
      longitude = nullif(v_lon, '')::numeric
     where orders.id = v_editing_id;

    v_new_order_id := v_editing_id;
    v_invoice_num := v_editing_invoice;
  else
    v_invoice_num := public.get_next_invoice_number(p_merchant_id);

    insert into orders (
      user_id, merchant_id, store_name, address, phone,
      subtotal, delivery_fee, total_rounded, status, support_phone,
      invoice_number, is_credit, amount_paid, latitude, longitude
    ) values (
      v_user_id, p_merchant_id, p_store_name, p_address, p_phone,
      p_subtotal, p_delivery_fee, p_total_rounded, 'pending', v_support_phone,
      v_invoice_num, p_is_credit, coalesce(p_amount_paid, p_total_rounded),
      nullif(v_lat, '')::numeric, nullif(v_lon, '')::numeric
    )
    returning id into v_new_order_id;
  end if;

  -- 4.5 توثيق حركات الخصم/الاسترجاع في دفتر المخزن بمرجع الطلب
  if v_default_warehouse is not null and jsonb_array_length(v_movements) > 0 then
    insert into warehouse_movements
      (merchant_id, warehouse_id, product_id, kind, quantity, balance_after, reference_type, reference_id, note, performed_by)
    select p_merchant_id, v_default_warehouse, (m->>'product_id')::uuid, m->>'kind',
           (m->>'qty')::int, (m->>'balance')::int, 'orders', v_new_order_id,
           case m->>'kind' when 'order_deduction' then 'خصم أمر بيع' else 'استرجاع بتعديل طلب' end,
           null
      from jsonb_array_elements(v_movements) as m;
  end if;

  -- 6. عناصر الطلب
  insert into order_items (order_id, product_id, product_name, product_price, quantity, unit_type)
  select v_new_order_id,
         (it->>'product_id')::uuid,
         it->>'product_name',
         (it->>'product_price')::numeric,
         (it->>'quantity')::numeric,
         it->>'unit_type'
    from jsonb_array_elements(p_items) as it;

  -- 7. حذف عناصر السلة المطلوبة
  delete from cart_items ci
   where ci.id::text in (
     select it->>'cart_item_id' from jsonb_array_elements(p_items) as it
   );

  return query select v_new_order_id, v_invoice_num::text;
end;
$$;

-- 2. تحصين صلاحيات التوقيع الجديد (كما في الأصل: سحب من PUBLIC ومنح للمصادقين)
revoke all on function public.create_order_atomic(uuid, text, text, text, numeric, numeric, numeric, boolean, numeric, jsonb) from public;
grant execute on function public.create_order_atomic(uuid, text, text, text, numeric, numeric, numeric, boolean, numeric, jsonb) to authenticated;

-- 3. حذف التوقيع القديم (11 معاملاً مع كود التحقق) لمنع عودة الميزة أو التباس التحميل الزائد
drop function if exists public.create_order_atomic(uuid, text, text, text, text, numeric, numeric, numeric, boolean, numeric, jsonb);

-- 4. حذف الفهرس الفريد لكود التحقق
drop index if exists idx_orders_verification_code;

-- 5. حذف عمود كود التحقق من جدول الطلبات نهائياً
alter table orders drop column if exists verification_code;
