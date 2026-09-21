-- ============================================================
-- سكربت إضافة نظام موافقة الإدارة (Approval) على الحسابات الجديدة
-- نفّذ هذا الملف كاملاً في SQL Editor داخل لوحة تحكم Supabase
-- ============================================================

-- 1. إضافة عمود approval_status إلى جدول profiles
-- القيم الممكنة: 'pending' (بانتظار التفعيل)، 'approved' (مفعّل)، 'rejected' (مرفوض)
-- القيمة الافتراضية 'approved' لضمان بقاء كافة الحسابات الحالية مفعّلة وآمنة 100%
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';

-- 2. تحديث كافة الحسابات السابقة لتكون معتمدة ومفعّلة فوراً
UPDATE public.profiles 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;

-- 3. إنشاء فهارس لتحسين سرعة الاستعلام عن الحسابات المعلقة
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status 
  ON public.profiles (approval_status);

CREATE INDEX IF NOT EXISTS idx_profiles_approval_pending 
  ON public.profiles (approval_status, created_at DESC) 
  WHERE approval_status = 'pending';

-- 4. تحديث دالة التريغر (Trigger) لتبدأ الحسابات الجديدة بحالة 'pending'
-- مع استثناء رتبة 'admin' لتكون 'approved' تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  initial_status TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'guest');
  
  -- المدير مفعّل تلقائياً، وبقية الرتب بانتظار موافقة الإدارة
  IF user_role = 'admin' THEN
    initial_status := 'approved';
  ELSE
    initial_status := 'pending';
  END IF;

  INSERT INTO public.profiles (
    id, 
    full_name, 
    role, 
    assigned_merchants, 
    phone, 
    approval_status
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    user_role,
    COALESCE(NEW.raw_user_meta_data->'assigned_merchants', '[]'::jsonb),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    initial_status
  );
  RETURN NEW;
END;
$$;

-- 5. تفعيل الاستماع اللحظي (Realtime) لجدول الإشعارات notifications
-- لضمان وصول شارة الإشعار لجرس الأدمن فوراً بدون الحاجة لتسجيل الخروج
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

