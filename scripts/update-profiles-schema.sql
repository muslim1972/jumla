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
