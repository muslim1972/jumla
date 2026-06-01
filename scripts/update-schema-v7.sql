-- =============================================
-- Jumla - تحديث قاعدة البيانات v7
-- إضافة نظام التحاسب مع التجار
-- =============================================

-- 1. إنشاء جدول الفواتير (merchant_billings)
CREATE TABLE IF NOT EXISTS public.merchant_billings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    first_invoice_number BIGINT,
    last_invoice_number BIGINT,
    total_sales NUMERIC DEFAULT 0,
    commission_percentage NUMERIC DEFAULT 0,
    amount_due NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. إضافة حقلرقم الفاتورة إلى جدول الطلبات (orders)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS billing_id UUID REFERENCES public.merchant_billings(id) ON DELETE SET NULL;

-- 3. تفعيل RLS لجدول الفواتير
ALTER TABLE public.merchant_billings ENABLE ROW LEVEL SECURITY;

-- الإدارة والدعم يمكنهم القيام بأي عملية على الفواتير
DROP POLICY IF EXISTS "Admin/Support can do all on merchant_billings" ON public.merchant_billings;
CREATE POLICY "Admin/Support can do all on merchant_billings" ON public.merchant_billings FOR ALL 
USING (public.get_user_role(auth.uid()) IN ('admin', 'support'));

-- التاجر يمكنه فقط رؤية فواتيره الخاصة
DROP POLICY IF EXISTS "Merchant can view own billings" ON public.merchant_billings;
CREATE POLICY "Merchant can view own billings" ON public.merchant_billings FOR SELECT 
USING (auth.uid() = merchant_id AND public.get_user_role(auth.uid()) = 'merchant');

-- 4. إضافة Trigger سجل الحركات (Audit Log)
DROP TRIGGER IF EXISTS merchant_billings_audit_log ON public.merchant_billings;
CREATE TRIGGER merchant_billings_audit_log
AFTER UPDATE OR DELETE ON public.merchant_billings
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
