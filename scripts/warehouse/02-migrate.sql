-- ============================================================================
-- جُملتي — ترحيل نظام المخازن (02-migrate.sql)
-- ----------------------------------------------------------------------------
-- مبادئ هذا السكربت:
--   • يقرأ الحقيقة من القاعدة أولاً (قيود role/status تُستخرج من تعريفها الفعلي
--     وتُوسَّع بالقيم الجديدة مهما كانت قيمتها الحية — لا تخمين).
--   • كل عبارة idempotent (يمكن إعادة تشغيل السكربت كاملاً بأمان).
--   • لا يُحذف أي بيانات قائمة — التهيئة تنسخ الأرصدة الحالية إلى بنود المخزن.
--   • القسم B (إعادة كتابة دالتي الخصم/الاسترجاع) يُستكمل بعد قراءة تعريفهما
--     الحي من سكربت الفحص — لا يُنفَّذ هذا الملف قبل ذلك.
-- ============================================================================

-- ① أعمدة الموظفين ووحدة المخازن على profiles
alter table public.profiles add column if not exists parent_merchant_id uuid references public.profiles(id) on delete cascade;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists last_login_at timestamptz;
alter table public.profiles add column if not exists warehouse_enabled boolean not null default false;

create index if not exists profiles_parent_merchant_idx on public.profiles(parent_merchant_id) where parent_merchant_id is not null;
create unique index if not exists profiles_staff_username_unique on public.profiles(lower(username)) where role = 'merchant_staff' and username is not null;

-- ② توسّع قيد دور profiles بقيمة merchant_staff — من تعريف القيد الحي نفسه
do $$
declare
  rec record;
  current_vals text;
  new_vals text;
begin
  for rec in
    select con.oid, con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.profiles'::regclass
      and con.contype = 'c'
      and att.attname = 'role'
      and (pg_get_constraintdef(con.oid) ilike '%IN %' or pg_get_constraintdef(con.oid) ilike '%ANY%')
  loop
    select pg_get_constraintdef(rec.oid) into current_vals;
    if current_vals like '%merchant_staff%' then
      raise notice 'profiles role constraint % already includes merchant_staff', rec.conname;
      continue;
    end if;

    -- نزع غلاف CHECK الخارجي: التعريف يعود بصيغة CHECK (...) وعلينا حقن القيم داخل التعبير فقط
    current_vals := regexp_replace(current_vals, '^\s*CHECK\s*\((.*)\)\s*$', '\1');

    -- استخراج قيم ANY (ARRAY['a','b',...]) أو IN (...) وإلحاق merchant_staff
    if current_vals ~* 'ARRAY\[' then
      new_vals := regexp_replace(current_vals, 'ARRAY\[([^\]]*)\]', 'ARRAY[\1, ''merchant_staff'']');
    else
      new_vals := regexp_replace(current_vals, 'IN \((.*)\)', 'IN (\1, ''merchant_staff'')');
    end if;

    execute format('alter table public.profiles drop constraint %I', rec.conname);
    execute format('alter table public.profiles add constraint %I check (%s)', rec.conname, new_vals);
    raise notice 'profiles role constraint % extended with merchant_staff', rec.conname;
  end loop;
end $$;

-- ③ توسّع قيد حالة الطلب بقيمة preparing — بنفس أسلوب الحقيقة أولاً
do $$
declare
  rec record;
  current_vals text;
  new_vals text;
begin
  for rec in
    select con.oid, con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.orders'::regclass
      and con.contype = 'c'
      and att.attname = 'status'
      and (pg_get_constraintdef(con.oid) ilike '%IN %' or pg_get_constraintdef(con.oid) ilike '%ANY%')
  loop
    select pg_get_constraintdef(rec.oid) into current_vals;
    if current_vals like '%preparing%' then
      raise notice 'orders status constraint % already includes preparing', rec.conname;
      continue;
    end if;

    -- نزع غلاف CHECK الخارجي قبل حقن القيمة الجديدة
    current_vals := regexp_replace(current_vals, '^\s*CHECK\s*\((.*)\)\s*$', '\1');

    if current_vals ~* 'ARRAY\[' then
      new_vals := regexp_replace(current_vals, 'ARRAY\[([^\]]*)\]', 'ARRAY[\1, ''preparing'']');
    else
      new_vals := regexp_replace(current_vals, 'IN \((.*)\)', 'IN (\1, ''preparing'')');
    end if;

    execute format('alter table public.orders drop constraint %I', rec.conname);
    execute format('alter table public.orders add constraint %I check (%s)', rec.conname, new_vals);
    raise notice 'orders status constraint % extended with preparing', rec.conname;
  end loop;
end $$;

-- لا قيد أصلاً على status؟ (بعض الإصدارات القديمة بلا قيد) — لا نفعل شيئاً حينها؛
-- كود التطبيق يقبل القيمة والقيد الوحيد المطلوب هو عدم وجود قيد مانع.

-- ④ الجداول
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  location_note text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists warehouses_one_default_per_merchant on public.warehouses(merchant_id) where is_default;
create index if not exists warehouses_merchant_idx on public.warehouses(merchant_id);

create table if not exists public.warehouse_items (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  min_stock_alert integer not null default 0 check (min_stock_alert >= 0),
  low_stock_notified_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (warehouse_id, product_id)
);
create index if not exists warehouse_items_merchant_idx on public.warehouse_items(merchant_id);
create index if not exists warehouse_items_product_idx on public.warehouse_items(product_id);
create index if not exists warehouse_items_low_idx on public.warehouse_items(merchant_id) where min_stock_alert > 0;

create table if not exists public.warehouse_movements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  kind text not null check (kind in ('in','out','adjust','order_deduction','order_restore','shortage_return')),
  quantity integer not null,
  balance_after integer not null,
  reference_type text,
  reference_id uuid,
  note text,
  performed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists warehouse_movements_merchant_idx on public.warehouse_movements(merchant_id, created_at desc);
create index if not exists warehouse_movements_product_idx on public.warehouse_movements(product_id, created_at desc);

create table if not exists public.picking_lists (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  status text not null default 'issued' check (status in ('issued','picked','handed_over','cancelled')),
  picker_id uuid references public.profiles(id) on delete set null,
  picker_name text,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_by_name text,
  issued_at timestamptz,
  picked_at timestamptz,
  handed_over_at timestamptz,
  handed_over_by uuid references public.profiles(id) on delete set null,
  handed_over_name text,
  photo_url text,
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists picking_lists_order_unique on public.picking_lists(order_id);
create index if not exists picking_lists_merchant_status_idx on public.picking_lists(merchant_id, status);

create table if not exists public.picking_list_items (
  id uuid primary key default gen_random_uuid(),
  picking_list_id uuid not null references public.picking_lists(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_type text not null,
  ordered_quantity integer not null,
  confirmed_quantity integer not null default 0,
  shortage_quantity integer not null default 0 check (shortage_quantity >= 0),
  shortage_reason text,
  created_at timestamptz not null default now()
);
create index if not exists picking_list_items_list_idx on public.picking_list_items(picking_list_id);

-- ⑤ دوال المساعدة للصلاحيات
create or replace function public.staff_is_active_of(p_merchant uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'merchant_staff'
      and is_active
      and parent_merchant_id = p_merchant
  )
$$;

create or replace function public.staff_has_perm(p_merchant uuid, p_perm text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'merchant_staff'
      and is_active
      and parent_merchant_id = p_merchant
      and permissions @> to_jsonb(array[p_perm])
  )
$$;

revoke all on function public.staff_is_active_of(uuid) from public, anon;
revoke all on function public.staff_has_perm(uuid, text) from public, anon;

-- ⑥ RLS
alter table public.warehouses enable row level security;
alter table public.warehouse_items enable row level security;
alter table public.warehouse_movements enable row level security;
alter table public.picking_lists enable row level security;
alter table public.picking_list_items enable row level security;

-- warehouses
drop policy if exists warehouses_select on public.warehouses;
create policy warehouses_select on public.warehouses
  for select using (
    merchant_id = auth.uid()
    or public.staff_is_active_of(merchant_id)
    or public.get_user_role(auth.uid()) in ('admin','support')
  );
drop policy if exists warehouses_write on public.warehouses;
create policy warehouses_write on public.warehouses
  for all using (merchant_id = auth.uid()) with check (merchant_id = auth.uid());

-- warehouse_items
drop policy if exists warehouse_items_select on public.warehouse_items;
create policy warehouse_items_select on public.warehouse_items
  for select using (
    merchant_id = auth.uid()
    or public.staff_is_active_of(merchant_id)
    or public.get_user_role(auth.uid()) in ('admin','support')
  );
drop policy if exists warehouse_items_write on public.warehouse_items;
create policy warehouse_items_write on public.warehouse_items
  for all using (
    merchant_id = auth.uid()
    or public.staff_is_active_of(merchant_id)
  ) with check (
    merchant_id = auth.uid()
    or public.staff_is_active_of(merchant_id)
  );

-- warehouse_movements (إلحاق فقط — لا تعديل ولا حذف للسجل)
drop policy if exists warehouse_movements_select on public.warehouse_movements;
create policy warehouse_movements_select on public.warehouse_movements
  for select using (
    merchant_id = auth.uid()
    or public.staff_is_active_of(merchant_id)
    or public.get_user_role(auth.uid()) in ('admin','support')
  );
drop policy if exists warehouse_movements_insert on public.warehouse_movements;
create policy warehouse_movements_insert on public.warehouse_movements
  for insert with check (
    merchant_id = auth.uid()
    or public.staff_is_active_of(merchant_id)
    or current_user in ('service_role','postgres')
  );

-- picking_lists: التاجر كامل، موظفوه القراءة والتحديث ضمن صلاحياتهم، المندوب يستلم
drop policy if exists picking_lists_select on public.picking_lists;
create policy picking_lists_select on public.picking_lists
  for select using (
    merchant_id = auth.uid()
    or public.staff_is_active_of(merchant_id)
    or public.get_user_role(auth.uid()) = 'delivery'
    or public.get_user_role(auth.uid()) in ('admin','support')
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
    or public.staff_is_active_of(merchant_id)
    or (public.get_user_role(auth.uid()) = 'delivery')
  ) with check (
    merchant_id = auth.uid()
    or public.staff_is_active_of(merchant_id)
    or (public.get_user_role(auth.uid()) = 'delivery')
  );
drop policy if exists picking_lists_delete on public.picking_lists;
create policy picking_lists_delete on public.picking_lists
  for delete using (merchant_id = auth.uid());

-- picking_list_items: تتبع قائمةها
drop policy if exists picking_list_items_select on public.picking_list_items;
create policy picking_list_items_select on public.picking_list_items
  for select using (
    exists (
      select 1 from public.picking_lists pl
      where pl.id = picking_list_id
        and (pl.merchant_id = auth.uid()
          or public.staff_is_active_of(pl.merchant_id)
          or public.get_user_role(auth.uid()) = 'delivery'
          or public.get_user_role(auth.uid()) in ('admin','support'))
    )
  );
drop policy if exists picking_list_items_write on public.picking_list_items;
create policy picking_list_items_write on public.picking_list_items
  for all using (
    exists (
      select 1 from public.picking_lists pl
      where pl.id = picking_list_id
        and (pl.merchant_id = auth.uid()
          or public.staff_is_active_of(pl.merchant_id))
    )
  ) with check (
    exists (
      select 1 from public.picking_lists pl
      where pl.id = picking_list_id
        and (pl.merchant_id = auth.uid()
          or public.staff_is_active_of(pl.merchant_id))
    )
  );

-- ⑦ فتح جدولي orders للقراءة/التحديث لموظفي التاجر (ضمن صلاحياتهم)
-- سياسات orders القائمة للتجار تبقى كما هي — نضيف سياسات مخصصة للموظفين
drop policy if exists orders_staff_select on public.orders;
create policy orders_staff_select on public.orders
  for select using (
    public.get_user_role(auth.uid()) = 'merchant_staff'
    and public.staff_is_active_of(merchant_id)
    and (
      public.staff_has_perm(merchant_id, 'sales')
      or public.staff_has_perm(merchant_id, 'warehouse')
    )
  );
drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders
  for update using (
    public.get_user_role(auth.uid()) = 'merchant_staff'
    and public.staff_is_active_of(merchant_id)
    and (
      public.staff_has_perm(merchant_id, 'sales')
      or public.staff_has_perm(merchant_id, 'warehouse')
    )
  ) with check (
    public.get_user_role(auth.uid()) = 'merchant_staff'
    and public.staff_is_active_of(merchant_id)
    and (
      public.staff_has_perm(merchant_id, 'sales')
      or public.staff_has_perm(merchant_id, 'warehouse')
    )
  );

-- ⑧ مزامنة المخزون: warehouse_items هو مصدر الحقيقة → مجموعها يغذي products.stock_quantity
create or replace function public.sync_product_stock_from_items()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_product uuid;
  v_total integer;
begin
  v_product := coalesce(new.product_id, old.product_id);
  if v_product is null then return null; end if;

  select coalesce(sum(quantity), 0) into v_total
  from public.warehouse_items where product_id = v_product;

  -- علّم الجلسة أن هذا التحديث من المزامنة كي لا يعيد مشغل products الكتابة على البند
  perform set_config('app.from_stock_sync', '1', true);
  update public.products set stock_quantity = v_total where id = v_product;

  return null;
end $$;

drop trigger if exists trg_items_sync_product_stock on public.warehouse_items;
create trigger trg_items_sync_product_stock
  after insert or update or delete on public.warehouse_items
  for each row execute function public.sync_product_stock_from_items();

-- تعديلات التاجر القديمة على مخزون المنتج (من لوحة المنتجات) تنعكس على بند المخزن الرئيسي
create or replace function public.products_stock_to_default_item()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_item_id uuid;
  v_min_base integer;
begin
  -- قادم من مزامنة البنود؟ تجاهل (منع حلقة)
  if coalesce(current_setting('app.from_stock_sync', true), '') = '1' then
    return null;
  end if;

  select wi.id into v_item_id
  from public.warehouse_items wi
  join public.warehouses w on w.id = wi.warehouse_id
  where wi.product_id = new.id and w.is_default = true
  limit 1;

  -- حد التنبيه المخزن على المنتج بوحدة العرض → حوّله لقاعدة الأساس
  v_min_base := 0;
  if new.min_stock_alert is not null and new.min_stock_alert > 0 then
    declare
      v_multiplier double precision := 1;
      u record;
    begin
      if new.units is not null then
        for u in select value from jsonb_array_elements(new.units)
        loop
          if (u.value->>'type') = coalesce(new.stock_unit, '') then
            v_multiplier := coalesce((u.value->>'multiplier_to_base')::double precision, 1);
          end if;
        end loop;
      end if;
      v_min_base := ceil(new.min_stock_alert * v_multiplier);
    end;
  end if;

  if v_item_id is not null then
    update public.warehouse_items
    set quantity = greatest(0, new.stock_quantity), min_stock_alert = coalesce(v_min_base, 0), updated_at = now()
    where id = v_item_id;
  else
    -- منتج بلا بند (أُضيف عبر اللوحة القديمة) وأصلاً يملك مخزناً افتراضياً؟ أنشئ بنداً
    insert into public.warehouse_items (warehouse_id, merchant_id, product_id, quantity, min_stock_alert)
    select w.id, new.merchant_id, new.id, greatest(0, new.stock_quantity), coalesce(v_min_base, 0)
    from public.warehouses w
    where w.merchant_id = new.merchant_id and w.is_default = true
    on conflict do nothing;
  end if;

  return null;
end $$;

drop trigger if exists trg_products_to_default_item on public.products;
create trigger trg_products_to_default_item
  after insert or update of stock_quantity, min_stock_alert, units, stock_unit on public.products
  for each row execute function public.products_stock_to_default_item();

-- ⑨ تطبيق حركة مخزنية ذرياً (الوارد/الإخراج/التسوية/إرجاع النقص)
create or replace function public.warehouse_apply_movement(
  p_item_id uuid,
  p_kind text,
  p_quantity integer,
  p_note text default null,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_merchant uuid;
  v_balance integer;
  v_new_balance integer;
  v_warehouse uuid;
  v_product uuid;
begin
  -- صلاحيات: التاجر صاحب البند، أو موظف نشط له صلاحية المخازن (إرجاع النقص نظامي عبر القوائم فقط)
  select wi.merchant_id, wi.warehouse_id, wi.product_id, wi.quantity
    into v_merchant, v_warehouse, v_product, v_balance
  from public.warehouse_items wi
  where wi.id = p_item_id;

  if v_merchant is null then
    raise exception 'البند غير موجود';
  end if;

  if not (
    auth.uid() = v_merchant
    or public.staff_has_perm(v_merchant, 'warehouse')
  ) then
    raise exception 'لا تملك صلاحية الحركة على هذا المخزن';
  end if;

  if p_kind not in ('in','out','adjust','shortage_return') then
    raise exception 'نوع حركة غير معتمد';
  end if;

  if p_quantity = 0 then
    return v_balance;
  end if;

  v_new_balance := v_balance + p_quantity;
  if v_new_balance < 0 then
    raise exception 'الكمية غير متوفرة في المخزن (الرصيد %)', v_balance;
  end if;

  update public.warehouse_items
  set quantity = v_new_balance, updated_at = now()
  where id = p_item_id;

  insert into public.warehouse_movements
    (merchant_id, warehouse_id, product_id, kind, quantity, balance_after, reference_type, reference_id, note, performed_by)
  values
    (v_merchant, v_warehouse, v_product, p_kind, p_quantity, v_new_balance, p_reference_type, p_reference_id, p_note, auth.uid());

  return v_new_balance;
end $$;

revoke all on function public.warehouse_apply_movement(uuid, text, integer, text, text, uuid) from public, anon;

-- ⑩ تفعيل وحدة المخازن للتاجر: مخزن رئيسي + ترحيل الأرصدة القائمة (idempotent)
create or replace function public.enable_merchant_warehouse()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_merchant uuid := auth.uid();
  v_warehouse uuid;
begin
  if v_merchant is null or public.get_user_role(v_merchant) <> 'merchant' then
    raise exception 'لصاحب المتجر فقط';
  end if;

  update public.profiles set warehouse_enabled = true where id = v_merchant;

  select id into v_warehouse from public.warehouses where merchant_id = v_merchant and is_default = true limit 1;
  if v_warehouse is null then
    insert into public.warehouses (merchant_id, name, is_default)
    values (v_merchant, 'المخزن الرئيسي', true)
    returning id into v_warehouse;
  end if;

  -- ترحيل الأرصدة: بند لكل منتج لم يُرحّل بعد
  insert into public.warehouse_items (warehouse_id, merchant_id, product_id, quantity, min_stock_alert)
  select v_warehouse, p.merchant_id, p.id,
         greatest(0, p.stock_quantity),
         0
  from public.products p
  where p.merchant_id = v_merchant
  on conflict (warehouse_id, product_id) do nothing;

  -- حد التنبيه القديم (بوحدة العرض) → بوحدة الأساس على البند
  update public.warehouse_items wi
  set min_stock_alert = ceil(p.min_stock_alert * coalesce(
      (select (u.value->>'multiplier_to_base')::numeric
       from public.products p2,
            jsonb_array_elements(p2.units) u
       where p2.id = wi.product_id and (u.value->>'type') = coalesce(p2.stock_unit, '')
       limit 1), 1))
  from public.products p
  where p.id = wi.product_id
    and wi.warehouse_id = v_warehouse
    and p.min_stock_alert > 0
    and wi.min_stock_alert = 0;
end $$;

revoke all on function public.enable_merchant_warehouse() from public, anon;

-- ⑪ سجل التغييرات للتاجر: قراءة آمنة محصورة بملكيته
create or replace function public.get_merchant_activity(p_merchant uuid, p_limit integer default 120)
returns table (
  id uuid,
  table_name text,
  record_id text,
  action text,
  old_data jsonb,
  new_data jsonb,
  changed_by_name text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  -- التاجر نفسه أو أحد موظفيه النشطين فقط
  if auth.uid() is null or (
    auth.uid() <> p_merchant and not public.staff_is_active_of(p_merchant)
  ) then
    raise exception 'غير مصرح';
  end if;

  return query
  select al.id, al.table_name, al.record_id, al.action, al.old_data, al.new_data,
         coalesce(pr.full_name, 'النظام') as changed_by_name,
         al.created_at
  from public.audit_logs al
  left join public.profiles pr on pr.id = al.changed_by
  where (
        (al.table_name = 'products' and coalesce(al.new_data->>'merchant_id', al.old_data->>'merchant_id') = p_merchant::text)
     or (al.table_name = 'warehouse_items' and coalesce(al.new_data->>'merchant_id', al.old_data->>'merchant_id') = p_merchant::text)
     or (al.table_name = 'warehouses' and coalesce(al.new_data->>'merchant_id', al.old_data->>'merchant_id') = p_merchant::text)
     or (al.table_name = 'warehouse_movements' and coalesce(al.new_data->>'merchant_id', al.old_data->>'merchant_id') = p_merchant::text)
     or (al.table_name = 'picking_lists' and coalesce(al.new_data->>'merchant_id', al.old_data->>'merchant_id') = p_merchant::text)
     or (al.table_name = 'picking_list_items' and exists (
          select 1 from public.picking_lists pl
          where pl.id::text = coalesce(al.new_data->>'picking_list_id', al.old_data->>'picking_list_id')
            and pl.merchant_id = p_merchant))
     or (al.table_name = 'profiles' and coalesce(al.new_data->>'parent_merchant_id', al.old_data->>'parent_merchant_id') = p_merchant::text)
    )
  order by al.created_at desc
  limit least(coalesce(p_limit, 120), 300);
end $$;

revoke all on function public.get_merchant_activity(uuid, integer) from public, anon;

-- ⑫ تدقيق الجداول الجديدة — بنفس دالة التدقيق القائمة (أيّهما وجدت)
do $$
declare
  audit_fn text;
begin
  select p.proname into audit_fn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('audit_trigger_func','audit_log_trigger')
  order by case when p.proname = 'audit_trigger_func' then 0 else 1 end
  limit 1;

  if audit_fn is null then
    raise notice 'لا دالة تدقيق موجودة — يُتخطى إنشاء مشغلات التدقيق (سيُضاف لاحقاً بعد الفحص)';
    return;
  end if;

  execute format('drop trigger if exists audit_trg_warehouses on public.warehouses;
    create trigger audit_trg_warehouses after insert or update or delete on public.warehouses
    for each row execute function public.%I();', audit_fn);

  execute format('drop trigger if exists audit_trg_warehouse_items on public.warehouse_items;
    create trigger audit_trg_warehouse_items after insert or update or delete on public.warehouse_items
    for each row execute function public.%I();', audit_fn);

  execute format('drop trigger if exists audit_trg_warehouse_movements on public.warehouse_movements;
    create trigger audit_trg_warehouse_movements after insert or update or delete on public.warehouse_movements
    for each row execute function public.%I();', audit_fn);

  execute format('drop trigger if exists audit_trg_picking_lists on public.picking_lists;
    create trigger audit_trg_picking_lists after insert or update or delete on public.picking_lists
    for each row execute function public.%I();', audit_fn);

  execute format('drop trigger if exists audit_trg_picking_list_items on public.picking_list_items;
    create trigger audit_trg_picking_list_items after insert or update or delete on public.picking_list_items
    for each row execute function public.%I();', audit_fn);

  raise notice 'audit triggers created via %', audit_fn;
end $$;

-- ⑬ البث اللحظي للجداول الجديدة
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.warehouse_items;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.warehouse_movements;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.picking_lists;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.orders;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ============================================================================
-- القسم B — مكملات سياسات RLS اكتشفت من الفحص الحي + إعادة كتابة دالتي
-- الخصم/الاسترجاع من تعريفهما الحي (خصم من بنود المخزن مع تراجع آمن للطريقة
-- القديمة للتجار الذين لم يفعّلوا الوحدة).
-- ============================================================================

-- B-① مساعد: التاجر الأم لموظف (SECURITY DEFINER لمنع الاستدعاء الذاتي في السياسات)
create or replace function public.get_staff_parent(p_uid uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select parent_merchant_id from public.profiles
  where id = p_uid and role = 'merchant_staff'
$$;

revoke all on function public.get_staff_parent(uuid) from public, anon;

-- B-② products: موظف بصلاحية pricing يضيف/يسعّر منتجات تاجرِه (الفحص أظهر أن
-- products_insert/products_update محصورة بالتاجر أو الإدارة فقط)
drop policy if exists products_staff_insert on public.products;
create policy products_staff_insert on public.products
  for insert with check (
    public.staff_has_perm(merchant_id, 'pricing')
  );

drop policy if exists products_staff_update on public.products;
create policy products_staff_update on public.products
  for update using (
    public.staff_has_perm(merchant_id, 'pricing')
  ) with check (
    public.staff_has_perm(merchant_id, 'pricing')
  );

-- B-③ profiles: التاجر يرى ويدير موظفيه، والموظف يرى نفسه وزملاءه (بدون استدعاء ذاتي
-- بفضل get_staff_parent) — الفحص أظهر أن profiles_select الحالية تحجب صفوف الموظفين
drop policy if exists profiles_staff_select on public.profiles;
create policy profiles_staff_select on public.profiles
  for select using (
    (role = 'merchant_staff' and parent_merchant_id = auth.uid())
    or (
      public.get_user_role(auth.uid()) = 'merchant_staff'
      and (id = auth.uid() or parent_merchant_id = public.get_staff_parent(auth.uid()))
    )
  );

drop policy if exists profiles_staff_update on public.profiles;
create policy profiles_staff_update on public.profiles
  for update using (
    public.get_user_role(auth.uid()) = 'merchant'
    and role = 'merchant_staff'
    and parent_merchant_id = auth.uid()
  ) with check (
    public.get_user_role(auth.uid()) = 'merchant'
    and role = 'merchant_staff'
    and parent_merchant_id = auth.uid()
  );

-- B-④ إعادة كتابة create_order_atomic — من التعريف الحي حرفياً مع تعديل موضعين فقط:
--     (استرجاع طلب قيد التعديل) و(الخصم الذري) ليعملا على بنود المخزن الافتراضي
--     مع سقوط تلقائي للطريقة القديمة إن لم يوجد بند (تاجر بلا وحدة مخازن)،
--     وتسجيل كل حركة في دفتر warehouse_movements بمرجع الطلب.
create or replace function public.create_order_atomic(p_merchant_id uuid, p_verification_code text, p_store_name text, p_address text, p_phone text, p_subtotal numeric, p_delivery_fee numeric, p_total_rounded numeric, p_is_credit boolean, p_amount_paid numeric, p_items jsonb)
 returns table(order_id uuid, invoice_number text)
 language plpgsql
 security definer
 set search_path to 'public'
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
    v_invoice_num := v_editing_invoice;
  else
    v_invoice_num := public.get_next_invoice_number(p_merchant_id);

    insert into orders (
      user_id, merchant_id, verification_code, store_name, address, phone,
      subtotal, delivery_fee, total_rounded, status, support_phone,
      invoice_number, is_credit, amount_paid, latitude, longitude
    ) values (
      v_user_id, p_merchant_id, p_verification_code, p_store_name, p_address, p_phone,
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

-- B-⑤ إعادة كتابة restore_stock_quantity — من التعريف الحي حرفياً مع التوجيه لبند
-- المخزن الافتراضي إن وجد (وتوثيق الحركة)، وإلا المسار القديم على المنتجات
create or replace function public.restore_stock_quantity(p_order_id uuid, p_product_id uuid, p_quantity numeric)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $$
DECLARE
  v_item_id uuid;
  v_warehouse_id uuid;
  v_merchant_id uuid;
  v_new_balance integer;
BEGIN
  IF p_order_id IS NULL OR p_product_id IS NULL THEN
    RETURN;
  END IF;

  -- التحقق أن المتصل طرف في الطلب (المشتري المالك أو التاجر)
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id
      AND (user_id = auth.uid() OR merchant_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'NOT_PERMITTED';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN;
  END IF;

  SELECT o.merchant_id INTO v_merchant_id FROM public.orders o WHERE o.id = p_order_id;

  -- مسار المخازن: بند المخزن الافتراضي للمنتج لدى هذا التاجر
  SELECT wi.id, wi.warehouse_id INTO v_item_id, v_warehouse_id
    FROM public.warehouse_items wi
    JOIN public.warehouses w ON w.id = wi.warehouse_id
   WHERE wi.product_id = p_product_id
     AND w.merchant_id = v_merchant_id
     AND w.is_default = true
   LIMIT 1;

  IF v_item_id IS NOT NULL THEN
    UPDATE public.warehouse_items
       SET quantity = (quantity + ceil(p_quantity))::int
     WHERE id = v_item_id
    RETURNING quantity INTO v_new_balance;

    INSERT INTO public.warehouse_movements
      (merchant_id, warehouse_id, product_id, kind, quantity, balance_after, reference_type, reference_id, note, performed_by)
    VALUES
      (v_merchant_id, v_warehouse_id, p_product_id, 'order_restore', ceil(p_quantity)::int, v_new_balance, 'orders', p_order_id, 'استرجاع مخزون بطلب', null);
    RETURN;
  END IF;

  -- المسار القديم: تجار بلا وحدة مخازن
  UPDATE public.products
  SET stock_quantity = COALESCE(stock_quantity, 0) + ceil(p_quantity)::int
  WHERE id = p_product_id;
END;
$$;
