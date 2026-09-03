-- ============================================================
-- تحديث قيد أدوار الحسابات لإضافة الدورين الجديدين
-- التاريخ: 3/9/2026
-- السبب: القيد الحالي في قاعدة البيانات يقبل فقط
--   ('guest','merchant','admin','support','delivery','buyer','materials')
-- وأي محاولة إنشاء حساب بدور 'member' (عضو تطبيق) أو ترقيته إلى
-- 'call_center' تفشل مع خطأ "Database error saving new user"
-- لأن الـ trigger يُدرج الدور قبل فحص القيد.
-- نفّذ هذا الملف مرة واحدة في SQL Editor
-- ============================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('guest','merchant','admin','support','delivery','buyer','materials','member','call_center'));

-- للتحقق بعد التنفيذ (يجب أن يشمل القيد member و call_center):
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.profiles'::regclass AND contype = 'c';
