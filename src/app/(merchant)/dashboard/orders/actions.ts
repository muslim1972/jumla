"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// 1. جلب الطلبات الواردة (pending) و (approved) و (delivered) للتاجر
export async function getMerchantOrders() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      store_name,
      address,
      phone,
      total_rounded,
      subtotal,
      delivery_fee,
      invoice_number,
      verification_code,
      status,
      created_at,
      delivery_worker_name,
      items:order_items(
        id,
        product_name,
        product_price,
        quantity,
        unit_type
      )
    `)
    .eq("merchant_id", user.id)
    .in("status", ["pending", "approved", "delivered"])
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { orders }
}

// 2. الموافقة على الطلب وتجهيزه
export async function approveOrder(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "approved" })
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .eq("status", "pending") // للتأكد من أنه قيد الانتظار فقط

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard/orders")
  return { success: true }
}

// 3. رفض الطلب
export async function rejectOrder(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "rejected" })
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .eq("status", "pending") // للتأكد من أنه قيد الانتظار فقط

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard/orders")
  return { success: true }
}

// 4. استلام المبلغ للطلب المُسلّم وإكماله
export async function receiveOrderAmount(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "completed" })
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .eq("status", "delivered")
    .select()

  if (error) {
    console.error("Update error:", error)
    return { error: error.message }
  }

  if (!data || data.length === 0) {
    // حاول معرفة ما إذا كان الطلب موجوداً أصلاً لتشخيص سبب الفشل (RLS أو Enum)
    const { data: existing } = await supabase.from("orders").select("id, status, merchant_id").eq("id", orderId).single()
    if (!existing) return { error: "الطلب غير موجود في قاعدة البيانات." }
    if (existing.merchant_id !== user.id) return { error: "ليس لديك صلاحية على هذا الطلب." }
    if (existing.status !== "delivered") return { error: `حالة الطلب الحالية هي ${existing.status} وليست delivered.` }
    
    return { error: "فشل التحديث. الرجاء التأكد من أن حقل status في قاعدة البيانات (Supabase) يقبل القيمة 'completed' (ربما يحتاج لتعديل Enum)." }
  }

  revalidatePath("/dashboard/orders")
  return { success: true }
}
