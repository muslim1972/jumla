-- إصلاح صلاحيات جداول تعزيز الكتالوج للبيئات التي طبقت الترحيل 09 قبل إضافة المنح.
-- تبقى سياسات RLS في الترحيل 09 هي التي تقصر الصفوف على المدير.
revoke all on public.catalog_import_candidates from anon;
revoke all on public.catalog_import_search_runs from anon;

grant select, insert, update on public.catalog_import_candidates to authenticated;
grant select, insert on public.catalog_import_search_runs to authenticated;
