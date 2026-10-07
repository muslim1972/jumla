import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getActorContext, hasPermission, resolveStaffHome } from "@/features/staff/lib/guard"
import { WarehouseHub } from "@/features/warehouse/components/warehouse-hub"
import type {
  PoolMasterProduct,
  PickerStat,
  Warehouse,
  WarehouseItem,
  WarehouseMovement,
} from "@/features/warehouse/lib/types"
import type { StaffMember } from "@/features/warehouse/lib/types"

export const dynamic = "force-dynamic"

export default async function WarehousesPage() {
  const ctx = await getActorContext()
  if (!ctx) redirect("/login")
  // محصور بصاحب المتجر أو موظف بصلاحية العمل على المخازن
  if (ctx.role === "merchant_staff" && !hasPermission(ctx, "warehouse")) {
    redirect(resolveStaffHome(ctx.permissions))
  }

  const supabase = await createClient()

  // نقطة قطع إحصاء أداء العمال (آخر 30 يوماً)
  const monthCutoff = new Date()
  monthCutoff.setDate(monthCutoff.getDate() - 30)

  const [warehousesRes, merchantRes, staffRes, listsRes] = await Promise.all([
    supabase
      .from("warehouses")
      .select("*")
      .eq("merchant_id", ctx.merchantId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("store_name, full_name").eq("id", ctx.merchantId).single(),
    supabase
      .from("profiles")
      .select("id, full_name, username, permissions, is_active, last_login_at, created_at")
      .eq("role", "merchant_staff")
      .eq("parent_merchant_id", ctx.merchantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("picking_lists")
      .select("id, order_id, status, picker_name, issued_at, picked_at, orders(invoice_number, store_name)")
      .eq("merchant_id", ctx.merchantId)
      .in("status", ["issued", "picked"])
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const warehouses = (warehousesRes.data as Warehouse[]) || []
  const defaultWarehouseId = warehouses.find(w => w.is_default)?.id ?? warehouses[0]?.id ?? null

  // بنود المخازن + منتجاتها (استعلام واحد بلا حد — التاجر قد يدير آلاف المواد)
  const [itemsRes, poolRes, movementsRes, recentListsRes] = await Promise.all([
    defaultWarehouseId
      ? supabase
          .from("warehouse_items")
          .select(`id, warehouse_id, product_id, quantity, min_stock_alert, low_stock_notified_at, updated_at,
            product:products(id, name, image_url, units, unit_conversions, stock_unit, price, unit_type, master_product_id, categories(name))`)
          .eq("merchant_id", ctx.merchantId)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("master_products")
      .select("id, name, barcode, image_url, base_price, units, category_id, origin, categories(name)")
      .order("name", { ascending: true }),
    supabase
      .from("warehouse_movements")
      .select("id, merchant_id, warehouse_id, product_id, kind, quantity, balance_after, reference_type, reference_id, note, performed_by, created_at, product:products(name, unit_conversions), actor:profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("picking_lists")
      .select("id, order_id, status, picker_id, picker_name, issued_at, picked_at, picking_list_items(shortage_quantity)")
      .eq("merchant_id", ctx.merchantId)
      .not("picked_at", "is", null)
      .gte("picked_at", monthCutoff.toISOString())
      .limit(300),
  ])

  const items = ((itemsRes.data ?? []) as unknown) as Array<WarehouseItem & { product: Record<string, unknown> | null }>
  const normalizedItems: WarehouseItem[] = items.map(it => ({
    id: it.id,
    warehouse_id: it.warehouse_id,
    product_id: it.product_id,
    quantity: it.quantity,
    min_stock_alert: it.min_stock_alert,
    low_stock_notified_at: it.low_stock_notified_at,
    updated_at: it.updated_at,
    product: (it.product && Object.keys(it.product).length > 0 ? it.product : null) as WarehouseItem["product"],
  }))

  const movements = ((movementsRes.data ?? []) as unknown) as Array<{
    id: string; merchant_id: string; warehouse_id: string; product_id: string; kind: WarehouseMovement["kind"];
    quantity: number; balance_after: number; reference_type: string | null; reference_id: string | null;
    note: string | null; performed_by: string | null; created_at: string;
    actor: { full_name: string | null } | null
  }>
  const normalizedMovements: WarehouseMovement[] = movements.map(m => ({
    id: m.id,
    merchant_id: m.merchant_id,
    warehouse_id: m.warehouse_id,
    product_id: m.product_id,
    kind: m.kind,
    quantity: m.quantity,
    balance_after: m.balance_after,
    reference_type: m.reference_type,
    reference_id: m.reference_id,
    note: m.note,
    performed_by: m.performed_by,
    performed_by_name: m.actor?.full_name || null,
    created_at: m.created_at,
  }))

  const poolProducts: PoolMasterProduct[] = (((poolRes.data ?? []) as unknown) as Array<{
    id: string; name: string; barcode: string | null; image_url: string | null; base_price: number | null;
    units: { type: string; multiplier_to_base: number }[]; category_id: string | null; origin: string | null; categories: { name: string } | null
  }>).map(mp => ({
    id: mp.id,
    name: mp.name,
    barcode: mp.barcode,
    image_url: mp.image_url,
    base_price: mp.base_price,
    units: mp.units || [],
    category_name: mp.categories?.name ?? null,
    origin: (mp.origin as PoolMasterProduct["origin"]) ?? null,
  }))

  const staff: StaffMember[] = ((staffRes.data ?? []) as unknown) as StaffMember[]

  // إحصاء أداء عمال التجهيز (آخر 30 يوماً)
  const recentLists = ((recentListsRes.data ?? []) as unknown) as Array<{
    picker_id: string | null; picker_name: string | null; issued_at: string | null; picked_at: string | null;
    picking_list_items: { shortage_quantity: number }[]
  }>
  const pickerStats = computePickerStats(recentLists, staff)

  const activeLists = (((listsRes.data ?? []) as unknown) as Array<{
    id: string; order_id: string; status: string; picker_name: string | null;
    orders: { invoice_number: number | null; store_name: string | null } | null
  }>).map(l => ({
    id: l.id,
    order_id: l.order_id,
    status: l.status,
    picker_name: l.picker_name,
    invoice_number: l.orders?.invoice_number ?? null,
    store_name: l.orders?.store_name ?? null,
  }))

  return (
    <WarehouseHub
      merchantId={ctx.merchantId}
      actorName={ctx.fullName}
      actorRole={ctx.role}
      isStaff={ctx.isStaff}
      canPricing={hasPermission(ctx, "pricing")}
      canWarehouse={hasPermission(ctx, "warehouse")}
      warehouseEnabled={ctx.warehouseEnabled}
      storeName={merchantRes.data?.store_name || merchantRes.data?.full_name || "متجري"}
      warehouses={warehouses}
      items={normalizedItems}
      poolProducts={poolProducts}
      staff={staff}
      movements={normalizedMovements}
      activeLists={activeLists}
      pickerStats={pickerStats}
      canManageStaff={!ctx.isStaff}
    />
  )
}

function computePickerStats(
  lists: Array<{
    picker_id: string | null
    picker_name: string | null
    issued_at: string | null
    picked_at: string | null
    picking_list_items: { shortage_quantity: number }[]
  }>,
  staff: StaffMember[]
): PickerStat[] {
  const byId = new Map<string, PickerStat>()
  for (const s of staff) {
    byId.set(s.id, { staffId: s.id, pickedLists: 0, shortageItems: 0, avgPickMinutes: null })
  }
  const durations = new Map<string, number[]>()

  for (const l of lists) {
    if (!l.picker_id) continue
    let stat = byId.get(l.picker_id)
    if (!stat) {
      stat = { staffId: l.picker_id, pickedLists: 0, shortageItems: 0, avgPickMinutes: null }
      byId.set(l.picker_id, stat)
    }
    stat.pickedLists += 1
    stat.shortageItems += (l.picking_list_items || []).reduce((sum, it) => sum + (it.shortage_quantity || 0), 0)
    if (l.issued_at && l.picked_at) {
      const mins = (new Date(l.picked_at).getTime() - new Date(l.issued_at).getTime()) / 60000
      if (mins >= 0 && mins < 24 * 60) {
        const arr = durations.get(l.picker_id) || []
        arr.push(mins)
        durations.set(l.picker_id, arr)
      }
    }
  }

  for (const [id, arr] of durations) {
    const stat = byId.get(id)
    if (stat && arr.length > 0) {
      stat.avgPickMinutes = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
    }
  }

  return [...byId.values()].filter(s => s.pickedLists > 0)
}
