"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// 1. جلب قائمة التجار الذين لديهم طلبات جاهزة للتوصيل
export async function getDeliveryMerchants(searchQuery?: string) {
  const supabase = await createClient()

  const { data: userResponse, error: authError } = await supabase.auth.getUser()
  if (authError || !userResponse?.user) {
    return { error: "يجب تسجيل الدخول كعامل توصيل" }
  }

  // في النظام المثالي يمكن استخدام RPC لجلب التجار الفريدين الذين لديهم طلبات معلقة
  // سنقوم بجلب قائمة التجار من profiles ثم فحص الطلبات، أو جلب الطلبات المعلقة واستخراج التجار
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("merchant_id")
    .eq("status", "approved")

  if (ordersError) {
    return { error: ordersError.message }
  }

  if (!orders || orders.length === 0) {
    return { merchants: [] }
  }

  // جلب التجار المخصصين لهذا المندوب (من user_metadata لتجنب مشاكل Trigger، ومن profile كاحتياط)
  const { data: profile } = await supabase.from('profiles').select('assigned_merchants').eq('id', userResponse.user.id).single()
  const metaMerchants = userResponse.user.user_metadata?.assigned_merchants || []
  const profileMerchants = profile?.assigned_merchants || []
  
  // دمج الايديات من المصدرين
  const assignedMerchants = [...new Set([...metaMerchants, ...profileMerchants])]

  // استخراج الايديات الفريدة للتجار
  let merchantIds = [...new Set(orders.map((o: any) => o.merchant_id))]

  if (assignedMerchants.length > 0) {
    merchantIds = merchantIds.filter(id => assignedMerchants.includes(id))
  }

  if (merchantIds.length === 0) {
    return { merchants: [] }
  }

  let query = supabase
    .from("profiles")
    .select("*")
    .in("id", merchantIds)

  if (searchQuery) {
    query = query.ilike("full_name", `%${searchQuery}%`)
  }

  const { data: merchants, error: merchantsError } = await query

  if (merchantsError) {
    return { error: merchantsError.message }
  }

  return { merchants }
}

// 2. جلب القوائم (الطلبات) الخاصة بتاجر معين والتي تنتظر التوصيل
export async function getMerchantPendingOrders(merchantId: string) {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      store_name,
      address,
      phone,
      total_rounded,
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
    .eq("merchant_id", merchantId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { orders }
}

// 3. تأكيد الكود السري وتسليم الطلب
export async function confirmDelivery(orderId: string, secretCode: string) {
  const supabase = await createClient()

  const { data: userResponse, error: authError } = await supabase.auth.getUser()
  if (authError || !userResponse?.user) {
    return { error: "يجب تسجيل الدخول كعامل توصيل" }
  }

  const userId = userResponse.user.id

  // جلب معلومات عامل التوصيل لتخزين اسمه
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single()

  if (profile?.role !== "delivery" && profile?.role !== "admin") {
    return { error: "صلاحيات غير كافية لإتمام التوصيل" }
  }

  const deliveryName = profile.full_name || "عامل توصيل"

  // جلب الطلب للتحقق من الكود
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, verification_code, status")
    .eq("id", orderId)
    .single()

  if (orderError || !order) {
    return { error: "لم يتم العثور على الطلب" }
  }

  if (order.status !== "approved") {
    return { error: "هذا الطلب تم تسليمه مسبقاً أو أنه ملغي أو غير مجهز بعد" }
  }

  if (order.verification_code !== secretCode.trim()) {
    return { error: "الكود السري غير صحيح، يرجى التأكد من المشتري" }
  }

  // تحديث حالة الطلب
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      delivery_worker_id: userId,
      delivery_worker_name: deliveryName
    })
    .eq("id", orderId)

  if (updateError) {
    return { error: "حدث خطأ أثناء تحديث حالة الطلب: " + updateError.message }
  }

  // إعادة جلب المسارات لتحديث الواجهات
  revalidatePath("/")
  revalidatePath("/cart")

  return { success: true }
}

// 4. سجل التوصيل للعامل
export async function getDeliveryHistory(dateFilter?: string) {
  const supabase = await createClient()

  const { data: userResponse, error: authError } = await supabase.auth.getUser()
  if (authError || !userResponse?.user) {
    return { error: "يجب تسجيل الدخول كعامل توصيل" }
  }

  const userId = userResponse.user.id

  let query = supabase
    .from("orders")
    .select(`
      id,
      store_name,
      address,
      phone,
      total_rounded,
      status,
      delivered_at,
      items:order_items(
        id,
        product_name,
        product_price,
        quantity,
        unit_type
      )
    `)
    .eq("delivery_worker_id", userId)
    .eq("status", "delivered")
    .order("delivered_at", { ascending: false })

  if (dateFilter) {
    const startOfDay = new Date(`${dateFilter}T00:00:00.000Z`).toISOString()
    const endOfDay = new Date(`${dateFilter}T23:59:59.999Z`).toISOString()
    query = query.gte("delivered_at", startOfDay).lte("delivered_at", endOfDay)
  }

  const { data: orders, error } = await query

  if (error) {
    return { error: error.message }
  }

  return { orders }
}
