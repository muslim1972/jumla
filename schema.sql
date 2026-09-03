-- Supabase Schema script for Jumla Application

-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles table (maps to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'buyer', -- 'admin', 'support', 'merchant', 'delivery', 'buyer'
  phone TEXT,
  store_name TEXT,
  address TEXT,
  delivery_fee NUMERIC,
  assigned_merchants JSONB, -- Array of merchant ids for delivery workers
  banned_until timestamptz, -- تاريخ انتهاء الحظر (infinity للحظر الدائم، NULL لغير المحظور)
  support_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id SERIAL PRIMARY KEY,
  support_phone TEXT,
  delivery_fee NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Insert default app settings
INSERT INTO public.app_settings (id, support_phone, delivery_fee) VALUES (1, '07800000000', 5000) ON CONFLICT (id) DO NOTHING;

-- 3. merchant_billings table
CREATE TABLE IF NOT EXISTS public.merchant_billings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  first_invoice_number INTEGER,
  last_invoice_number INTEGER,
  total_sales NUMERIC,
  commission_percentage NUMERIC,
  amount_due NUMERIC,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image_url TEXT,
  unit_type TEXT NOT NULL,
  units JSONB,
  description TEXT,
  merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'delivered', 'completed', 'rejected', 'cancelled', 'editing', 'archived'
  total_rounded NUMERIC,
  store_name TEXT,
  phone TEXT,
  address TEXT,
  user_id UUID REFERENCES public.profiles(id),
  merchant_id UUID REFERENCES public.profiles(id),
  verification_code TEXT,
  subtotal NUMERIC,
  delivery_fee NUMERIC,
  delivery_worker_name TEXT,
  support_phone TEXT,
  billing_id UUID REFERENCES public.merchant_billings(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT,
  product_price NUMERIC,
  quantity NUMERIC,
  unit_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. banners table
CREATE TABLE IF NOT EXISTS public.banners (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT,
  description TEXT,
  bg_gradient TEXT,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. top_banners table
CREATE TABLE IF NOT EXISTS public.top_banners (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  text TEXT,
  link_url TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ad_requests table
CREATE TABLE IF NOT EXISTS public.ad_requests (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT,
  phone TEXT,
  duration TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT,
  record_id TEXT,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to get next invoice number for a specific merchant
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_merchant_id UUID)
RETURNS integer AS $$
DECLARE
  next_invoice_number integer;
BEGIN
  SELECT COALESCE(MAX(invoice_number), 0) + 1 INTO next_invoice_number
  FROM public.orders
  WHERE merchant_id = p_merchant_id;
  
  RETURN next_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', row_to_json(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', NULL, row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add Audit Triggers to important tables
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_orders_trigger ON public.orders;
CREATE TRIGGER audit_orders_trigger
AFTER UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_products_trigger ON public.products;
CREATE TRIGGER audit_products_trigger
AFTER UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, assigned_merchants)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'buyer'),
    new.raw_user_meta_data->'assigned_merchants'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable RLS (Row Level Security) - if needed
-- Optional: Provide full access for authenticated users to avoid RLS block initially
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow_all" ON public.profiles FOR ALL USING (true);

