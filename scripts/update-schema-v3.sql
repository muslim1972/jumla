-- 1. إضافة الأعمدة الجديدة لجدول profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS support_phone TEXT,
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. إضافة الأعمدة الجديدة لجدول orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number INTEGER,
ADD COLUMN IF NOT EXISTS support_phone TEXT;

-- 3. إنشاء جدول لتتبع تسلسل الفواتير لكل تاجر
CREATE TABLE IF NOT EXISTS public.merchant_sequences (
  merchant_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_value INTEGER NOT NULL DEFAULT 0
);

-- إعطاء صلاحيات للجدول الجديد
ALTER TABLE public.merchant_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "الجميع يمكنه قراءة التسلسل"
  ON public.merchant_sequences FOR SELECT
  USING (true);

-- 4. إنشاء دالة (Function) لتوليد رقم الفاتورة التسلسلي بأمان
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_merchant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next_val INTEGER;
BEGIN
  INSERT INTO public.merchant_sequences (merchant_id, last_value)
  VALUES (p_merchant_id, 1)
  ON CONFLICT (merchant_id) DO UPDATE
  SET last_value = merchant_sequences.last_value + 1
  RETURNING last_value INTO v_next_val;
  
  RETURN v_next_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. جدول الإشعارات (اذا لم يكن موجوداً) لتسجيل إشعارات التعديل للتاجر
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المستخدم يرى إشعاراته"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "يمكن إضافة إشعارات"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
