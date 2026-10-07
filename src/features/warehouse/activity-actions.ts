"use server"

import { createClient } from "@/utils/supabase/server"
import { getActorContext } from "@/features/staff/lib/guard"
import type { MerchantActivityRow } from "@/features/warehouse/lib/types"

/**
 * سجل التغييرات لتاجر محدد — أول مرة تُعرض بيانات التدقيق على التاجر.
 * القراءة تتم عبر دالة SQL آمنة (get_merchant_activity) تتحقق داخلياً أن كل
 * سجل يخص هذا التاجر أو موظفيه، فلا يُكشف أي سجل يخص غيره مهما حدث.
 */
export async function getMerchantActivity(limit = 120): Promise<{ rows?: MerchantActivityRow[]; error?: string }> {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (ctx.isStaff && !ctx.permissions.includes("warehouse") && !ctx.permissions.includes("sales")) {
    return { error: "لا تملك صلاحية عرض السجل" }
  }

  const { data, error } = await supabase.rpc("get_merchant_activity", { p_merchant: ctx.merchantId, p_limit: limit })
  if (error) return { error: error.message }

  return { rows: (data as MerchantActivityRow[]) || [] }
}
