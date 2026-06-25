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
      invoice_number,
      merchant_id,
      user_id,
      verification_code,
      delivery_worker_name,
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

  // Fetch coordinates for buyers
  if (orders && orders.length > 0) {
    const buyerIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))]
    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, latitude, longitude')
        .in('id', buyerIds)
        
      if (profiles) {
        const profileMap = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = p
          return acc
        }, {})
        
        orders.forEach((o: any) => {
          if (o.user_id && profileMap[o.user_id]) {
            o.latitude = profileMap[o.user_id].latitude
            o.longitude = profileMap[o.user_id].longitude
          }
        })
      }
    }
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
    console.error("Delivery confirm update error:", updateError);
    if (updateError.message.includes('schema cache') || updateError.message.includes('delivered_at')) {
      return { error: "عذراً، يوجد نقص في إعدادات قاعدة البيانات (عمود delivered_at مفقود أو الكاش غير محدث). يرجى التواصل مع الإدارة الفنية." }
    }
    return { error: "حدث خطأ غير متوقع أثناء تحديث حالة الطلب. يرجى المحاولة مرة أخرى لاحقاً." }
  }

  // إعادة جلب المسارات لتحديث الواجهات
  revalidatePath("/")
  revalidatePath("/cart")

  return { success: true }
}

// 4. سجل التوصيل للعامل (الأرشيف - الطلبات المكتملة)
export async function getDeliveryHistory(startDate?: string, endDate?: string) {
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
      merchant_id,
      store_name,
      address,
      phone,
      total_rounded,
      status,
      delivered_at,
      delivery_worker_name,
      items:order_items(
        id,
        product_name,
        product_price,
        quantity,
        unit_type
      )
    `)
    .eq("delivery_worker_id", userId)
    .eq("status", "completed")
    .order("delivered_at", { ascending: false })

  if (startDate) {
    const startOfDay = new Date(`${startDate}T00:00:00.000Z`).toISOString()
    query = query.gte("delivered_at", startOfDay)
  }
  if (endDate) {
    const endOfDay = new Date(`${endDate}T23:59:59.999Z`).toISOString()
    query = query.lte("delivered_at", endOfDay)
  }

  const { data: orders, error } = await query

  if (error) {
    return { error: error.message }
  }

  // Fetch merchant names
  if (orders && orders.length > 0) {
    const merchantIds = [...new Set(orders.map((o: any) => o.merchant_id).filter(Boolean))]
    if (merchantIds.length > 0) {
      const { data: merchants } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", merchantIds)
      
      const merchantMap = merchants?.reduce((acc: any, m: any) => {
        acc[m.id] = m.full_name
        return acc
      }, {}) || {}

      orders.forEach((o: any) => {
        o.merchant_name = merchantMap[o.merchant_id] || "تاجر غير معروف"
      })
    }
  }

  return { orders }
}

// 4.5. طلبات التحاسب مع التاجر (الطلبات التي تم تسليمها للعميل ولم يتم تسديد مبلغها للتاجر)
export async function getDeliverySettlementOrders() {
  const supabase = await createClient()

  const { data: userResponse, error: authError } = await supabase.auth.getUser()
  if (authError || !userResponse?.user) {
    return { error: "يجب تسجيل الدخول كعامل توصيل" }
  }

  const userId = userResponse.user.id

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      merchant_id,
      store_name,
      address,
      phone,
      total_rounded,
      status,
      delivered_at,
      delivery_worker_name,
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

  if (error) {
    return { error: error.message }
  }

  // Fetch merchant names
  if (orders && orders.length > 0) {
    const merchantIds = [...new Set(orders.map((o: any) => o.merchant_id).filter(Boolean))]
    if (merchantIds.length > 0) {
      const { data: merchants } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", merchantIds)
      
      const merchantMap = merchants?.reduce((acc: any, m: any) => {
        acc[m.id] = m.full_name
        return acc
      }, {}) || {}

      orders.forEach((o: any) => {
        o.merchant_name = merchantMap[o.merchant_id] || "تاجر غير معروف"
      })
    }
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
