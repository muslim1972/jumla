"use server"

import { createClient } from "@/utils/supabase/server"
import { supabaseAdmin } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"
import { getActorContext } from "@/features/staff/lib/guard"
import { staffUsernameToEmail, isValidStaffUsername } from "@/utils/staff"
import type { StaffPermission } from "@/features/warehouse/lib/types"

// ============================================================================
// إدارة موظفي التاجر الداخليين — حسابات Supabase حقيقية بدور merchant_staff
// مرتبطة بالتاجر الأم، لا تدخل إلا صفحات التاجر وضمن صلاحياتها.
// ============================================================================

const MAX_STAFF = 10
const VALID_PERMISSIONS: StaffPermission[] = ["sales", "warehouse", "picking", "pricing"]

function sanitizePermissions(raw: unknown): StaffPermission[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(p => VALID_PERMISSIONS.includes(p as StaffPermission)))] as StaffPermission[]
}

/** قائمة موظفي التاجر */
export async function listStaff() {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, permissions, is_active, last_login_at, created_at")
    .eq("role", "merchant_staff")
    .eq("parent_merchant_id", ctx.merchantId)
    .order("created_at", { ascending: true })

  if (error) return { error: error.message }
  return { staff: (data || []).map(s => ({ ...s, permissions: (s.permissions as StaffPermission[]) || [] })) }
}

/** إنشاء موظف جديد: حساب مصادقة حقيقي + ملف مرتبط بالتاجر الأم */
export async function createStaff(
  fullName: string,
  username: string,
  password: string,
  permissions: StaffPermission[]
) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (ctx.isStaff) return { error: "إنشاء الموظفين لصاحب المتجر فقط" }
  if (!ctx.warehouseEnabled) return { error: "فعّل وحدة المخازن أولاً" }

  const cleanName = (fullName || "").trim()
  const cleanUsername = (username || "").trim().toLowerCase()
  if (cleanName.length < 3 || cleanName.length > 40) return { error: "اسم الموظف يجب أن يكون بين 3 و40 حرفاً" }
  if (!isValidStaffUsername(cleanUsername)) {
    return { error: "اسم المستخدم: 3–20 محرفاً لاتينياً/أرقاماً (نقطة، شرطة سفلية، شرطة مسموحة)" }
  }
  if (!password || password.length < 8) return { error: "كلمة المرور: 8 محارف على الأقل" }
  const perms = sanitizePermissions(permissions)
  if (perms.length === 0) return { error: "اختر صلاحية واحدة على الأقل" }

  // حد الموظفين
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "merchant_staff")
    .eq("parent_merchant_id", ctx.merchantId)
  if ((count || 0) >= MAX_STAFF) return { error: `الحد الأقصى ${MAX_STAFF} موظفين` }

  // منع تكرار اسم المستخدم (فريد عالمياً لدخول موحد)
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle()
  if (existing) return { error: "اسم المستخدم محجوز — اختر غيره" }

  // إنشاء مستخدم المصادقة بالبريد التقني الداخلي
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: staffUsernameToEmail(cleanUsername),
    password,
    email_confirm: true,
    user_metadata: { full_name: cleanName, role: "merchant_staff" },
  })
  if (authError || !authUser?.user) {
    const msg = authError?.message || ""
    if (msg.includes("already") || msg.includes("exists")) return { error: "اسم المستخدم محجوز — اختر غيره" }
    return { error: "تعذر إنشاء الحساب: " + msg }
  }

  // اكتب/حدّث ملف الموظف — upsert ليكون محصناً من أي سلوك لدالة handle_new_user
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: authUser.user.id,
        full_name: cleanName,
        role: "merchant_staff",
        parent_merchant_id: ctx.merchantId,
        username: cleanUsername,
        permissions: perms,
        is_active: true,
        approval_status: "approved",
      },
      { onConflict: "id" }
    )

  if (profileError) {
    // تراجع نظيف: احذف مستخدم المصادقة إن فشل إكمال الملف
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return { error: "تعذر إكمال ملف الموظف: " + profileError.message }
  }

  revalidatePath("/dashboard/warehouses")
  return { success: true, staff_id: authUser.user.id }
}

/** تحديث صلاحيات واسم موظف */
export async function updateStaff(staffId: string, fullName: string, permissions: StaffPermission[]) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (ctx.isStaff) return { error: "إدارة الموظفين لصاحب المتجر فقط" }

  const cleanName = (fullName || "").trim()
  if (cleanName.length < 3 || cleanName.length > 40) return { error: "الاسم بين 3 و40 حرفاً" }
  const perms = sanitizePermissions(permissions)
  if (perms.length === 0) return { error: "اختر صلاحية واحدة على الأقل" }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: cleanName, permissions: perms })
    .eq("id", staffId)
    .eq("role", "merchant_staff")
    .eq("parent_merchant_id", ctx.merchantId)

  if (error) return { error: error.message }
  revalidatePath("/dashboard/warehouses")
  return { success: true }
}

/** تعطيل/تفعيل موظف — التعطيل يمنعه فوراً ويُنهي جلساته */
export async function toggleStaffActive(staffId: string, active: boolean) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (ctx.isStaff) return { error: "إدارة الموظفين لصاحب المتجر فقط" }

  const { data: staff } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", staffId)
    .eq("role", "merchant_staff")
    .eq("parent_merchant_id", ctx.merchantId)
    .single()
  if (!staff) return { error: "الموظف غير موجود" }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", staffId)
  if (error) return { error: error.message }

  if (!active) {
    try { await supabaseAdmin.auth.admin.signOut(staffId) } catch { /* لا نُفشل العملية لفشل إنهاء الجلسات */ }
  }

  revalidatePath("/dashboard/warehouses")
  return { success: true }
}

/** إعادة تعيين كلمة مرور موظف (الكلمات مشفرة ولا تُقرأ لأحد) */
export async function resetStaffPassword(staffId: string, newPassword: string) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (ctx.isStaff) return { error: "إدارة الموظفين لصاحب المتجر فقط" }
  if (!newPassword || newPassword.length < 8) return { error: "كلمة المرور: 8 محارف على الأقل" }

  const { data: staff } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", staffId)
    .eq("role", "merchant_staff")
    .eq("parent_merchant_id", ctx.merchantId)
    .single()
  if (!staff) return { error: "الموظف غير موجود" }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(staffId, { password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}
