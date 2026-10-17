-- جملتي — حصر مرشحي استيراد الكتالوج بالسجلات الموسومة صراحةً للسوق العراقي.
-- السجلات السابقة تصبح unverified ولا تظهر ولا يمكن اعتمادها حتى يعاد العثور عليها
-- عبر بحث العراق والتحقق من countries_tags في الخادم.

alter table public.catalog_import_candidates
  add column if not exists market_country text not null default 'unverified';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.catalog_import_candidates'::regclass
      and conname = 'catalog_import_candidates_market_country_check'
  ) then
    alter table public.catalog_import_candidates
      add constraint catalog_import_candidates_market_country_check
      check (market_country in ('iraq', 'unverified'));
  end if;
end $$;

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

  if v_candidate.market_country <> 'iraq' then
    raise exception 'catalog_accept_import_candidate: candidate is not verified for Iraq';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(lower(regexp_replace(btrim(p_name), '[[:space:]]+', ' ', 'g'))),
    hashtext(lower(regexp_replace(btrim(coalesce(p_description, '')), '[[:space:]]+', ' ', 'g')))
  );

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
  'market_country_column', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'catalog_import_candidates'
      and column_name = 'market_country'
  ),
  'legacy_candidates_unverified', (
    select count(*) from public.catalog_import_candidates where market_country = 'unverified'
  ),
  'accept_rpc_checks_market_country', exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace and proname = 'catalog_accept_import_candidate'
      and prosrc like '%market_country%'
  )
) as iraq_catalog_verify;
