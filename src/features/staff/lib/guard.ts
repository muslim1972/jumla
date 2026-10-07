import "server-only"
import { cache } from "react"
import { createClient } from "@/utils/supabase/server"
import type { StaffPermission } from "@/features/warehouse/lib/types"

/**
 * سياق الفاعل — نقطة التحقق الموحدة لصفحات وميزات التاجر:
 * التاجر نفسه يعمل باسمه، وموظفه الداخلي يعمل باسم التاجر الأم وضمن صلاحياته.
 */
export interface ActorContext {
  userId: string
  role: "merchant" | "merchant_staff"
  /** المعرّف الفعّال للتاجر الذي تتم إدارة بياناته (للموظف: صاحب العمل الأم) */
  merchantId: string
  fullName: string | null
  /** صلاحيات الموظف — التاجر يمتلك الكل */
  permissions: StaffPermission[]
  isStaff: boolean
  warehouseEnabled: boolean
}

/** ترتيب الصفحة الرئيسية المناسبة للموظف حسب صلاحياته */
export function resolveStaffHome(permissions: StaffPermission[]): string {
  if (permissions.includes("warehouse") || permissions.includes("picking")) return "/dashboard/warehouses"
  if (permissions.includes("sales")) return "/dashboard/orders"
  return "/no-permission"
}

export const getActorContext = cache(async (): Promise<ActorContext | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, parent_merchant_id, permissions, is_active, warehouse_enabled")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  if (profile.role === "merchant") {
    return {
      userId: user.id,
      role: "merchant",
      merchantId: user.id,
      fullName: profile.full_name || null,
      permissions: ["sales", "warehouse", "picking", "pricing"],
      isStaff: false,
      warehouseEnabled: !!profile.warehouse_enabled,
    }
  }

  if (profile.role === "merchant_staff") {
    // الموظف المعطّل أو غير المرتبط بتاجر: لا سياق له
    if (!profile.is_active || !profile.parent_merchant_id) return null
    const { data: parent } = await supabase
      .from("profiles")
      .select("warehouse_enabled")
      .eq("id", profile.parent_merchant_id)
      .single()
    return {
      userId: user.id,
      role: "merchant_staff",
      merchantId: profile.parent_merchant_id,
      fullName: profile.full_name || null,
      permissions: (profile.permissions as StaffPermission[]) || [],
      isStaff: true,
      warehouseEnabled: !!parent?.warehouse_enabled,
    }
  }

  return null
})

/** هل يملك الفاعل الصلاحية المطلوبة؟ (التاجر يمتلك الكل دائماً) */
export function hasPermission(ctx: ActorContext, permission: StaffPermission): boolean {
  return ctx.permissions.includes(permission)
}
