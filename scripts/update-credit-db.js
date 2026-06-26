const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const sql = `
  CREATE TABLE IF NOT EXISTS public.trusted_buyers (
    merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (merchant_id, buyer_id)
  );

  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT false;
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

  UPDATE public.orders SET amount_paid = total_rounded WHERE is_credit = false AND (amount_paid IS NULL OR amount_paid = 0) AND total_rounded > 0;
  `
  // Supabase doesn't have a direct raw SQL endpoint via JS client easily. 
  // I'll just write it to a file and tell the user to run it, or use the project's existing DB update mechanism.
}
run()
