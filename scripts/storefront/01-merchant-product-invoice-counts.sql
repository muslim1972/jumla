-- Storefront sales ranking: count distinct completed retail invoices per product.
-- Schema verified against the user-provided live schema_dump on 2026-11-06.
-- This function reads order/product metadata only and returns product IDs + counts.
-- It does not read buyer names, phones, addresses, invoice totals, or mutate rows.

begin;

create or replace function public.get_merchant_product_invoice_counts(
  p_merchant_id uuid
)
returns table (
  product_id uuid,
  invoice_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    oi.product_id,
    count(distinct o.id)::bigint as invoice_count
  from public.orders as o
  join public.order_items as oi
    on oi.order_id = o.id
  join public.profiles as buyer
    on buyer.id = o.user_id
   and buyer.role = 'buyer'
  join public.products as product
    on product.id = oi.product_id
   and product.merchant_id = o.merchant_id
  where o.merchant_id = p_merchant_id
    and o.status in ('delivered', 'completed')
  group by oi.product_id;
$$;

revoke all on function public.get_merchant_product_invoice_counts(uuid) from public;
revoke all on function public.get_merchant_product_invoice_counts(uuid) from anon, authenticated;
grant execute on function public.get_merchant_product_invoice_counts(uuid) to anon, authenticated;

commit;

-- Read-only smoke test: returns at most five aggregate rows for one merchant.
-- No merchant identity or invoice/customer details are selected.
select counts.product_id, counts.invoice_count
from public.get_merchant_product_invoice_counts(
  (select id from public.profiles where role = 'merchant' order by id limit 1)
) as counts
order by counts.invoice_count desc, counts.product_id
limit 5;
