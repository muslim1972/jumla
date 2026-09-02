-- ==============================================================================
-- سكربت التحصين الأمني الشامل — تفعيل RLS على كل الجداول المفتوحة
-- التاريخ: 2026-09-02 — نسخة مُراجَعة ضد الصورة الحية للقاعدة
-- (سُحبت الجداول والأعمدة والسياسات والقيود فعلياً عبر inspect-live-schema*.sql)
-- المشروع: hslpavldgvlpkvqgogcc (جُملتي)
--
-- الاستراتيجية (ترتيب آمن عن عمد):
--   1) إنشاء/تحديث دالة get_user_role أولاً (تعتمد عليها كل السياسات)
--   2) مسح كل السياسات القديمة المتضاربة على الجداول الـ13 (نظافة كاملة)
--   3) إنشاء السياسات الجديدة قبل تفعيل RLS
--   4) تفعيل RLS أخيراً — فإن فشل أي خطوة سابقة تبقى الجداول بوضعها الحالي
--      ولا ينكسر التطبيق
--
-- الجداول المشمولة (كلها UNRESTRICTED أو بسياسات مفتوحة مؤكدة بالسحب الفعلي):
--   profiles, products, cart_items, orders, order_items, notifications,
--   app_settings, banners, top_banners, ad_requests, merchant_billings, audit_logs
--   + rewards_history (RLS مفعّل سابقاً لكن سياسة allow_all مفتوحة على الكل!)
--
-- جداول لا نلمسها (مؤكدة بالسحب الفعلي):
--   - categories: RLS مفعّل بسياسات قراءة عامة وكتابة أدمن — سليمة وتعمل بعد التحصين
--   - wallets, wallet_transactions: RLS مفعّل بسياسات ذاتية — سليمة
--   - trusted_buyers: RLS مفعّل بلا سياسات عمداً — الكود يصلها حصرياً عبر
--     service role (cart/page.tsx و features/credit/actions.ts)
--
-- كتابات نظامية تمر عبر دوال SECURITY DEFINER فتتجاوز RLS تلقائياً:
--   audit_trigger_func, handle_new_user, decrement_stock,
--   get_next_invoice_number, charge_wallet, add_reward_points
-- ==============================================================================

-- ==============================================================================
-- 0) دالة قراءة الدور — SECURITY DEFINER لتفادي recursion في سياسات profiles
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id
$$;

-- ==============================================================================
-- 1) مسح شامل للسياسات القديمة على الجداول الـ13
--    (مؤكد بالسحب الفعلي: orders فيها 3 سياسات قديمة بنمط EXISTS على profiles
--     ستنكسر بعد تفعيل RLS على profiles إن بقيت — و rewards_history فيها
--     allow_all المفتوحة على الكل — كلها تُمسح هنا)
-- ==============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','products','cart_items','orders','order_items',
        'notifications','app_settings','banners','top_banners',
        'ad_requests','merchant_billings','audit_logs','rewards_history'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ==============================================================================
-- 2) profiles — البروفايلات
--    القراءة: التجار للعموم (الرئيسية والمتجر)، الشخص لنفسه، الإدارة والتوصيل للكل
--    الإدخال: عبر trigger نظامي (handle_new_user) — لا يحتاج سياسة
--    الحذف: عبر service role فقط (حذف الحساب) — لا يحتاج سياسة
--    التحديث: مقسوم سياساتين (انظر أدناه)
-- ==============================================================================
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (
    role = 'merchant'
    OR id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support','delivery')
  );

-- تحديث النفس: مع تثبيت عمود role — يمنع أي مستخدم من ترقية نفسه إلى admin
-- (القاعدة الحية بها أكواد تحديث ذاتي للاسم/العنوان/الهاتف/أجور التوصيل — كلها
--  لا تمس role فتُقبل؛ أما محاولة تغيير role فترفض هنا)
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND public.get_user_role(id) IS NOT DISTINCT FROM role
  );

-- تحديث الآخرين: أدمن/سابورت بحرية كاملة (لوحة الأدمن تغيّر role فعلاً
-- والسابورت يعدّل store_name/phone/address فقط — كلاهما مغطى هنا)
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'))
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'));

-- ==============================================================================
-- 3) products — المنتجات
--    القراءة: للعموم (الرئيسية/المتجر/السلة)
--    الإدارة: التاجر لمنتجاته فقط + أدمن/سابورت
--    (خصم المخزون يتم عبر دالة decrement_stock النظامية ولا يتأثر)
-- ==============================================================================
CREATE POLICY "products_select" ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (
    merchant_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
  )
  WITH CHECK (
    merchant_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
  );

CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (
    merchant_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
  );

-- ==============================================================================
-- 4) cart_items — عناصر السلة
--    CRUD ذاتي للمشتري + التاجر يمكنه حذف عناصر السلة لمنتجاته
--    (عند حذف منتج يُنظّف التاجر عناصر السلة المرتبطة به)
-- ==============================================================================
CREATE POLICY "cart_items_select" ON public.cart_items
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cart_items_insert" ON public.cart_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cart_items_update" ON public.cart_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cart_items_delete" ON public.cart_items
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = cart_items.product_id
        AND p.merchant_id = auth.uid()
    )
  );

-- ==============================================================================
-- 5) orders — الطلبات
--    القراءة: المشتري، التاجر، عامل التوصيل المعيّن، أي delivery، أدمن/سابورت
--    الإنشاء: المشتري لنفسه (+ أدمن/سابورت)
--    التحديث: المشتري (تعديل/أرشفة)، التاجر (قبول/رفض)، التوصيل (تسليم)، أدمن/سابورت
--    الحذف: المشتري لنفسه + أدمن/سابورت
--    ملاحظة: حذف الطلب يحذف عناصره تلقائياً (ON DELETE CASCADE — يتجاوز RLS)
-- ==============================================================================
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR merchant_id = auth.uid()
    OR delivery_worker_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support','delivery')
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
  );

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR merchant_id = auth.uid()
    OR delivery_worker_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support','delivery')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR merchant_id = auth.uid()
    OR delivery_worker_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support','delivery')
  );

CREATE POLICY "orders_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
  );

-- ==============================================================================
-- 6) order_items — عناصر الطلب (ترتبط بالطلب الأب عبر order_id — لا merchant_id هنا)
-- ==============================================================================
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support','delivery')
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          o.user_id = auth.uid()
          OR o.merchant_id = auth.uid()
          OR o.delivery_worker_id = auth.uid()
        )
    )
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_delete" ON public.order_items
  FOR DELETE TO authenticated
  USING (
    COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR o.merchant_id = auth.uid())
    )
  );

-- ==============================================================================
-- 7) notifications — الإشعارات
--    القراءة/التحديث (تعليم كمقروء): صاحب الإشعار فقط
--    الإدخال: أي مستخدم مسجل — لأن النظام يُدرج إشعاراً للطرف الآخر
--    (المشتري يُدرج إشعاراً للتاجر عند الطلب/التعديل)
-- ==============================================================================
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ==============================================================================
-- 8) app_settings — إعدادات التطبيق
--    القراءة: للعموم (رقم الدعم يظهر في الطلبات)
--    الكتابة: أدمن فقط (upsert)
-- ==============================================================================
CREATE POLICY "app_settings_select" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "app_settings_insert" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') = 'admin');

CREATE POLICY "app_settings_update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') = 'admin')
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') = 'admin');

-- ==============================================================================
-- 9) banners + top_banners — الإعلانات
--    القراءة: للعموم | الكتابة: أدمن فقط
-- ==============================================================================
CREATE POLICY "banners_select" ON public.banners
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "banners_admin_all" ON public.banners
  FOR ALL TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') = 'admin')
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') = 'admin');

CREATE POLICY "top_banners_select" ON public.top_banners
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "top_banners_admin_all" ON public.top_banners
  FOR ALL TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') = 'admin')
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') = 'admin');

-- ==============================================================================
-- 10) ad_requests — طلبات الإعلان
--     الإدخال: للعموم (نموذج الزوار دون تسجيل — مؤكد في top-announcement-bar)
--     الإدارة: أدمن/سابورت (عرض وحذف)
-- ==============================================================================
CREATE POLICY "ad_requests_insert" ON public.ad_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "ad_requests_admin_all" ON public.ad_requests
  FOR ALL TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'))
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'));

-- ==============================================================================
-- 11) merchant_billings — فواتير العمولة
--     القراءة: التاجر لفواتيره + أدمن/سابورت للكل
--     الإدارة (إصدار/تسديد): أدمن/سابورت
-- ==============================================================================
CREATE POLICY "merchant_billings_select" ON public.merchant_billings
  FOR SELECT TO authenticated
  USING (
    merchant_id = auth.uid()
    OR COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support')
  );

CREATE POLICY "merchant_billings_insert" ON public.merchant_billings
  FOR INSERT TO authenticated
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'));

CREATE POLICY "merchant_billings_update" ON public.merchant_billings
  FOR UPDATE TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'))
  WITH CHECK (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'));

CREATE POLICY "merchant_billings_delete" ON public.merchant_billings
  FOR DELETE TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'));

-- ==============================================================================
-- 12) audit_logs — سجل التدقيق
--     القراءة: أدمن/سابورت
--     الإدخال: يحدث فعلياً عبر trigger نظامي (SECURITY DEFINER) — سياسة الإدخال
--     أدناه شبكة أمان فقط، والحذف/التحديث عبر service role فقط
-- ==============================================================================
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (COALESCE(public.get_user_role(auth.uid()), '') IN ('admin','support'));

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ==============================================================================
-- 13) rewards_history — سجل المكافآت
--     الحالة الحية: RLS مفعّل لكن سياسة allow_all مفتوحة على الكل (قراءة وكتابة
--     لكل المستخدمين) — تُمسح أعلاه وتُستبدل بقراءة ذاتية فقط.
--     الكتابة الفعلية للنقاط عبر دالة add_reward_points الذرّية (تتجاوز RLS)
--     والقراءة في الكود ذاتية دائماً (getUserRewards)
-- ==============================================================================
CREATE POLICY "rewards_history_select_self" ON public.rewards_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ==============================================================================
-- 14) التفعيل النهائي — آخر خطوة عمداً
--     (فإن فشل أي سياسة أعلاه يتوقف السكربت قبل هنا وتبقى الجداول بوضعها)
-- ==============================================================================
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top_banners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_history  ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 15) تحقق نهائي — يجب أن ترى كل الجداول rls_enabled = true مع عدد سياساتها
-- ==============================================================================
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COUNT(pol.polname) AS policies_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'profiles','products','cart_items','orders','order_items',
    'notifications','app_settings','banners','top_banners',
    'ad_requests','merchant_billings','audit_logs','rewards_history'
  )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;
