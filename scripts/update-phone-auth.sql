-- ============================================================
-- تحديثات تسجيل الحساب والدخول برقم الهاتف (الجسر البريدي)
-- التاريخ: 3/9/2026
-- الفكرة: الرقم (11 رقماً يبدأ بـ07) يُحوَّل داخل التطبيق إلى بريد زائف
-- بالنمط 9647XXXXXXXXX@phone.jumla.app ويُسجَّل به الحساب في Supabase،
-- والرقم الحقيقي يُحفظ في profiles.phone عبر بيانات التسجيل الوصفية.
-- نفّذ هذا الملف كاملاً مرة واحدة في SQL Editor ثم تأكد من النقطة (5)
-- ============================================================

-- 1) عمود الهاتف في profiles (للأمان إن لم يكن موجوداً)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2) فهرس فريد يمنع تسجيل الرقم نفسه لحسابين (يتجاهل الفراغات الخاصة بالحسابات القديمة)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON public.profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';

-- 3) تحديث دالة إنشاء البروفايل (Trigger) لحفظ رقم الهاتف من بيانات التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, assigned_merchants, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'guest'),
    COALESCE(NEW.raw_user_meta_data->'assigned_merchants', '[]'::jsonb),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

-- 4) ترحيل هواتف الحسابات التي أُنشئت قبل هذا التحديث (إن وُجدت في بياناتها الوصفية)
UPDATE public.profiles p
SET phone = NULLIF(u.raw_user_meta_data->>'phone', '')
FROM auth.users u
WHERE p.id = u.id
  AND p.phone IS NULL
  AND NULLIF(u.raw_user_meta_data->>'phone', '') IS NOT NULL;

-- 5) مهم جداً: من لوحة تحكم Supabase
--    Authentication → Sign In / Providers → عطّل «Confirm email»
--    لأن البريد الداخلي الزائف لا يستطيع استلام رسالة تأكيد،
--    وإلا فلن يتمكن أصحاب الأرقام من تسجيل الدخول.
