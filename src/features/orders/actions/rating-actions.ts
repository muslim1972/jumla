"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * إضافة أو تحديث تقييم مستخدم بعد إتمام طلب أو تقييم المتجر مباشرة
 * يدعم التعديل: إذا كان التقييم موجوداً يُحدّث (UPSERT)
 */
export async function upsertRating(data: {
  orderId?: string | null
  ratedId: string
  ratedRole: string
  rating: number
  comment?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "يجب تسجيل الدخول أولاً" }

  // التحقق من صحة التقييم
  if (data.rating < 1 || data.rating > 5) {
    return { error: "التقييم يجب أن يكون بين 1 و 5 نجوم" }
  }

  // لا يقيم نفسه
  if (user.id === data.ratedId) {
    return { error: "لا يمكنك تقييم نفسك" }
  }

  // جلب دور المُقيِّم من profiles
  const { data: raterProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const raterRole = raterProfile?.role || 'buyer'

  let finalOrderId = data.orderId || null

  // إذا تم تمرير orderId، تحقق من شروطه
  if (finalOrderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, merchant_id, delivery_worker_id, status')
      .eq('id', finalOrderId)
      .single()

    if (order) {
      const isParty = [order.user_id, order.merchant_id, order.delivery_worker_id].includes(user.id)
      if (!isParty) return { error: "لا يمكنك تقييم هذا الطلب" }
    }
  } else {
    // محاولة ربط التقييم بأحدث طلب مكتمل إن وجد
    const { data: latestOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('merchant_id', data.ratedId)
      .in('status', ['delivered', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOrder) {
      finalOrderId = latestOrder.id
    }
  }

  try {
    // فحص وجود تقييم سابق
    let existingQuery = supabase
      .from('user_ratings')
      .select('id')
      .eq('rater_id', user.id)
      .eq('rated_id', data.ratedId)

    if (finalOrderId) {
      existingQuery = existingQuery.eq('order_id', finalOrderId)
    }

    const { data: existing } = await existingQuery.maybeSingle()

    if (existing) {
      // تحديث التقييم الموجود
      const { error } = await supabase
        .from('user_ratings')
        .update({
          rating: data.rating,
          comment: data.comment?.trim() || null,
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // إنشاء تقييم جديد
      const { error } = await supabase
        .from('user_ratings')
        .insert({
          order_id: finalOrderId,
          rater_id: user.id,
          rated_id: data.ratedId,
          rater_role: raterRole,
          rated_role: data.ratedRole,
          rating: data.rating,
          comment: data.comment?.trim() || null,
        })

      if (error) throw error
    }

    revalidatePath('/cart')
    revalidatePath(`/store/${data.ratedId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Upsert rating error:", error)
    return { error: error.message || "حدث خطأ في حفظ التقييم" }
  }
}

/**
 * جلب تقييمات طلب معين للمستخدم الحالي
 */
export async function getOrderRatings(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ratings: [] }

  const { data: ratings } = await supabase
    .from('user_ratings')
    .select('id, order_id, rater_id, rated_id, rater_role, rated_role, rating, comment, created_at')
    .eq('order_id', orderId)
    .eq('rater_id', user.id)

  return { ratings: ratings || [] }
}

/**
 * جلب تقييم المستخدم الحالي لتاجر معين إن وجد
 */
export async function getUserRatingForMerchant(merchantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { rating: null }

  const { data: rating } = await supabase
    .from('user_ratings')
    .select('id, rating, comment, created_at')
    .eq('rater_id', user.id)
    .eq('rated_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { rating: rating || null }
}
