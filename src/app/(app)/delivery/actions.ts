"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// 1. جلب قائمة التجار التابعين لعامل التوصيل (أو التجار الذين لديهم طلبات جاهزة إن لم يكن مخصصاً له تجار)
export async function getDeliveryMerchants() {
  const supabase = await createClient()

  const { data: userResponse, error: authError } = await supabase.auth.getUser()
  if (authError || !userResponse?.user) {
    return { error: "يجب تسجيل الدخول كعامل توصيل" }
  }

  // جلب التجار المخصصين لهذا المندوب
  const { data: profile } = await supabase.from('profiles').select('assigned_merchants').eq('id', userResponse.user.id).single()
  const metaMerchants = userResponse.user.user_metadata?.assigned_merchants || []
  const profileMerchants = profile?.assigned_merchants || []
  
  // دمج الايديات من المصدرين
  const assignedMerchants = [...new Set([...metaMerchants, ...profileMerchants])]

  let merchantIds = assignedMerchants

  // إذا لم يكن هناك تجار مخصصين، اعرض التجار الذين لديهم طلبات جاهزة للتوصيل كبديل
  if (merchantIds.length === 0) {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("merchant_id")
      .eq("status", "approved")

    if (orders && orders.length > 0) {
      merchantIds = [...new Set(orders.map((o: any) => o.merchant_id))]
    }
  }

  if (merchantIds.length === 0) {
    return { merchants: [] }
  }

  const query = supabase
    .from("profiles")
    .select("*")
    .in("id", merchantIds)

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

  // جلب معلومات عامل التوصيل لتخزين اسمه (نقرأ الرتبة من metadata كاحتياط في حال فشل Trigger)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single()

  const userRole = userResponse.user.user_metadata?.role || profile?.role || "guest"

  if (userRole !== "delivery" && userRole !== "admin") {
    return { error: "صلاحيات غير كافية لإتمام التوصيل" }
  }

  const deliveryName = profile?.full_name || userResponse.user.user_metadata?.full_name || "عامل توصيل"

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

// 5. جلب قائمة كل التجار المتاحين في النظام (لاستخدامهم في إضافة تاجر للمندوب)
export async function getAllMerchants() {
  const supabase = await createClient()

  const { data: merchants, error } = await supabase
    .from("profiles")
    .select("id, full_name, store_name, address")
    .eq("role", "merchant")
    .order("full_name", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { merchants }
}

// 6. إضافة تاجر لقائمة تجار المندوب
export async function assignMerchantToDeliveryWorker(merchantId: string) {
  const supabase = await createClient()

  const { data: userResponse, error: authError } = await supabase.auth.getUser()
  if (authError || !userResponse?.user) {
    return { error: "يجب تسجيل الدخول كعامل توصيل" }
  }

  const userId = userResponse.user.id

  // جلب التجار الحاليين من profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("assigned_merchants")
    .eq("id", userId)
    .single()

  const currentAssigned = profile?.assigned_merchants || []

  // التأكد من عدم تكرار التاجر
  if (currentAssigned.includes(merchantId)) {
    return { error: "هذا التاجر مضاف مسبقاً إلى قائمتك" }
  }

  const newAssigned = [...currentAssigned, merchantId]

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ assigned_merchants: newAssigned })
    .eq("id", userId)

  if (updateError) {
    return { error: "حدث خطأ أثناء إضافة التاجر: " + updateError.message }
  }

  return { success: true }
}
