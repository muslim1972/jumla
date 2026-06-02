-- 1. إضافة عمود assigned_merchants إلى جدول profiles إذا لم يكن موجوداً
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_merchants JSONB DEFAULT '[]'::jsonb;

-- 2. إنشاء دالة آمنة (RPC) لجلب دور المستخدم (role) بواسطة الإيميل دون الحاجة لإضافة الإيميل في جدول profiles
CREATE OR REPLACE FUNCTION public.get_role_by_email(user_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.id
  WHERE u.email = user_email;
$$;

-- 3. تحديث دالة إنشاء البروفايل (Trigger) لتشمل حفظ التجار المخصصين لعامل التوصيل مستقبلاً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, assigned_merchants)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    COALESCE(NEW.raw_user_meta_data->>'role', 'guest'),
    COALESCE(NEW.raw_user_meta_data->'assigned_merchants', '[]'::jsonb)
  );
  RETURN NEW;
END;
$$;

-- 4. إصلاح الحسابات التي تم إنشاؤها مسبقاً ولم يتم نقل التجار إليها
UPDATE public.profiles p
SET assigned_merchants = COALESCE(u.raw_user_meta_data->'assigned_merchants', '[]'::jsonb)
FROM auth.users u
WHERE p.id = u.id 
  AND p.role = 'delivery';
