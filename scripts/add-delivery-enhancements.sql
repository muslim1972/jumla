-- ============================================================
-- سكربت: تحسينات التوصيل والإشعارات الموحدة
-- التاريخ: 3/9/2026
-- ============================================================

-- 1) إحداثيات المشتري عند إنشاء القائمة (لزر فتح الخريطة GPS عند المندوب)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS longitude numeric;

-- 2) المبلغ المستلم فعلياً من المشتري عند التسليم (يُفعل لمشتريي قائمة الثقات)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_received numeric DEFAULT 0;

-- 3) تفعيل التحديث اللحظي (Realtime) لجدول الإشعارات ليصل الجرس فوراً في كل الحسابات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
