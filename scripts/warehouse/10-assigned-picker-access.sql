begin;

drop policy if exists picking_lists_select on public.picking_lists;
create policy picking_lists_select on public.picking_lists
  for select using (
    merchant_id = auth.uid()
    or public.get_user_role(auth.uid()) in ('delivery', 'admin', 'support')
    or (
      public.staff_is_active_of(merchant_id)
      and (
        public.staff_has_perm(merchant_id, 'sales')
        or public.staff_has_perm(merchant_id, 'warehouse')
        or (
          picker_id = auth.uid()
          and public.staff_has_perm(merchant_id, 'picking')
        )
      )
    )
  );

drop policy if exists picking_lists_insert on public.picking_lists;
create policy picking_lists_insert on public.picking_lists
  for insert with check (
    merchant_id = auth.uid()
    or public.staff_has_perm(merchant_id, 'sales')
    or public.staff_has_perm(merchant_id, 'warehouse')
  );

drop policy if exists picking_lists_update on public.picking_lists;
create policy picking_lists_update on public.picking_lists
  for update using (
    merchant_id = auth.uid()
    or public.get_user_role(auth.uid()) = 'delivery'
    or (
      public.staff_is_active_of(merchant_id)
      and (
        public.staff_has_perm(merchant_id, 'sales')
        or public.staff_has_perm(merchant_id, 'warehouse')
      )
    )
  ) with check (
    merchant_id = auth.uid()
    or public.get_user_role(auth.uid()) = 'delivery'
    or (
      public.staff_is_active_of(merchant_id)
      and (
        public.staff_has_perm(merchant_id, 'sales')
        or public.staff_has_perm(merchant_id, 'warehouse')
      )
    )
  );

drop policy if exists picking_lists_delete on public.picking_lists;
create policy picking_lists_delete on public.picking_lists
  for delete using (merchant_id = auth.uid());

drop policy if exists picking_list_items_select on public.picking_list_items;
create policy picking_list_items_select on public.picking_list_items
  for select using (
    exists (
      select 1
      from public.picking_lists pl
      where pl.id = picking_list_id
        and (
          pl.merchant_id = auth.uid()
          or public.get_user_role(auth.uid()) in ('delivery', 'admin', 'support')
          or (
            public.staff_is_active_of(pl.merchant_id)
            and (
              public.staff_has_perm(pl.merchant_id, 'sales')
              or public.staff_has_perm(pl.merchant_id, 'warehouse')
              or (
                pl.picker_id = auth.uid()
                and public.staff_has_perm(pl.merchant_id, 'picking')
              )
            )
          )
        )
    )
  );

drop policy if exists picking_list_items_write on public.picking_list_items;
drop policy if exists picking_list_items_insert on public.picking_list_items;
create policy picking_list_items_insert on public.picking_list_items
  for insert with check (
    exists (
      select 1
      from public.picking_lists pl
      where pl.id = picking_list_id
        and (
          pl.merchant_id = auth.uid()
          or public.staff_has_perm(pl.merchant_id, 'sales')
          or public.staff_has_perm(pl.merchant_id, 'warehouse')
        )
    )
  );

drop policy if exists picking_list_items_update on public.picking_list_items;
create policy picking_list_items_update on public.picking_list_items
  for update using (
    exists (
      select 1
      from public.picking_lists pl
      where pl.id = picking_list_id
        and (
          pl.merchant_id = auth.uid()
          or public.staff_has_perm(pl.merchant_id, 'sales')
          or public.staff_has_perm(pl.merchant_id, 'warehouse')
        )
    )
  ) with check (
    exists (
      select 1
      from public.picking_lists pl
      where pl.id = picking_list_id
        and (
          pl.merchant_id = auth.uid()
          or public.staff_has_perm(pl.merchant_id, 'sales')
          or public.staff_has_perm(pl.merchant_id, 'warehouse')
        )
    )
  );

drop policy if exists picking_list_items_delete on public.picking_list_items;
create policy picking_list_items_delete on public.picking_list_items
  for delete using (
    exists (
      select 1
      from public.picking_lists pl
      where pl.id = picking_list_id
        and (
          pl.merchant_id = auth.uid()
          or public.staff_has_perm(pl.merchant_id, 'sales')
          or public.staff_has_perm(pl.merchant_id, 'warehouse')
        )
    )
  );

create or replace function public.get_assigned_picking_lists()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  select p.parent_merchant_id
    into v_merchant_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'merchant_staff'
    and p.is_active;

  if v_merchant_id is null
     or not public.staff_has_perm(v_merchant_id, 'picking') then
    raise exception 'لا تملك صلاحية عرض قوائم التجهيز المعيّنة لك';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'order_id', o.id,
        'invoice_number', o.invoice_number,
        'store_name', o.store_name,
        'issued_at', pl.issued_at,
        'status', pl.status
      )
      order by pl.issued_at desc nulls last
    )
    from public.picking_lists pl
    join public.orders o on o.id = pl.order_id
    where pl.merchant_id = v_merchant_id
      and pl.picker_id = auth.uid()
      and pl.status in ('issued', 'picked')
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_assigned_picking_lists() from public, anon;
grant execute on function public.get_assigned_picking_lists() to authenticated;

create or replace function public.assign_picking_worker(
  p_list_id uuid,
  p_picker_staff_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list public.picking_lists%rowtype;
  v_picker_name text;
  v_invoice_number integer;
begin
  if auth.uid() is null then
    raise exception 'غير مصرح';
  end if;

  select *
    into v_list
  from public.picking_lists
  where id = p_list_id
  for update;

  if not found then
    raise exception 'قائمة التجهيز غير موجودة';
  end if;

  if auth.uid() <> v_list.merchant_id
     and not public.staff_has_perm(v_list.merchant_id, 'warehouse') then
    raise exception 'اعتماد القوائم محصور بصاحب المتجر أو موظف المخازن';
  end if;

  if v_list.status <> 'issued' then
    raise exception 'لا يمكن تعيين عامل بعد بدء تسليم القائمة أو إنهائها';
  end if;

  select p.full_name
    into v_picker_name
  from public.profiles p
  where p.id = p_picker_staff_id
    and p.role = 'merchant_staff'
    and p.is_active
    and p.parent_merchant_id = v_list.merchant_id
    and p.permissions @> '["picking"]'::jsonb;

  if not found then
    raise exception 'عامل التجهيز يجب أن يكون موظفاً نشطاً بصلاحية التجهيز';
  end if;

  select o.invoice_number
    into v_invoice_number
  from public.orders o
  where o.id = v_list.order_id
    and o.merchant_id = v_list.merchant_id;

  if not found then
    raise exception 'تعذر العثور على أمر البيع المرتبط بالقائمة';
  end if;

  update public.picking_lists
  set picker_id = p_picker_staff_id,
      picker_name = v_picker_name
  where id = p_list_id;

  return jsonb_build_object(
    'order_id', v_list.order_id,
    'invoice_number', v_invoice_number
  );
end;
$$;

revoke all on function public.assign_picking_worker(uuid, uuid) from public, anon;
grant execute on function public.assign_picking_worker(uuid, uuid) to authenticated;

create or replace function public.confirm_picking_atomic(
  p_list_id uuid,
  p_confirmations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list public.picking_lists%rowtype;
  v_input jsonb;
  v_item public.picking_list_items%rowtype;
  v_confirmed_numeric numeric;
  v_confirmed integer;
  v_shortage integer;
  v_multiplier numeric;
  v_base_quantity integer;
  v_balance integer;
  v_new_balance integer;
  v_warehouse_item_id uuid;
  v_shortage_count integer := 0;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'غير مصرح';
  end if;

  select *
    into v_list
  from public.picking_lists
  where id = p_list_id
  for update;

  if not found then
    raise exception 'القائمة غير موجودة';
  end if;

  if auth.uid() <> v_list.merchant_id
     and not (
       public.staff_is_active_of(v_list.merchant_id)
       and (
         public.staff_has_perm(v_list.merchant_id, 'warehouse')
         or (
           v_list.picker_id = auth.uid()
           and public.staff_has_perm(v_list.merchant_id, 'picking')
         )
       )
     ) then
    raise exception 'الجمع محصور بعامل التجهيز المعيّن أو موظف المخازن';
  end if;

  if v_list.status <> 'issued' then
    raise exception 'القائمة ليست في مرحلة الجمع';
  end if;

  if jsonb_typeof(p_confirmations) is distinct from 'array' then
    raise exception 'بيانات تأكيد الجمع غير صالحة';
  end if;

  if jsonb_array_length(p_confirmations) = 0
     or jsonb_array_length(p_confirmations) <> (
       select count(*)
       from public.picking_list_items pli
       where pli.picking_list_id = v_list.id
     ) then
    raise exception 'يجب تأكيد كل بنود القائمة مرة واحدة';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_confirmations) c(value)
    where jsonb_typeof(c.value) is distinct from 'object'
       or jsonb_typeof(c.value->'item_id') is distinct from 'string'
       or (c.value->>'item_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(c.value->'confirmed_quantity') is distinct from 'number'
       or (c.value->>'confirmed_quantity') !~ '^[0-9]+$'
       or (
         c.value ? 'shortage_reason'
         and jsonb_typeof(c.value->'shortage_reason') not in ('string', 'null')
       )
       or (
         jsonb_typeof(c.value->'shortage_reason') = 'string'
         and length(c.value->>'shortage_reason') > 500
       )
  ) then
    raise exception 'بيانات تأكيد الجمع غير صالحة';
  end if;

  if (
    select count(distinct c.value->>'item_id')
    from jsonb_array_elements(p_confirmations) c(value)
  ) <> jsonb_array_length(p_confirmations) then
    raise exception 'لا يجوز تكرار بند في تأكيد الجمع';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_confirmations) c(value)
    left join public.picking_list_items pli
      on pli.id = (c.value->>'item_id')::uuid
     and pli.picking_list_id = v_list.id
    where pli.id is null
  ) then
    raise exception 'تتضمن البيانات بنداً لا يتبع هذه القائمة';
  end if;

  for v_input in
    select value
    from jsonb_array_elements(p_confirmations)
  loop
    select *
      into v_item
    from public.picking_list_items pli
    where pli.id = (v_input->>'item_id')::uuid
      and pli.picking_list_id = v_list.id
    for update;
    if not found then
      raise exception 'تعذر العثور على بند القائمة أثناء التأكيد';
    end if;

    v_confirmed_numeric := (v_input->>'confirmed_quantity')::numeric;
    if v_confirmed_numeric <> trunc(v_confirmed_numeric)
       or v_confirmed_numeric < 0
       or v_confirmed_numeric > v_item.ordered_quantity then
      raise exception 'الكمية المؤكدة خارج النطاق المسموح';
    end if;

    v_confirmed := v_confirmed_numeric::integer;
    v_shortage := v_item.ordered_quantity - v_confirmed;
    v_reason := case
      when v_shortage > 0 then coalesce(nullif(trim(v_input->>'shortage_reason'), ''), 'غير محدد')
      else null
    end;

    update public.picking_list_items
    set confirmed_quantity = v_confirmed,
        shortage_quantity = v_shortage,
        shortage_reason = v_reason
    where id = v_item.id;

    if v_shortage > 0 then
      if v_item.product_id is not null then
        select coalesce(max((u.value->>'multiplier_to_base')::numeric), 1)
          into v_multiplier
        from public.products p
        cross join lateral jsonb_array_elements(coalesce(p.units, '[]'::jsonb)) u(value)
        where p.id = v_item.product_id
          and p.merchant_id = v_list.merchant_id
          and u.value->>'type' = v_item.unit_type;

        if v_multiplier <= 0 then
          raise exception 'تعذر تحويل وحدة النقص إلى وحدة المخزن';
        end if;

        v_base_quantity := ceil(v_shortage * coalesce(v_multiplier, 1))::integer;
        if v_base_quantity > 0 then
          select wi.id, wi.quantity
            into v_warehouse_item_id, v_balance
          from public.warehouse_items wi
          where wi.merchant_id = v_list.merchant_id
            and wi.warehouse_id = v_list.warehouse_id
            and wi.product_id = v_item.product_id
          for update;

          if not found then
            raise exception 'تعذر العثور على بند المخزن لإرجاع النقص';
          end if;

          v_new_balance := v_balance + v_base_quantity;
          update public.warehouse_items
          set quantity = v_new_balance,
              updated_at = now()
          where id = v_warehouse_item_id;

          insert into public.warehouse_movements (
            merchant_id,
            warehouse_id,
            product_id,
            kind,
            quantity,
            balance_after,
            reference_type,
            reference_id,
            note,
            performed_by
          )
          values (
            v_list.merchant_id,
            v_list.warehouse_id,
            v_item.product_id,
            'shortage_return',
            v_base_quantity,
            v_new_balance,
            'picking_list_items',
            v_item.id,
            format('إرجاع نقص قائمة التجهيز — المسؤول: %s', coalesce(v_list.picker_name, 'غير معيّن')),
            auth.uid()
          );
          v_shortage_count := v_shortage_count + 1;
        end if;
      end if;
    end if;
  end loop;

  update public.picking_lists
  set status = 'picked',
      picked_at = now()
  where id = v_list.id;

  return jsonb_build_object('success', true, 'shortages', v_shortage_count);
end;
$$;

revoke all on function public.confirm_picking_atomic(uuid, jsonb) from public, anon;
grant execute on function public.confirm_picking_atomic(uuid, jsonb) to authenticated;

create or replace function public.confirm_picking_handover(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_list public.picking_lists%rowtype;
  v_delivery_name text;
begin
  if auth.uid() is null then
    raise exception 'غير مصرح';
  end if;

  select p.full_name
    into v_delivery_name
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'delivery';

  if not found then
    raise exception 'هذا الإجراء للمندوبين فقط';
  end if;

  select *
    into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'الطلب غير موجود';
  end if;

  select *
    into v_list
  from public.picking_lists pl
  where pl.order_id = p_order_id
  for update;

  if not found then
    if v_order.status <> 'approved' then
      raise exception 'الطلب غير جاهز للاستلام';
    end if;
    return jsonb_build_object('has_picking_list', false);
  end if;

  if v_list.merchant_id <> v_order.merchant_id then
    raise exception 'قائمة التجهيز لا تتبع التاجر المسجل في الطلب';
  end if;

  if v_list.status = 'handed_over' then
    if v_list.handed_over_by = auth.uid() then
      return jsonb_build_object(
        'has_picking_list', true,
        'already_confirmed', true,
        'order_id', v_order.id,
        'merchant_id', v_order.merchant_id,
        'invoice_number', v_order.invoice_number,
        'picker_name', v_list.picker_name
      );
    end if;
    raise exception 'تم تسجيل استلام القائمة من مندوب آخر';
  end if;

  if v_list.status <> 'picked' then
    raise exception 'لم يكتمل جمع القائمة بعد';
  end if;

  if v_order.status not in ('preparing', 'approved') then
    raise exception 'الطلب غير جاهز للاستلام';
  end if;

  update public.picking_lists
  set status = 'handed_over',
      handed_over_at = now(),
      handed_over_by = auth.uid(),
      handed_over_name = v_delivery_name
  where id = v_list.id
    and status = 'picked';

  if not found then
    raise exception 'تغيرت حالة القائمة قبل تسجيل الاستلام';
  end if;

  if v_order.status = 'preparing' then
    update public.orders
    set status = 'approved'
    where id = v_order.id
      and status = 'preparing';

    if not found then
      raise exception 'تعذر تحديث حالة الطلب بعد تسجيل الاستلام';
    end if;
  end if;

  return jsonb_build_object(
    'has_picking_list', true,
    'already_confirmed', false,
    'order_id', v_order.id,
    'merchant_id', v_order.merchant_id,
    'invoice_number', v_order.invoice_number,
    'picker_name', v_list.picker_name
  );
end;
$$;

revoke all on function public.confirm_picking_handover(uuid) from public, anon;
grant execute on function public.confirm_picking_handover(uuid) to authenticated;

commit;
