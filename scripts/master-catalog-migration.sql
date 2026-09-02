-- ============================================================
-- سكربت ترحيل: الكتالوج المركزي للمواد (حساب إدارة المواد)
-- ------------------------------------------------------------
-- ينشئ:
--   1) جدول master_products — قاعدة البيانات المركزية للمواد الأساسية
--   2) عمود master_product_id على products لربط منتجات التجار بالمركز
--   3) trigger ينشر تعديلات المادة المركزية (اسم/وصف/صورة/قسم) تلقائياً
--      على كل منتجات التجار المرتبطة (ربط حي)
--   4) RLS على master_products: القراءة للمسجلين، الإدارة لـ materials/admin
--   5) توسيع قيد الدور في profiles ليشمل الدور الجديد 'materials'
-- السكربت قابل لإعادة التنفيذ (Idempotent) — لا يكسر شيئاً إن أُعيد
-- ============================================================

-- ============================================================
-- 1) جدول الكتالوج المركزي
-- ============================================================
CREATE TABLE IF NOT EXISTS public.master_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  -- الباركود اختياري حالياً: أرقام فقط بطول 8 أو 12 أو 13 أو 14 (EAN-8/UPC-A/EAN-13/GTIN-14)
  barcode TEXT CONSTRAINT master_products_barcode_format
    CHECK (barcode IS NULL OR barcode = '' OR barcode ~ '^[0-9]{8}([0-9]{4,6})?$'),
  -- السعر الأساسي المرجعي (اختياري) — لا يُفرض على التجار
  base_price NUMERIC(12,2),
  -- بنية الوحدات تحددها الإدارة مرة واحدة: [{"type":"كارتون","multiplier_to_base":12}, ...] بلا أسعار
  units JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit_conversions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- منع تكرار نفس الباركود لأكثر من مادة (لغير الفارغ فقط)
CREATE UNIQUE INDEX IF NOT EXISTS master_products_barcode_unique
  ON public.master_products (barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

-- فهرس البحث بالاسم
CREATE INDEX IF NOT EXISTS master_products_name_idx
  ON public.master_products (name);

-- ============================================================
-- 2) ربط منتجات التجار بالسجل المركزي
--    ON DELETE SET NULL: لو حُذفت مادة مركزية تبقى نسخ التاجر تعمل
--    (التطبيق يمنع الحذف والمادة مرتبطة، هذا شبكة أمان على مستوى القاعدة)
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_master_product_idx
  ON public.products (master_product_id);

-- ============================================================
-- 3) trigger النشر الحي: أي تعديل على بيانات المادة الأساسية
--    (الاسم/الوصف/الصورة/القسم) يصل فوراً لكل منتجات التجار المرتبطة.
--    SECURITY DEFINER لأن موظف إدارة المواد لا يملك صلاحية UPDATE
--    على جدول products في RLS — الدالة تنشر باسم مالكها فقط لهذه الأعمدة.
--    ملاحظة: بنية الوحدات (units) لا تُنشر — التجار المرتبطون يحتفظون
--    بالبنية التي سعّروا عليها، والجدد يرون البنية الجديدة.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_master_product_to_products()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products p
  SET name = NEW.name,
      description = COALESCE(NEW.description, p.description),
      image_url = COALESCE(NEW.image_url, p.image_url),
      category_id = NEW.category_id
  WHERE p.master_product_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_master_product ON public.master_products;
CREATE TRIGGER trg_sync_master_product
  AFTER UPDATE OF name, description, category_id, image_url ON public.master_products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_master_product_to_products();

-- ============================================================
-- 4) RLS على master_products
-- ============================================================
DROP POLICY IF EXISTS "master_products_read" ON public.master_products;
CREATE POLICY "master_products_read" ON public.master_products
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "master_products_manage" ON public.master_products;
CREATE POLICY "master_products_manage" ON public.master_products
  FOR ALL TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') IN ('materials','admin'))
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') IN ('materials','admin'));

ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5) توسيع قيد الدور في profiles ليشمل 'materials'
--    (إعادة إنشاء القيمة بكامل الأدوار المعروفة + materials)
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('guest','merchant','admin','support','delivery','buyer','materials'));

-- ============================================================
-- استعلام تحقق نهائي — النتيجة المطلوبة:
--   master_products_exists = true
--   products_fk_column     = true
--   master_policies_count  = 2
--   sync_trigger           = true
--   role_constraint_updated = profiles_role_check
-- ============================================================
SELECT
  (to_regclass('public.master_products') IS NOT NULL) AS master_products_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'master_product_id'
  ) AS products_fk_column,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'master_products') AS master_policies_count,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.master_products'::regclass AND tgname = 'trg_sync_master_product' AND NOT tgisinternal
  ) AS sync_trigger,
  (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%materials%'
    LIMIT 1
  ) AS role_constraint_updated;
