-- =========================================================================================
-- Master Fix for Supabase Schema (Jumla App)
-- Run this script in your Supabase SQL Editor to fix missing columns, constraints, and RLS.
-- =========================================================================================

-- 1. Fix profiles role constraint
DO $$ 
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('guest', 'merchant', 'admin', 'delivery', 'buyer', 'support'));

-- 2. Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_merchants JSONB DEFAULT '[]'::jsonb;

-- 3. Add missing columns to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_worker_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS delivery_worker_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number INTEGER,
  ADD COLUMN IF NOT EXISTS billing_id UUID;

-- 4. Fix orders status check constraint
DO $$ 
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status = any (
    array[
      'pending'::text,      -- قيد الانتظار (من المشتري للتاجر)
      'approved'::text,     -- تمت الموافقة عليه ومجهز (من التاجر لعامل التوصيل)
      'delivered'::text,    -- تم التوصيل بنجاح للعميل بانتظار استلام التاجر للمبلغ
      'completed'::text,    -- استلم التاجر المبلغ والمهمة انتهت
      'rejected'::text,     -- تم رفضه من التاجر
      'cancelled'::text,    -- ملغى
      'editing'::text,      -- قيد التعديل
      'archived'::text      -- مؤرشف
    ]
  )
);

-- 5. Fix RLS Policies for delivery role
-- Allow delivery workers to view orders
DROP POLICY IF EXISTS "Delivery workers can view orders" ON public.orders;
CREATE POLICY "Delivery workers can view orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'delivery'
    )
  );

-- Allow delivery workers to update orders
DROP POLICY IF EXISTS "Delivery workers can update orders" ON public.orders;
CREATE POLICY "Delivery workers can update orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'delivery'
    )
  );

-- Allow delivery workers to view order items
DROP POLICY IF EXISTS "Delivery workers can view order items" ON public.order_items;
CREATE POLICY "Delivery workers can view order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'delivery'
    )
  );

-- Allow merchants to update their orders (they need it to change status to completed)
DROP POLICY IF EXISTS "Merchants can update order status" ON public.orders;
CREATE POLICY "Merchants can update order status"
  ON public.orders FOR UPDATE
  USING (auth.uid() = merchant_id OR auth.uid() = user_id);

-- 6. Realtime replication has been handled manually by the user.
