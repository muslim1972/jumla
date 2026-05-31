-- 1. تحديث جدول profiles لقبول دور عامل التوصيل (delivery)
-- ملاحظة: إذا كان هناك قيد (Check Constraint) سابق سنقوم بإسقاطه وإنشاء واحد جديد.
DO $$ 
BEGIN
  -- حاول إسقاط القيد القديم إذا كان موجوداً
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- إضافة القيد الجديد المحدث
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('guest', 'merchant', 'admin', 'delivery'));

-- 2. إضافة حقول عامل التوصيل لجدول الطلبات (orders)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS delivery_worker_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS delivery_worker_name TEXT;

-- 3. تحديث سياسات الوصول (RLS) للطلبات (orders) لتشمل عامل التوصيل
-- يمكن لعامل التوصيل رؤية جميع الطلبات (ليتمكن من تصفح قوائم التجار)
DROP POLICY IF EXISTS "Delivery workers can view orders" ON public.orders;
CREATE POLICY "Delivery workers can view orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'delivery'
    )
  );

-- يمكن لعامل التوصيل تحديث حالة الطلبات (عند تسليمها وادخال الكود)
DROP POLICY IF EXISTS "Delivery workers can update orders" ON public.orders;
CREATE POLICY "Delivery workers can update orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'delivery'
    )
  );

-- 4. تحديث سياسات الوصول (RLS) لعناصر الطلبات (order_items) لكي يراها عامل التوصيل
DROP POLICY IF EXISTS "Delivery workers can view order items" ON public.order_items;
CREATE POLICY "Delivery workers can view order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'delivery'
    )
  );
