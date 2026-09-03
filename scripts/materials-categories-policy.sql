-- ============================================================
-- سكربت ترحيل: صلاحية إنشاء الأقسام لحساب إدارة المواد
-- ------------------------------------------------------------
-- الغرض: دعم زر "إضافة قسم جديد" في شاشة إدارة المواد
--   (إضافة مواد) — ليتمكن موظف materials من إضافة قسم غير موجود
--   بالقائمة مباشرة من النموذج.
-- ملاحظة: قراءة categories عامة أصلاً (سياسة موجودة مسبقاً)،
--   وهذا السكربت يمنح INSERT فقط لدور materials/admin.
-- السكربت قابل لإعادة التنفيذ (Idempotent).
-- ============================================================

DROP POLICY IF EXISTS "categories_materials_insert" ON public.categories;

CREATE POLICY "categories_materials_insert"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') IN ('materials','admin'));

-- ============================================================
-- استعلام تحقق — النتيجة المطلوبة:
--   categories_insert_policy = 1
-- ============================================================
SELECT
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'categories'
      AND policyname = 'categories_materials_insert'
      AND cmd = 'INSERT'
  ) AS categories_insert_policy;
