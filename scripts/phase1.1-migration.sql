-- المرحلة 1.1: نظام إدارة علاقات الوحدات (UOM) وإضافة الأقسام الناقصة

-- 1. إضافة قسم السجائر الصريح
INSERT INTO public.categories (name, icon_url) VALUES 
('سجائر ومستلزمات التدخين', NULL)
ON CONFLICT DO NOTHING;

-- 2. تحديث جدول المنتجات لدعم نظام UOM
-- `stock_unit`: الوحدة التي أدخل التاجر فيها المخزون الأصلي (مثال: كارتون)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_unit TEXT;

-- `unit_conversions`: هيكل العلاقات بين الوحدات
-- مثال: [{"from": "كارتون", "to": "تكة", "multiplier": 50}, {"from": "تكة", "to": "مفرد", "multiplier": 10}]
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_conversions JSONB DEFAULT '[]'::jsonb;
