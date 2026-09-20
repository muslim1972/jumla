"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * إضافة أو تحديث تقييم مستخدم بعد إتمام طلب
 * يدعم التعديل: إذا كان التقييم موجوداً يُحدّث (UPSERT)
 */
export async function upsertRating(data: {
  orderId: string
  ratedId: string
  ratedRole: string
  rating: number
  comment?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "يجب تسجيل الدخول" }

  // التحقق من صحة التقييم
  if (data.rating < 1 || data.rating > 5) {
    return { error: "التقييم يجب أن يكون بين 1 و 5" }
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

  const raterRole = raterProfile?.role || 'guest'

  // التحقق من أن الطلب موجود وأن المُقيِّم مرتبط به
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, merchant_id, delivery_worker_id, status')
    .eq('id', data.orderId)
    .single()

  if (!order) return { error: "الطلب غير موجود" }

  // تأكد أن المُقيِّم طرف في الطلب
  const isParty = [order.user_id, order.merchant_id, order.delivery_worker_id].includes(user.id)
  if (!isParty) return { error: "لا يمكنك تقييم هذا الطلب" }

  // تأكد أن المُقيَّم طرف في الطلب
  const ratedIsParty = [order.user_id, order.merchant_id, order.delivery_worker_id].includes(data.ratedId)
  if (!ratedIsParty) return { error: "المُقيَّم ليس طرفاً في هذا الطلب" }

  // تأكد أن الطلب مكتمل أو مُسلَّم
  if (!['delivered', 'completed'].includes(order.status)) {
    return { error: "لا يمكن التقييم إلا بعد إتمام التوصيل" }
  }

  try {
    // فحص وجود تقييم سابق
    const { data: existing } = await supabase
      .from('user_ratings')
      .select('id')
      .eq('order_id', data.orderId)
      .eq('rater_id', user.id)
      .eq('rated_id', data.ratedId)
      .maybeSingle()

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
          order_id: data.orderId,
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
