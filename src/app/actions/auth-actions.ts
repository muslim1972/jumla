"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/utils/supabase/server"

export async function deleteUserAccount(userId: string) {
  // حماية صارمة: هذا الإجراء يقوم بحذف حساب كامل بمفتاح service role
  // لذلك يجب التحقق من دور الأدمن من قاعدة البيانات (المصدر الموثوق) قبل أي شيء
  const supabase = await createServerClient()
  const { data: { user: actor } } = await supabase.auth.getUser()

  if (!actor) {
    return { error: "يجب تسجيل الدخول" }
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .single()

  if (actorProfile?.role !== "admin") {
    return { error: "غير مصرح: هذه العملية متاحة للأدمن فقط" }
  }

  // We MUST use the service role key to delete a user
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    return { error: "Missing Supabase configuration" }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    console.log("Attempting to delete user with ID:", userId)

    // مهم: كل عمليات التنظيف هنا تمر عبر supabaseAdmin (service role)
    // لأن RLS مفعّل الآن على كل الجداول — جلسة الأدمن لا تملك صلاحية حذف بيانات المستخدمين الآخرين
    // 1. First, set changed_by to NULL for ALL audit logs where this user is the actor,
    //    to avoid foreign key constraint violations when we delete the profile
    console.log("Preparing audit logs for deletion...")
    await supabaseAdmin.from("audit_logs").update({ changed_by: null }).eq("changed_by", userId)

    // 2. Now delete all remaining audit logs for this user
    console.log("Deleting audit logs for user...")
    await supabaseAdmin.from("audit_logs").delete().eq("changed_by", userId)

    // 3. Delete notifications and cart items
    console.log("Deleting notifications and cart items...")
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId)
    await supabaseAdmin.from("cart_items").delete().eq("user_id", userId)

    // 4. Delete all orders related to this user (as buyer or merchant)
    console.log("Deleting orders for user...")
    const { error: deleteOrdersError } = await supabaseAdmin
      .from("orders")
      .delete()
      .or(`user_id.eq.${userId},merchant_id.eq.${userId}`)
    
    if (deleteOrdersError) {
      console.error("Error deleting orders:", deleteOrdersError)
      return { error: "خطأ في حذف طلبات المستخدم: " + deleteOrdersError.message }
    }

    // 5. Finally delete the profile (now audit logs won't cause issues)
    console.log("Deleting profile for user...")
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId)
    
    if (profileError) {
      console.error("Error deleting profile:", profileError)
      return { error: "خطأ في قاعدة البيانات عند حذف البروفايل: " + profileError.message }
    }

    console.log("Deleting user from Supabase Auth...")
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error("Error deleting user from Supabase Auth:", error)
      return { error: error.message }
    }

    console.log("User deleted successfully")
    return { success: true }
  } catch (e: any) {
    console.error("Unexpected error in deleteUserAccount:", e)
    return { error: e.message || "An unexpected error occurred" }
  }
}
