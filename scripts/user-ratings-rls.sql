-- ============================================================================
-- سكربت RLS لجدول التقييمات user_ratings
-- شغّل هذا السكربت في SQL Editor في لوحة Supabase
-- ============================================================================

-- تأكد من تفعيل RLS (إن لم يكن مفعلاً)
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "user_ratings_select" ON public.user_ratings;
DROP POLICY IF EXISTS "user_ratings_insert" ON public.user_ratings;
DROP POLICY IF EXISTS "user_ratings_update" ON public.user_ratings;
DROP POLICY IF EXISTS "user_ratings_delete" ON public.user_ratings;
DROP POLICY IF EXISTS "user_ratings_admin_all" ON public.user_ratings;

-- 1. القراءة: الجميع يقرأ التقييمات (شفافية)
CREATE POLICY "user_ratings_select" ON public.user_ratings
  FOR SELECT USING (true);

-- 2. الإضافة: المستخدم المسجل يضيف تقييماً فقط عن نفسه (rater_id = auth.uid)
CREATE POLICY "user_ratings_insert" ON public.user_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = rater_id
    AND rater_id != rated_id  -- لا يقيم نفسه
  );

-- 3. التعديل: المستخدم يعدل تقييمه فقط
CREATE POLICY "user_ratings_update" ON public.user_ratings
  FOR UPDATE USING (auth.uid() = rater_id)
  WITH CHECK (auth.uid() = rater_id);

-- 4. الحذف: الأدمن فقط يحذف التقييمات
CREATE POLICY "user_ratings_admin_all" ON public.user_ratings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- فهارس لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater ON public.user_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated ON public.user_ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_order ON public.user_ratings(order_id);
