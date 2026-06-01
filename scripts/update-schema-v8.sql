-- ==============================================================================
-- تحديث رقم 8: إضافة حالات الطلب (approved, rejected) للتاجر
-- ==============================================================================

-- إسقاط قيد الفحص القديم لحالة الطلب
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- إضافة قيد الفحص الجديد ليحتوي على الحالات الإضافية الخاصة بموافقة التاجر
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status = any (
    array[
      'pending'::text,      -- قيد الانتظار (من المشتري للتاجر)
      'approved'::text,     -- تمت الموافقة عليه ومجهز (من التاجر لعامل التوصيل)
      'rejected'::text,     -- تم رفضه من التاجر
      'delivered'::text,    -- تم التوصيل بنجاح
      'cancelled'::text,    -- ملغى
      'editing'::text,      -- قيد التعديل
      'archived'::text      -- مؤرشف
    ]
  )
);
