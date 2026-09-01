"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function addPoints(userId: string, pointsToAdd: number, reason: string, type: string = 'points') {
  const supabase = await createClient()

  // عملية ذرّية داخل قاعدة البيانات (تحديث النقاط + tier + السجل في معاملة واحدة)
  const { data, error: rpcError } = await supabase.rpc('add_reward_points', {
    p_user_id: userId,
    p_points: pointsToAdd,
    p_reason: reason,
    p_type: type
  })

  if (rpcError) {
    if (rpcError.message.includes('NOT_AUTHORIZED')) return { error: "غير مصرح لمنح النقاط" }
    if (rpcError.message.includes('USER_NOT_FOUND')) return { error: "المستخدم غير موجود" }
    console.error("Failed to add reward points:", rpcError)
    return { error: "حدث خطأ أثناء إضافة النقاط" }
  }

  return { success: true, newTier: data?.newTier, newPoints: data?.newPoints }
}

export async function getUserRewards() {
  const supabase = await createClient()

  const { data: userResponse } = await supabase.auth.getUser()
  if (!userResponse?.user) return { error: "Unauthorized" }

  const userId = userResponse.user.id

  const [profileResult, historyResult] = await Promise.all([
    supabase.from('profiles').select('points, lifetime_points, tier, role').eq('id', userId).single(),
    supabase.from('rewards_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
  ])

  if (profileResult.error) return { error: profileResult.error.message }

  return {
    profile: profileResult.data,
    history: historyResult.data || []
  }
}
