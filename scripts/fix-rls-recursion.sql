-- =============================================
-- إصلاح خطأ الـ Infinite Recursion في سياسات RLS
-- =============================================

-- 1. إنشاء دالة ذات صلاحيات مرتفعة (Security Definer) لقراءة الدور بدون تفعيل الـ RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. حذف السياسات القديمة المسببة للمشكلة
DROP POLICY IF EXISTS "Support can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Support can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Support can view orders" ON public.orders;
DROP POLICY IF EXISTS "Support can update orders" ON public.orders;
DROP POLICY IF EXISTS "Support can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Support can view products" ON public.products;
DROP POLICY IF EXISTS "Support can update products" ON public.products;
DROP POLICY IF EXISTS "Support can delete products" ON public.products;
DROP POLICY IF EXISTS "Admin and support can view audit logs" ON public.audit_logs;

-- 3. إنشاء السياسات الجديدة باستخدام الدالة الآمنة
-- Profiles
CREATE POLICY "Support can view profiles" ON public.profiles FOR SELECT USING (public.get_user_role(auth.uid()) = 'support');
CREATE POLICY "Support can update profiles" ON public.profiles FOR UPDATE USING (public.get_user_role(auth.uid()) = 'support');

-- Orders
CREATE POLICY "Support can view orders" ON public.orders FOR SELECT USING (public.get_user_role(auth.uid()) = 'support');
CREATE POLICY "Support can update orders" ON public.orders FOR UPDATE USING (public.get_user_role(auth.uid()) = 'support');
CREATE POLICY "Support can delete orders" ON public.orders FOR DELETE USING (public.get_user_role(auth.uid()) = 'support');

-- Products
CREATE POLICY "Support can view products" ON public.products FOR SELECT USING (public.get_user_role(auth.uid()) = 'support');
CREATE POLICY "Support can update products" ON public.products FOR UPDATE USING (public.get_user_role(auth.uid()) = 'support');
CREATE POLICY "Support can delete products" ON public.products FOR DELETE USING (public.get_user_role(auth.uid()) = 'support');

-- Audit Logs
CREATE POLICY "Admin and support can view audit logs" ON public.audit_logs FOR SELECT USING (public.get_user_role(auth.uid()) IN ('admin', 'support'));
