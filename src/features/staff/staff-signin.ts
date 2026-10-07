"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { staffUsernameToEmail, isValidStaffUsername } from "@/utils/staff"

/**
 * دخول الموظف الداخلي باسم المستخدم وكلمة المرور فقط —
 * لا بريد ولا هاتف: الاسم يُترجم داخلياً إلى بريد تقني محصور بدومين الموظفين.
 */
export async function staffSignIn(username: string, password: string) {
  const cleanUsername = (username || "").trim().toLowerCase()
  if (!isValidStaffUsername(cleanUsername) || !password) {
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: staffUsernameToEmail(cleanUsername),
    password,
  })

  if (error) {
    // رسالة موحدة — لا نكشف إن كان الاسم موجوداً أم لا (حماية من الاستطلاع)
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, banned_until, approval_status")
      .eq("id", user.id)
      .single()

    // الدخول محصور بحسابات الموظفين النشطة — أي حساب آخر يُخرَج فوراً
    if (profile?.role !== "merchant_staff") {
      await supabase.auth.signOut()
      return { error: "هذه بوابة الموظفين فقط" }
    }
    if (!profile.is_active) {
      await supabase.auth.signOut()
      return { error: "حسابك معطّل حالياً — راجع صاحب المتجر" }
    }
    if (profile.approval_status === "pending" || profile.approval_status === "rejected") {
      await supabase.auth.signOut()
      return { error: "حسابك غير مكتمل — راجع صاحب المتجر" }
    }

    const bannedUntil = profile.banned_until as string | null | undefined
    const isPermanent = !!bannedUntil && (bannedUntil === "infinity" || bannedUntil.startsWith("9999"))
    const isBanned = !!bannedUntil && (isPermanent || new Date(bannedUntil) > new Date())
    if (isBanned) {
      await supabase.auth.signOut()
      return { error: "تم حظر هذا الحساب — راجع صاحب المتجر" }
    }
  }

  redirect("/dashboard")
}

/** فحص وجود اسم المستخدم لعرض ترحيب حي في الواجهة (بدون كشف تفاصيل الحساب) */
export async function checkStaffUsername(username: string) {
  const clean = (username || "").trim().toLowerCase()
  if (!isValidStaffUsername(clean)) return null

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, parent_merchant_id, is_active")
    .eq("role", "merchant_staff")
    .eq("username", clean)
    .eq("is_active", true)
    .maybeSingle()

  if (!profile) return null

  const { data: parent } = await adminClient
    .from("profiles")
    .select("store_name, full_name")
    .eq("id", profile.parent_merchant_id)
    .single()

  return {
    name: profile.full_name,
    storeName: parent?.store_name || parent?.full_name || null,
  }
}
