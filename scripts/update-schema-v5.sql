-- =============================================
-- Jumla - تحديث قاعدة البيانات v5
-- إضافة حالة "archived" للطلبات المؤرشفة
-- =============================================

-- 1. تحديث قيد CHECK لإضافة حالة 'archived'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'delivered', 'cancelled', 'editing', 'archived'));

-- 2. فهرس للأداء على الأرشيف
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(user_id, status) WHERE status = 'archived';
