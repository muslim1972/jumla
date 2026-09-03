-- إضافة عمود التعديلات المقترحة على الطلبات
-- التاجر يقترح تعديلات الكميات وتُخزن هنا بانتظار موافقة المشتري
-- لا تُطبق التعديلات فعلياً على order_items إلا بعد موافقة المشتري

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pending_edits jsonb;
