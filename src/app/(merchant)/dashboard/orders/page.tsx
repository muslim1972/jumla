import { createClient } from "@/utils/supabase/server"
import { getMerchantOrders } from "./actions"
import { OrdersClient } from "./orders-client"
import { getActorContext, hasPermission, resolveStaffHome } from "@/features/staff/lib/guard"
import { redirect } from "next/navigation"
import type { StaffMember } from "@/features/warehouse/lib/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function MerchantOrdersPage() {
  const ctx = await getActorContext()
  if (!ctx) redirect("/login")
  if (ctx.role === "merchant_staff" && !hasPermission(ctx, "sales") && !hasPermission(ctx, "warehouse") && !hasPermission(ctx, "picking")) {
    redirect(resolveStaffHome(ctx.permissions))
  }

  const supabase = await createClient()
  const { data: staffRows } = await supabase
    .from("profiles")
    .select("id, full_name, username, permissions, is_active, last_login_at, created_at")
    .eq("role", "merchant_staff")
    .eq("parent_merchant_id", ctx.merchantId)
    .eq("is_active", true)

  const pickers: StaffMember[] = ((staffRows ?? []) as Array<{
    id: string; full_name: string | null; username: string | null; permissions: string[] | null; is_active: boolean; last_login_at: string | null; created_at: string
  }>)
    .filter(s => (s.permissions ?? []).includes("picking"))
    .map(s => ({
      id: s.id,
      full_name: s.full_name,
      username: s.username,
      permissions: (s.permissions ?? []) as StaffMember["permissions"],
      is_active: s.is_active,
      last_login_at: s.last_login_at,
      created_at: s.created_at,
    }))

  const result = await getMerchantOrders()

  if (result.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 text-red-600 p-4 rounded-xl font-bold border border-red-500/20">
          {result.error}
        </div>
      </div>
    )
  }

  return (
    <OrdersClient
      initialOrders={result.orders || []}
      merchantId={ctx.merchantId}
      currentUserId={ctx.userId}
      warehouseEnabled={ctx.warehouseEnabled}
      isStaff={ctx.isStaff}
      canManagePicking={!ctx.isStaff || hasPermission(ctx, "sales") || hasPermission(ctx, "warehouse")}
      canPick={!ctx.isStaff || hasPermission(ctx, "picking") || hasPermission(ctx, "warehouse")}
      canReceiveMoney={!ctx.isStaff}
      pickers={pickers}
    />
  )
}
