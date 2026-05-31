-- =============================================
-- Jumla - تحديث قاعدة البيانات v4
-- إضافة حالة "editing" للطلبات + السماح للمشتري بتعديل طلبه
-- =============================================

-- 1. تحديث قيد CHECK لإضافة حالة 'editing'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'delivered', 'cancelled', 'editing'));

-- 2. إضافة سياسة تسمح للمشتري بتحديث طلبه (لتغيير الحالة إلى editing أو pending)
-- حذف السياسة القديمة إن وجدت
DROP POLICY IF EXISTS "Buyers can update own orders" ON orders;

CREATE POLICY "Buyers can update own orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. إضافة سياسة تسمح للمشتري بحذف عناصر الطلب (عند التعديل)
DROP POLICY IF EXISTS "Users can delete own order items" ON order_items;

CREATE POLICY "Users can delete own order items"
  ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
