"use server"

import { createClient } from "@/utils/supabase/server"

// 1. جلب الطلبات الفعالة للمشتري
export async function getBuyerActiveOrders() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "يجب تسجيل الدخول" }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, store_name, total_rounded, status, cancel_requested, created_at, invoice_number, merchant_id, profiles:merchant_id(full_name, store_name)")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { orders }
}

// 2. حذف طلب قيد الانتظار نهائياً (من قبل المشتري)
export async function deletePendingOrder(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "يجب تسجيل الدخول" }

  // التحقق من حالة الطلب وحذفه إذا كان قيد الانتظار فقط
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status, user_id")
    .eq("id", orderId)
    .single()

  if (fetchError || !order) return { error: "الطلب غير موجود" }
  if (order.user_id !== user.id) return { error: "غير مصرح لك بحذف هذا الطلب" }
  if (order.status !== "pending") return { error: "لا يمكن حذف هذا الطلب مباشرة لأنه لم يعد قيد الانتظار" }

  // الحذف من قاعدة البيانات
  const { error: deleteError } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  return { success: true }
}

// 3. تقديم طلب حذف لطلب تمت الموافقة عليه أو قيد التوصيل
export async function requestOrderDeletion(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "يجب تسجيل الدخول" }

  const { error } = await supabase
    .from("orders")
    .update({ cancel_requested: true })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .in("status", ["approved", "delivered"]) // السماح بطلب الحذف للطلبات الموافق عليها أو قيد التوصيل بناء على طلب المستخدم الأخير

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
