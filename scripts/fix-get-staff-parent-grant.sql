-- منح صلاحية تنفيذ get_staff_parent للمستخدمين المجهولين (anon) والمصرحين (authenticated)
-- هذا ضروري لأن سياسة RLS لـ profiles تستدعي get_staff_parent، وعندما يستعلم الزائر (anon)
-- عن قائمة التجار تنفذ PostgreSQL شرط RLS فتطلب إذن تشغيل get_staff_parent.
-- الدالة نفسها SECURITY DEFINER وتفحص auth.uid() لذا لا خطر أمني إطلاقاً في منح execute.
grant execute on function public.get_staff_parent(uuid) to authenticated, anon;
