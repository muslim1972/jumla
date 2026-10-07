"use server"

import { createClient } from "@/utils/supabase/server"
import { getActorContext, hasPermission } from "@/features/staff/lib/guard"

export interface OrderAvailabilityRow {
  order_item_id: string
  product_id: string | null
  ordered: number
  available: number       // بوحدة الطلب نفسها
  sufficient: boolean
}

/**
 * رصيد المخزن الافتراضي لكل عنصر في أمر بيع — يُعرض للتاجر/موظفه داخل
 * بطاقة الطلب قبل الموافقة، كي يعرف ما يمكن تجهيزه فعلاً قبل إرساله للمخزن.
 */
export async function getWarehouseAvailability(orderId: string): Promise<{ rows?: OrderAvailabilityRow[]; error?: string }> {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (ctx.isStaff && !hasPermission(ctx, "sales") && !hasPermission(ctx, "warehouse") && !hasPermission(ctx, "picking")) {
    return { error: "لا تملك صلاحية عرض الطلبات" }
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, merchant_id")
    .eq("id", orderId)
    .single()
  if (!order || order.merchant_id !== ctx.merchantId) return { error: "الطلب غير موجود" }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_id, quantity, unit_type")
    .eq("order_id", orderId)
  if (!items || items.length === 0) return { rows: [] }

  const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))] as string[]

  const [productsRes, itemsRes] = await Promise.all([
    productIds.length > 0
      ? supabase.from("products").select("id, units").in("id", productIds)
      : Promise.resolve({ data: [] as never[] }),
    productIds.length > 0
      ? supabase
          .from("warehouse_items")
          .select("product_id, quantity, warehouses!inner(is_default)")
          .in("product_id", productIds)
          .eq("merchant_id", ctx.merchantId)
          .eq("warehouses.is_default", true)
      : Promise.resolve({ data: [] as never[] }),
  ])

  const unitsMap = new Map<string, { type: string; multiplier_to_base?: number }[]>()
  for (const p of (productsRes.data ?? []) as Array<{ id: string; units: { type: string; multiplier_to_base?: number }[] | null }>) {
    unitsMap.set(p.id, p.units || [])
  }
  const stockMap = new Map<string, number>()
  for (const wi of (itemsRes.data ?? []) as Array<{ product_id: string; quantity: number }>) {
    stockMap.set(wi.product_id, (stockMap.get(wi.product_id) ?? 0) + wi.quantity)
  }

  const rows: OrderAvailabilityRow[] = items.map(it => {
    const unit = (it.product_id ? unitsMap.get(it.product_id) : null)?.find(u => u.type === it.unit_type)
    const multiplier = unit?.multiplier_to_base ?? 1
    const baseQty = it.product_id ? stockMap.get(it.product_id) ?? 0 : 0
    const available = multiplier > 0 ? Math.floor(baseQty / multiplier) : baseQty
    return {
      order_item_id: it.id,
      product_id: it.product_id,
      ordered: it.quantity,
      available,
      sufficient: available >= it.quantity,
    }
  })

  return { rows }
}
