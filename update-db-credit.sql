-- Create trusted_buyers table
CREATE TABLE IF NOT EXISTS public.trusted_buyers (
  merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (merchant_id, buyer_id)
);

-- Add fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- Update existing orders to have amount_paid = total_rounded (Assuming all old orders were cash)
UPDATE public.orders 
SET amount_paid = total_rounded 
WHERE is_credit = false 
  AND (amount_paid IS NULL OR amount_paid = 0) 
  AND total_rounded > 0;
