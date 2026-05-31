-- =============================================
-- Jumla - تحديث قاعدة البيانات v6
-- إضافة جدول audit_logs، Triggers لتتبع التعديلات
-- وإضافة دور موظف الدعم (support)
-- =============================================

-- 1. إضافة جدول سجل الحركات (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- فهرس لسرعة البحث
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- تفعيل RLS على سجل الحركات
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and support can view audit logs" ON public.audit_logs;
CREATE POLICY "Admin and support can view audit logs"
ON public.audit_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'support')
    )
);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- 2. إنشاء الدالة (Trigger Function) لتسجيل الحركات
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME::text, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only insert if there's an actual change
        IF (OLD IS DISTINCT FROM NEW) THEN
            INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
            VALUES (TG_TABLE_NAME::text, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ربط الدالة بالجداول المستهدفة
-- جدول الطلبات (orders)
DROP TRIGGER IF EXISTS orders_audit_log ON public.orders;
CREATE TRIGGER orders_audit_log
AFTER UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- جدول الملفات الشخصية (profiles)
DROP TRIGGER IF EXISTS profiles_audit_log ON public.profiles;
CREATE TRIGGER profiles_audit_log
AFTER UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- جدول المنتجات (products)
DROP TRIGGER IF EXISTS products_audit_log ON public.products;
CREATE TRIGGER products_audit_log
AFTER UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- 4. تحديث قيد دور المستخدم (Profiles Role Check)
DO $$ 
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('guest', 'merchant', 'admin', 'delivery', 'support'));

-- 5. إضافة سياسات وصول (RLS Policies) الخاصة بموظف الدعم (support)
-- Profiles
DROP POLICY IF EXISTS "Support can view profiles" ON public.profiles;
CREATE POLICY "Support can view profiles" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'support'));

DROP POLICY IF EXISTS "Support can update profiles" ON public.profiles;
CREATE POLICY "Support can update profiles" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'support'));

-- Orders
DROP POLICY IF EXISTS "Support can view orders" ON public.orders;
CREATE POLICY "Support can view orders" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'support'));

DROP POLICY IF EXISTS "Support can update orders" ON public.orders;
CREATE POLICY "Support can update orders" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'support'));

DROP POLICY IF EXISTS "Support can delete orders" ON public.orders;
CREATE POLICY "Support can delete orders" ON public.orders FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'support'));

-- Products
DROP POLICY IF EXISTS "Support can view products" ON public.products;
CREATE POLICY "Support can view products" ON public.products FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'support'));

DROP POLICY IF EXISTS "Support can update products" ON public.products;
CREATE POLICY "Support can update products" ON public.products FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'support'));

DROP POLICY IF EXISTS "Support can delete products" ON public.products;
CREATE POLICY "Support can delete products" ON public.products FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'support'));
