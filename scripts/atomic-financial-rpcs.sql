-- =============================================================
-- دوال ذرّية (Atomic RPCs) للعمليات المالية في تطبيق "جملتي"
-- الهدف: إزالة نمط القراءة-التعديل-الكتابة المعرض لسباقات البيانات
--   1) charge_wallet      : شحن المحفظة (تحديث + قيد محاسبي ذرّياً)
--   2) pay_order_debt     : سداد دين الطلب (قفل صف + شرط عدم تجاوز الإجمالي)
--   3) add_reward_points  : إضافة نقاط الولاء مع حساب المستوى (tier) داخل SQL
-- ملاحظة: الدوال SECURITY DEFINER مع تحقق صلاحيات داخلها من auth.uid()
-- =============================================================

-- -------------------------------------------------------------
-- 1) شحن المحفظة
-- يستدعيها المستخدم نفسه فقط (auth.uid = صاحب المحفظة)
-- تحديث الرصيد وإدراج الحركة في نفس المعاملة (ذرّي)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.charge_wallet(p_amount NUMERIC, p_description TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_amount IS NULL OR p_amount < 25000 THEN
    RAISE EXCEPTION 'MIN_AMOUNT';
  END IF;

  -- قفل صف المحفظة لمنع السباق، وإنشاؤها إن لم توجد
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = auth.uid() FOR UPDATE;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO wallets (user_id, balance) VALUES (auth.uid(), 0) RETURNING id INTO v_wallet_id;
    EXCEPTION WHEN unique_violation THEN
      -- محفظة أُنشئت للتو بواسطة معاملة متوازية
      SELECT id INTO v_wallet_id FROM wallets WHERE user_id = auth.uid();
    END;
  END IF;

  -- زيادة ذرّية على مستوى قاعدة البيانات (لا قراءة-تعديل-كتابة)
  UPDATE wallets
  SET balance = balance + p_amount
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- تسجيل الحركة في نفس المعاملة
  INSERT INTO wallet_transactions (wallet_id, amount, type, status, reference_id, description)
  VALUES (
    v_wallet_id,
    p_amount,
    'deposit_mastercard',
    'completed',
    'MC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 8)),
    p_description
  );

  RETURN json_build_object('success', true, 'newBalance', v_new_balance);
END;
$$;

-- -------------------------------------------------------------
-- 2) سداد دين الطلب
-- يُسمح لطرفَي الطلب (التاجر أو المشتري) أو للأدمن فقط
-- قفل صف الطلب (FOR UPDATE) يمنع دفعات متوازية متضاربة
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_order_debt(p_order_id UUID, p_payment_amount NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_caller_is_admin BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_payment_amount IS NULL OR p_payment_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT role = 'admin' INTO v_caller_is_admin FROM profiles WHERE id = auth.uid();

  -- قفل الصف أولاً لسلسلة العمليات
  SELECT total_rounded, amount_paid, merchant_id, user_id, status
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF NOT (v_order.merchant_id = auth.uid() OR v_order.user_id = auth.uid() OR COALESCE(v_caller_is_admin, false)) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF v_order.status NOT IN ('approved', 'delivered', 'completed') THEN
    RAISE EXCEPTION 'ORDER_NOT_PAYABLE';
  END IF;

  IF v_order.amount_paid >= v_order.total_rounded THEN
    RAISE EXCEPTION 'ALREADY_SETTLED';
  END IF;

  IF v_order.amount_paid + p_payment_amount > v_order.total_rounded THEN
    RAISE EXCEPTION 'OVERPAYMENT';
  END IF;

  UPDATE orders
  SET amount_paid = amount_paid + p_payment_amount
  WHERE id = p_order_id;

  RETURN json_build_object('success', true, 'amountPaid', v_order.amount_paid + p_payment_amount);
END;
$$;

-- -------------------------------------------------------------
-- 3) إضافة نقاط الولاء
-- يُسمح فقط للمندوب/الأدمن/الدعم (هم من يمنحون النقاط برمجياً)
-- التحديث ذرّي وحساب tier يتم داخل SQL من القيمة الجديدة
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_reward_points(p_user_id UUID, p_points INT, p_reason TEXT, p_type TEXT DEFAULT 'points')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_new_points INT;
  v_new_tier TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF COALESCE(v_caller_role, '') NOT IN ('delivery', 'admin', 'support') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  UPDATE profiles
  SET points = points + p_points,
      lifetime_points = lifetime_points + GREATEST(p_points, 0),
      tier = CASE
        WHEN lifetime_points + GREATEST(p_points, 0) >= 10000 THEN 'platinum'
        WHEN lifetime_points + GREATEST(p_points, 0) >= 5000 THEN 'gold'
        WHEN lifetime_points + GREATEST(p_points, 0) >= 1000 THEN 'silver'
        ELSE 'bronze'
      END
  WHERE id = p_user_id
  RETURNING points, tier INTO v_new_points, v_new_tier;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  INSERT INTO rewards_history (user_id, points_change, reason, type)
  VALUES (p_user_id, p_points, p_reason, p_type);

  RETURN json_build_object('success', true, 'newPoints', v_new_points, 'newTier', v_new_tier);
END;
$$;
