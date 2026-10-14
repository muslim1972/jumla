-- جملتي — مرشحو استيراد بيانات المنتجات المفتوحة إلى الكتالوج المركزي.
-- ينفذ يدوياً بعد مراجعة نسخة قاعدة البيانات وسياساتها الفعلية.
-- لا يضيف أي مرشح تلقائياً إلى master_products؛ الاعتماد النهائي إداري.

create table if not exists public.catalog_import_candidates (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('food', 'beauty', 'petfood', 'product')),
  provider_key text not null,
  name text not null,
  description text,
  barcode text,
  image_url text,
  source_url text not null,
  source_license text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'duplicate')),
  matched_master_product_id uuid references public.master_products(id) on delete set null,
  accepted_master_product_id uuid references public.master_products(id) on delete set null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (provider, provider_key)
);

create index if not exists catalog_import_candidates_status_created_idx
  on public.catalog_import_candidates (status, created_at desc);

create table if not exists public.catalog_import_search_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('food', 'beauty', 'petfood', 'product')),
  search_term text not null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists catalog_import_search_runs_user_created_idx
  on public.catalog_import_search_runs (requested_by, created_at desc);

alter table public.catalog_import_candidates enable row level security;

drop policy if exists catalog_import_candidates_admin_manage
  on public.catalog_import_candidates;
create policy catalog_import_candidates_admin_manage
  on public.catalog_import_candidates
  for all to authenticated
  using (coalesce(public.get_user_role(auth.uid()), '') = 'admin')
  with check (coalesce(public.get_user_role(auth.uid()), '') = 'admin');

alter table public.catalog_import_search_runs enable row level security;
drop policy if exists catalog_import_search_runs_admin_manage
  on public.catalog_import_search_runs;
create policy catalog_import_search_runs_admin_manage
  on public.catalog_import_search_runs
  for all to authenticated
  using (coalesce(public.get_user_role(auth.uid()), '') = 'admin')
  with check (coalesce(public.get_user_role(auth.uid()), '') = 'admin');

-- RLS limits visible rows to admins; SQL privileges are still required separately.
grant select, insert, update on public.catalog_import_candidates to authenticated;
grant select, insert on public.catalog_import_search_runs to authenticated;

-- حفظ الإسناد والترخيص مع المادة حتى لا تنفصل بيانات المصدر عند قبولها.
alter table public.master_products
  add column if not exists source_provider text,
  add column if not exists source_url text,
  add column if not exists source_license text;

alter table public.products
  add column if not exists source_provider text,
  add column if not exists source_url text,
  add column if not exists source_license text;

create or replace function public.sync_master_product_to_products()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set name = new.name,
      description = coalesce(new.description, p.description),
      image_url = coalesce(new.image_url, p.image_url),
      category_id = new.category_id,
      source_provider = new.source_provider,
      source_url = new.source_url,
      source_license = new.source_license
  where p.master_product_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sync_master_product on public.master_products;
create trigger trg_sync_master_product
  after update of name, description, category_id, image_url,
    source_provider, source_url, source_license
  on public.master_products
  for each row execute function public.sync_master_product_to_products();

-- فحص التكرارات المقترحة: الاسم أولاً، ثم الوصف بعد توحيد حالة الأحرف والمسافات.
-- يوقف الترحيل قبل إنشاء الفهرس إن كان الكتالوج القديم يحتوي تعارضات تحتاج حسمًا.
do $$
begin
  if exists (
    select 1
    from public.master_products
    group by lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')),
             lower(regexp_replace(btrim(coalesce(description, '')), '[[:space:]]+', ' ', 'g'))
    having count(*) > 1
  ) then
    raise exception 'catalog import migration stopped: duplicate normalized name + description rows exist; review them before adding the unique index';
  end if;
end $$;

create unique index if not exists master_products_name_description_unique
  on public.master_products (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')),
    lower(regexp_replace(btrim(coalesce(description, '')), '[[:space:]]+', ' ', 'g'))
  );

-- الباركود ليس مفتاحاً فريداً في طريقة عمل الكتالوج الحالية.
drop index if exists public.master_products_barcode_unique;

-- إدخال المادة واعتماد المرشح في معاملة واحدة مع قفل صف المرشح لمنع النقر المزدوج.
create or replace function public.catalog_accept_import_candidate(
  p_candidate_id uuid,
  p_name text,
  p_description text,
  p_category_id uuid,
  p_barcode text,
  p_base_price numeric,
  p_units jsonb,
  p_unit_conversions jsonb,
  p_image_url text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_candidate public.catalog_import_candidates%rowtype;
  v_master_id uuid;
begin
  if coalesce(public.get_user_role(auth.uid()), '') <> 'admin' then
    raise exception 'catalog_accept_import_candidate: admin only';
  end if;

  select * into v_candidate
  from public.catalog_import_candidates
  where id = p_candidate_id and status = 'pending'
  for update;

  if not found then
    raise exception 'catalog_accept_import_candidate: candidate is no longer pending';
  end if;

  if exists (
    select 1 from public.master_products
    where lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(p_name), '[[:space:]]+', ' ', 'g'))
      and lower(regexp_replace(btrim(coalesce(description, '')), '[[:space:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(coalesce(p_description, '')), '[[:space:]]+', ' ', 'g'))
  ) then
    raise exception 'catalog_accept_import_candidate: duplicate name and description';
  end if;

  insert into public.master_products (
    name, description, category_id, barcode, base_price, units, unit_conversions,
    image_url, created_by, origin, source_provider, source_url, source_license
  ) values (
    btrim(p_name), nullif(btrim(p_description), ''), p_category_id, nullif(btrim(p_barcode), ''),
    p_base_price, p_units, p_unit_conversions, p_image_url, auth.uid(), 'admin',
    v_candidate.provider, v_candidate.source_url, v_candidate.source_license
  ) returning id into v_master_id;

  update public.catalog_import_candidates
  set status = 'accepted', accepted_master_product_id = v_master_id, reviewed_at = now()
  where id = v_candidate.id;

  return v_master_id;
end;
$$;

revoke all on function public.catalog_accept_import_candidate(uuid, text, text, uuid, text, numeric, jsonb, jsonb, text) from public;
revoke all on function public.catalog_accept_import_candidate(uuid, text, text, uuid, text, numeric, jsonb, jsonb, text) from anon;
grant execute on function public.catalog_accept_import_candidate(uuid, text, text, uuid, text, numeric, jsonb, jsonb, text) to authenticated;

select json_build_object(
  'candidate_table', to_regclass('public.catalog_import_candidates') is not null,
  'candidate_rls', (select relrowsecurity from pg_class where oid = 'public.catalog_import_candidates'::regclass),
  'accept_rpc', to_regprocedure('public.catalog_accept_import_candidate(uuid,text,text,uuid,text,numeric,jsonb,jsonb,text)') is not null,
  'source_columns', (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'master_products'
      and column_name in ('source_provider', 'source_url', 'source_license')),
  'name_description_unique', exists (select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'master_products_name_description_unique'),
  'sync_trigger', exists (select 1 from pg_trigger
    where tgrelid = 'public.master_products'::regclass
      and tgname = 'trg_sync_master_product' and not tgisinternal)
) as catalog_import_verify;
