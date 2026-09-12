-- ============================================================
-- سكربت: إنشاء الطلب كمعاملة SQL واحدة (ذرية كاملة)
-- يُنفَّذ مرة واحدة في SQL Editor في Supabase
-- الفائدة: مئات الطلبات المتزامنة بلا تعارضات — أي فشل
-- (كمية غير كافية مثلاً) يتراجع عن كل شيء تلقائياً
-- ============================================================

create or replace function public.create_order_atomic(
  p_merchant_id uuid,
  p_verification_code text,
  p_store_name text,
  p_address text,
  p_phone text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total_rounded numeric,
  p_is_credit boolean default false,
  p_amount_paid numeric default null,
  p_items jsonb
)
returns table (order_id uuid, invoice_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_support_phone text;
  v_editing_id uuid;
  v_editing_invoice text;
  v_invoice text;
  v_new_order_id uuid;
  v_item jsonb;
  v_rec record;
  v_unit jsonb;
  v_units jsonb;
  v_multiplier numeric := 1;
  v_qty_base numeric;
  v_lat text;
  v_lon text;
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
    -- إرجاع مخزون عناصر الطلب القديم
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

      update products
         set stock_quantity = coalesce(stock_quantity, 0) + (v_rec.quantity * v_multiplier)
       where products.id = v_rec.product_id;
    end loop;

    delete from order_items oi where oi.order_id = v_editing_id;
  end if;

  -- 4. خصم المخزون ذرياً — نقص أي كمية يتراجع عن المعاملة كاملة
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

    update products
       set stock_quantity = coalesce(stock_quantity, 0) - v_qty_base
     where products.id = (v_item->>'product_id')::uuid
       and coalesce(stock_quantity, 0) >= v_qty_base;

    if not found then
      raise exception 'عذراً، الكمية غير متوفرة في المخزن للمنتج: %', v_item->>'product_name';
    end if;
  end loop;

  -- 5. إنشاء أو تحديث الطلب
  if v_editing_id is not null then
    update orders set
      verification_code = p_verification_code,
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
    v_invoice := v_editing_invoice;
  else
    v_invoice := public.get_next_invoice_number(p_merchant_id)::text;

    insert into orders (
      user_id, merchant_id, verification_code, store_name, address, phone,
      subtotal, delivery_fee, total_rounded, status, support_phone,
      invoice_number, is_credit, amount_paid, latitude, longitude
    ) values (
      v_user_id, p_merchant_id, p_verification_code, p_store_name, p_address, p_phone,
      p_subtotal, p_delivery_fee, p_total_rounded, 'pending', v_support_phone,
      v_invoice, p_is_credit, coalesce(p_amount_paid, p_total_rounded),
      nullif(v_lat, '')::numeric, nullif(v_lon, '')::numeric
    )
    returning id into v_new_order_id;
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

  return query select v_new_order_id, v_invoice;
end;
$$;

revoke all on function public.create_order_atomic(uuid, text, text, text, text, numeric, numeric, numeric, boolean, numeric, jsonb) from public;
grant execute on function public.create_order_atomic(uuid, text, text, text, text, numeric, numeric, numeric, boolean, numeric, jsonb) to authenticated;
