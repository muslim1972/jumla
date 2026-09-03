-- إصلاح فشل تطبيق تعديلات التاجر على القائمة (بعد موافقة المشتري):
-- 1) كان تحديث كمية مادة موجودة (مثل 6 إلى 4) يفشل بصمت لعدم وجود سياسة UPDATE
--    على جدول order_items (توجد سياسات SELECT وINSERT وDELETE فقط)
-- 2) كان استرداد الكميات إلى مخزن التاجر يفشل بصمت لأن المشتري لا يملك سياسة
--    UPDATE على products — أُنشئت دالة نظامية SECURITY DEFINER تقوم بالزيادة
--    بعد التحقق أن المستدعي طرفاً في الطلب

-- 1) سياسة UPDATE على عناصر الطلب لمالك الطلب أو التاجر (وأيضاً الإدارة والدعم)
DROP POLICY IF EXISTS "order_items_update" ON public.order_items;
CREATE POLICY "order_items_update" ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR o.merchant_id = auth.uid())
    )
  )
  WITH CHECK (
    COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR o.merchant_id = auth.uid())
    )
  );

-- 2) دالة نظامية لاسترداد كمية إلى مخزون المنتج (تعمل بتجاوز RLS)
--    تتحقق أن المستدعي مالك الطلب أو تاجره قبل السماح بالزيادة
CREATE OR REPLACE FUNCTION public.restore_stock_quantity(
  p_order_id uuid,
  p_product_id uuid,
  p_quantity numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_order_id IS NULL OR p_product_id IS NULL THEN
    RETURN;
  END IF;

  -- التحقق أن المتصل طرف في الطلب (المشتري المالك أو التاجر)
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id
      AND (user_id = auth.uid() OR merchant_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'NOT_PERMITTED';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.products
  SET stock_quantity = COALESCE(stock_quantity, 0) + p_quantity
  WHERE id = p_product_id;
END;
$$;
