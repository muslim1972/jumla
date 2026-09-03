"use server"

import { createClient } from "@/utils/supabase/server"
import { supabaseAdmin } from "@/utils/supabase/admin"
import { sendNotificationToUser } from "@/utils/onesignal"
import { addPoints } from "@/app/(app)/rewards/actions"
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

// 1.5 جلب عدد الطلبات الجاهزة للتوصيل للمندوب
export async function getDeliveryPendingCount() {
  const supabase = await createClient()

  const { data: userResponse, error: authError } = await supabase.auth.getUser()
  if (authError || !userResponse?.user) {
    return { count: 0 }
  }

  // جلب التجار المخصصين لهذا المندوب
  const { data: profile } = await supabase.from('profiles').select('assigned_merchants').eq('id', userResponse.user.id).single()
  const metaMerchants = userResponse.user.user_metadata?.assigned_merchants || []
  const profileMerchants = profile?.assigned_merchants || []
  
  const assignedMerchants = [...new Set([...metaMerchants, ...profileMerchants])]

  let query = supabase
    .from("orders")
    .select("*", { count: 'exact', head: true })
    .eq("status", "approved")

  if (assignedMerchants.length > 0) {
    query = query.in("merchant_id", assignedMerchants)
  }

  const { count, error } = await query

  if (error) {
    return { count: 0 }
  }

  return { count: count || 0 }
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
      is_credit,
      amount_paid,
      amount_received,
      latitude,
      longitude,
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

  // تحديد مشتريي الثقة لدى التاجر (يُسمح لهم بالدفع الجزئي عند التسليم)
  // trusted_buyers بلا سياسات RLS عمداً — يُصل إليها حصرياً عبر supabaseAdmin
  if (orders && orders.length > 0) {
    const { data: trusted } = await supabaseAdmin
      .from("trusted_buyers")
      .select("buyer_id")
      .eq("merchant_id", merchantId)

    const trustedSet = new Set((trusted || []).map((t: any) => t.buyer_id))
    orders.forEach((o: any) => {
      o.buyer_is_trusted = trustedSet.has(o.user_id)
    })
  }

  // Fetch coordinates for buyers
  if (orders && orders.length > 0) {
    const buyerIds = [...new Set(orders.map((o: any) => o.user_id).filter(Boolean))]
    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, address')
        .in('id', buyerIds)
        
      if (profiles) {
        const profileMap = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = p
          return acc
        }, {})
        
        orders.forEach((o: any) => {
          if (o.user_id && profileMap[o.user_id]) {
            o.profile_address = profileMap[o.user_id].address
          }
        })
      }
    }
  }

  return { orders }
}

// 3. تأكيد الكود السري وتسليم الطلب
// amountReceived: المبلغ المستلم فعلياً من المشتري (يُحتسب كاملاً إجبارياً لغير مشتريي الثقة)
export async function confirmDelivery(orderId: string, secretCode: string, amountReceived?: number) {
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
    .select("id, verification_code, status, merchant_id, user_id, invoice_number, is_credit, amount_paid, total_rounded")
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

  // المبلغ المطلوب تحصيله من المشتري
  const requiredAmount = order.amount_paid ?? order.total_rounded

  // التحقق الخادمي من قائمة الثقات — لا نثق بقيم العميل
  // trusted_buyers بلا سياسات RLS عمداً — يُصل إليها حصرياً عبر supabaseAdmin
  const { data: trustedRow } = await supabaseAdmin
    .from("trusted_buyers")
    .select("buyer_id")
    .eq("merchant_id", order.merchant_id)
    .eq("buyer_id", order.user_id)
    .maybeSingle()

  const isTrusted = !!trustedRow

  // مشتري الثقة يدفع جزئياً ما استلم المندوب؛ وغيره يجب أن يُستلم منه كامل المبلغ
  const finalReceived = isTrusted && typeof amountReceived === "number" && amountReceived >= 0
    ? Math.min(amountReceived, requiredAmount)
    : requiredAmount

  // تحديث حالة الطلب
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      delivery_worker_id: userId,
      delivery_worker_name: deliveryName,
      amount_received: finalReceived
    })
    .eq("id", orderId)

  if (updateError) {
    console.error("Delivery confirm update error:", updateError);
    if (updateError.message.includes('schema cache') || updateError.message.includes('delivered_at')) {
      return { error: "عذراً، يوجد نقص في إعدادات قاعدة البيانات (عمود delivered_at مفقود أو الكاش غير محدث). يرجى التواصل مع الإدارة الفنية." }
    }
    return { error: "حدث خطأ غير متوقع أثناء تحديث حالة الطلب. يرجى المحاولة مرة أخرى لاحقاً." }
  }

  // إرسال إشعارات و إعطاء نقاط
  try {
    // Vercel best practice: async-parallel
    await Promise.all([
      // 1. إشعار التاجر
      sendNotificationToUser(
        order.merchant_id,
        "تم التوصيل!",
        `القائمة رقم #${order.invoice_number} تم توصيلها للمشتري وهي بانتظار استلامك للمبلغ من المندوب.`
      ),
      // 2. إشعار المشتري
      sendNotificationToUser(
        order.user_id,
        "تم التوصيل بنجاح!",
        `تم تسليم طلبك رقم #${order.invoice_number} بنجاح. شكراً لتسوقك معنا!`
      ),
      // 3. نقاط للتاجر (نقطة عن كل طلب منجز)
      addPoints(
        order.merchant_id,
        10,
        `نقاط إنجاز طلب رقم #${order.invoice_number}`
      ),
      // 4. نقاط للمشتري (نقطة عن كل طلب مستلم)
      addPoints(
        order.user_id,
        50,
        `مكافأة استلام طلب رقم #${order.invoice_number}`
      )
    ])

    // كتابة الإشعارات في الجرس (التاجر والمشتري)
    const remaining = requiredAmount - finalReceived
    await supabaseAdmin.from("notifications").insert([
      {
        user_id: order.merchant_id,
        title: "تم التوصيل!",
        message: `القائمة رقم #${order.invoice_number} تم توصيلها للمشتري. المستلم: ${finalReceived.toLocaleString('en-US')} د.ع${remaining > 0 ? ` — الباقي: ${remaining.toLocaleString('en-US')} د.ع بانتظار التسديد.` : " — المبلغ كامل."}`,
      },
      {
        user_id: order.user_id,
        title: "تم التوصيل بنجاح!",
        message: `تم تسليم طلبك رقم #${order.invoice_number} بنجاح. شكراً لتسوقك معنا!`,
      }
    ])
  } catch (notifError) {
    console.error("Error sending delivery notifications or points:", notifError)
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
      user_id,
      store_name,
      address,
      phone,
      total_rounded,
      is_credit,
      amount_paid,
      amount_received,
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
    const buyerIds = [...new Set(orders.map((o: any) => o.user_id).filter(Boolean))]
    
    // Fetch both merchants and buyers in parallel (Vercel best practice: async-parallel)
    const [merchantsResult, profilesResult] = await Promise.all([
      merchantIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", merchantIds) : Promise.resolve({ data: null }),
      buyerIds.length > 0 ? supabase.from('profiles').select('id, address').in('id', buyerIds) : Promise.resolve({ data: null })
    ]);

    if (merchantsResult.data) {
      const merchantMap = merchantsResult.data.reduce((acc: any, m: any) => {
        acc[m.id] = m.full_name
        return acc
      }, {})
      orders.forEach((o: any) => {
        o.merchant_name = merchantMap[o.merchant_id] || "تاجر غير معروف"
      })
    }

    if (profilesResult.data) {
      const profileMap = profilesResult.data.reduce((acc: any, p: any) => {
        acc[p.id] = p
        return acc
      }, {})
      orders.forEach((o: any) => {
        if (o.user_id && profileMap[o.user_id]) {
          o.profile_address = profileMap[o.user_id].address
        }
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
      user_id,
      store_name,
      address,
      phone,
      total_rounded,
      is_credit,
      amount_paid,
      amount_received,
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
    const buyerIds = [...new Set(orders.map((o: any) => o.user_id).filter(Boolean))]
    
    // Fetch both merchants and buyers in parallel (Vercel best practice: async-parallel)
    const [merchantsResult, profilesResult] = await Promise.all([
      merchantIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", merchantIds) : Promise.resolve({ data: null }),
      buyerIds.length > 0 ? supabase.from('profiles').select('id, address').in('id', buyerIds) : Promise.resolve({ data: null })
    ]);

    if (merchantsResult.data) {
      const merchantMap = merchantsResult.data.reduce((acc: any, m: any) => {
        acc[m.id] = m.full_name
        return acc
      }, {})
      orders.forEach((o: any) => {
        o.merchant_name = merchantMap[o.merchant_id] || "تاجر غير معروف"
      })
    }

    if (profilesResult.data) {
      const profileMap = profilesResult.data.reduce((acc: any, p: any) => {
        acc[p.id] = p
        return acc
      }, {})
      orders.forEach((o: any) => {
        if (o.user_id && profileMap[o.user_id]) {
          o.profile_address = profileMap[o.user_id].address
        }
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
