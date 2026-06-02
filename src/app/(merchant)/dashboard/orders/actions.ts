"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// 1. جلب الطلبات الواردة (pending) و (approved) للتاجر
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
      items:order_items(
        id,
        product_name,
        product_price,
        quantity,
        unit_type
      )
    `)
    .eq("merchant_id", user.id)
    .in("status", ["pending", "approved"])
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
