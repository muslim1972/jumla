-- السماح للإدارة (admin) برؤية وتحديث الطلبات لغرض التحاسب والمتابعة
DROP POLICY IF EXISTS "Admin can view orders" ON public.orders;
CREATE POLICY "Admin can view orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;
CREATE POLICY "Admin can update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admin can view order items" ON public.order_items;
CREATE POLICY "Admin can view order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
