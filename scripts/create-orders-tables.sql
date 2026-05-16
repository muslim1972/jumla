-- =============================================
-- Jumla - Orders & Invoicing System
-- =============================================

-- 1. جدول الطلبات (orders)
-- كل طلب مرتبط بتاجر واحد فقط (فاتورة لكل تاجر على حدة)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  merchant_id UUID REFERENCES auth.users(id) NOT NULL,
  verification_code VARCHAR(7) NOT NULL,
  store_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(11) NOT NULL,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  total_rounded INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

-- 2. جدول عناصر الطلب (order_items)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  product_name TEXT NOT NULL,
  product_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. فهرس فريد لكود التحقق لمنع التكرار
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_verification_code ON orders(verification_code);

-- 4. فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 5. تمكين RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 6. سياسات RLS للطلبات
-- المشتري يستطيع رؤية طلباته فقط
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- التاجر يستطيع رؤية الطلبات الموجهة إليه
CREATE POLICY "Merchants can view their orders"
  ON orders FOR SELECT
  USING (auth.uid() = merchant_id);

-- المشتري يستطيع إنشاء طلبات
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- التاجر يستطيع تحديث حالة الطلب (للتوصيل)
CREATE POLICY "Merchants can update order status"
  ON orders FOR UPDATE
  USING (auth.uid() = merchant_id);

-- 7. سياسات RLS لعناصر الطلب
-- القراءة: المشتري صاحب الطلب أو التاجر
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR orders.merchant_id = auth.uid())
    )
  );

-- الإنشاء: المشتري صاحب الطلب فقط
CREATE POLICY "Users can create order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
