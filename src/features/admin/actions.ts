"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateContactSettings(data: {
  whatsapp_number: string
  support_phone: string
  telegram_link: string
  facebook_link: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "غير مصرح لك بإجراء هذه العملية" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: "صلاحيات غير كافية" }
  }

  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        id: 1,
        whatsapp_number: data.whatsapp_number,
        support_phone: data.support_phone,
        telegram_link: data.telegram_link,
        facebook_link: data.facebook_link,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) throw error

    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true }
  } catch (error: any) {
    console.error("Update settings error:", error)
    return { error: error.message || "حدث خطأ غير متوقع" }
  }
}

import { sendNotificationToUser } from "@/utils/onesignal"

export async function sendBillingNotification(merchantId: string, amountDue: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "غير مصرح" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: "صلاحيات غير كافية" }
  }

  try {
    await sendNotificationToUser(
      merchantId,
      "فاتورة جديدة من التطبيق",
      `تم إصدار فاتورة تحاسب جديدة من تطبيق جُملتي بمبلغ ${amountDue.toLocaleString('en-US')} د.ع، يرجى مراجعتها وتسديدها.`
    )
    return { success: true }
  } catch (e) {
    console.error("Failed to send billing notification", e)
    return { error: "فشل إرسال الإشعار" }
  }
}

import { supabaseAdmin } from "@/utils/supabase/admin"

/**
 * تحديث دور المستخدم مع مزامنة auth.users.raw_user_meta_data
 * يحل مشكلة أن تغيير الدور من جدول profiles فقط لا يُحدِّث user_metadata
 * مما يمنع المناديب الجدد من إتمام التوصيل
 */
export async function updateUserRoleWithSync(targetUserId: string, newRole: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "غير مصرح" }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return { error: "صلاحيات غير كافية — الأدمن فقط يمكنه تغيير الأدوار" }
  }

  // الأدوار المسموح بها — حماية من ترقية غير مشروعة
  const ALLOWED_ROLES = ['guest', 'merchant', 'member', 'delivery', 'support', 'materials', 'call_center']
  if (!ALLOWED_ROLES.includes(newRole)) {
    return { error: "الدور المحدد غير مسموح به" }
  }

  try {
    // 1. تحديث profiles (المصدر الأساسي)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId)

    if (profileError) throw profileError

    // 2. مزامنة auth.users.raw_user_meta_data عبر supabaseAdmin (Service Role)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { user_metadata: { role: newRole } }
    )

    if (authError) {
      console.error("تحذير: فشلت مزامنة auth.users لكن profiles تم تحديثه:", authError)
      // لا نرجع خطأ لأن profiles تم تحديثه بنجاح والكود يقرأ منه أولاً
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (error: any) {
    console.error("Update role error:", error)
    return { error: error.message || "حدث خطأ في تحديث الدور" }
  }
}

/**
 * جلب تفاصيل مستخدم شاملة للأدمن
 * يشمل: معلومات الحساب + بريد/هاتف من auth.users + إحصاءات الطلبات + التقييمات
 */
export async function getAdminUserDetails(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "غير مصرح" }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return { error: "صلاحيات غير كافية" }
  }

  try {
    // جلب البيانات بالتوازي (async-parallel best practice)
    const [profileResult, authResult, ordersResult, ratingsResult] = await Promise.all([
      // 1. بيانات profiles
      supabase
        .from('profiles')
        .select('id, full_name, role, phone, store_name, address, delivery_fee, assigned_merchants, banned_until, created_at')
        .eq('id', targetUserId)
        .single(),

      // 2. بيانات المصادقة (بريد/هاتف/آخر تسجيل دخول)
      supabaseAdmin.auth.admin.getUserById(targetUserId),

      // 3. إحصاءات الطلبات
      supabase
        .from('orders')
        .select('id, status, total_rounded, is_credit, amount_paid, amount_received, created_at, delivered_at')
        .or(`user_id.eq.${targetUserId},merchant_id.eq.${targetUserId},delivery_worker_id.eq.${targetUserId}`)
        .order('created_at', { ascending: false })
        .limit(200),

      // 4. التقييمات (رأي الآخرين فيه + رأيه بالآخرين)
      supabase
        .from('user_ratings')
        .select('id, order_id, rater_id, rated_id, rater_role, rated_role, rating, comment, created_at')
        .or(`rater_id.eq.${targetUserId},rated_id.eq.${targetUserId}`)
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    const profile = profileResult.data
    const authUser = authResult.data?.user
    const orders = ordersResult.data || []
    const ratings = ratingsResult.data || []

    if (!profile) return { error: "لم يتم العثور على المستخدم" }

    // حساب الإحصاءات حسب الدور
    const role = profile.role || 'guest'
    let stats: Record<string, any> = {}

    if (role === 'guest' || role === 'buyer') {
      const buyerOrders = orders.filter((o: any) => o.user_id === targetUserId || true)
      stats = {
        totalOrders: buyerOrders.length,
        completedOrders: buyerOrders.filter((o: any) => ['delivered', 'completed'].includes(o.status)).length,
        totalSpent: buyerOrders.filter((o: any) => ['delivered', 'completed'].includes(o.status)).reduce((s: number, o: any) => s + (o.total_rounded || 0), 0),
        pendingOrders: buyerOrders.filter((o: any) => ['pending', 'approved'].includes(o.status)).length,
        lastOrderDate: buyerOrders[0]?.created_at || null,
      }
    } else if (role === 'merchant') {
      stats = {
        totalOrders: orders.length,
        completedOrders: orders.filter((o: any) => ['delivered', 'completed'].includes(o.status)).length,
        totalSales: orders.filter((o: any) => ['delivered', 'completed'].includes(o.status)).reduce((s: number, o: any) => s + (o.total_rounded || 0), 0),
        pendingOrders: orders.filter((o: any) => ['pending', 'approved'].includes(o.status)).length,
        lastOrderDate: orders[0]?.created_at || null,
      }
    } else if (role === 'delivery') {
      const deliveries = orders.filter((o: any) => ['delivered', 'completed'].includes(o.status))
      stats = {
        totalDeliveries: deliveries.length,
        totalCollected: deliveries.reduce((s: number, o: any) => s + (o.amount_received || o.total_rounded || 0), 0),
        lastDeliveryDate: deliveries[0]?.delivered_at || deliveries[0]?.created_at || null,
        assignedMerchants: profile.assigned_merchants?.length || 0,
      }
    }

    // تقييمات مُجمَّعة
    const ratingsReceived = ratings.filter((r: any) => r.rated_id === targetUserId)
    const ratingsGiven = ratings.filter((r: any) => r.rater_id === targetUserId)
    const avgRating = ratingsReceived.length > 0
      ? ratingsReceived.reduce((s: number, r: any) => s + r.rating, 0) / ratingsReceived.length
      : null

    return {
      profile,
      email: authUser?.email || null,
      phone: authUser?.phone || profile.phone || null,
      lastSignIn: authUser?.last_sign_in_at || null,
      stats,
      ratingsReceived,
      ratingsGiven,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      totalRatingsReceived: ratingsReceived.length,
    }
  } catch (error: any) {
    console.error("Get user details error:", error)
    return { error: error.message || "حدث خطأ في جلب التفاصيل" }
  }
}
