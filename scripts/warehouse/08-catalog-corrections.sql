-- جملتي — تمكين التجار من تصحيح بيانات الكتالوج المشترك مع تسجيل التدقيق.
-- راجع ناتج استعلام التحقق قبل اعتماد هذا التغيير في قاعدة البيانات.
-- لا يحدّث هذا السكربت أسعار أو أرصدة منتجات التجار.

alter table public.master_products enable row level security;

drop policy if exists master_products_merchant_update on public.master_products;
create policy master_products_merchant_update on public.master_products
  for update to authenticated
  using (
    public.get_user_role(auth.uid()) = 'merchant'
    or (
      public.get_user_role(auth.uid()) = 'merchant_staff'
      and public.staff_has_perm(public.get_staff_parent(auth.uid()), 'pricing')
    )
  )
  with check (
    public.get_user_role(auth.uid()) = 'merchant'
    or (
      public.get_user_role(auth.uid()) = 'merchant_staff'
      and public.staff_has_perm(public.get_staff_parent(auth.uid()), 'pricing')
    )
  );

drop trigger if exists audit_master_products_update on public.master_products;
create trigger audit_master_products_update
  after update on public.master_products
  for each row execute function public.audit_trigger_func();

select json_build_object(
  'rls_enabled', (select relrowsecurity from pg_class where oid = 'public.master_products'::regclass),
  'merchant_update_policy', (select qual from pg_policies where schemaname = 'public' and tablename = 'master_products' and policyname = 'master_products_merchant_update'),
  'update_trigger', (select count(*) from information_schema.triggers where trigger_schema = 'public' and event_object_table = 'master_products' and trigger_name = 'audit_master_products_update'),
  'audit_function_exists', to_regprocedure('public.audit_trigger_func()') is not null
) as catalog_corrections_verify;
