"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function addPoints(userId: string, pointsToAdd: number, reason: string, type: string = 'points') {
  const supabase = await createClient()

  // 1. Get current points
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('points, lifetime_points, role')
    .eq('id', userId)
    .single()

  if (profileError || !profile) return { error: "Failed to fetch profile" }

  const newPoints = (profile.points || 0) + pointsToAdd
  const newLifetime = (profile.lifetime_points || 0) + (pointsToAdd > 0 ? pointsToAdd : 0)

  // 2. Calculate tier (simple logic)
  let newTier = 'bronze'
  if (newLifetime >= 10000) newTier = 'platinum'
  else if (newLifetime >= 5000) newTier = 'gold'
  else if (newLifetime >= 1000) newTier = 'silver'

  // 3. Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      points: newPoints, 
      lifetime_points: newLifetime,
      tier: newTier
    })
    .eq('id', userId)

  if (updateError) return { error: updateError.message }

  // 4. Record history
  const { error: historyError } = await supabase
    .from('rewards_history')
    .insert({
      user_id: userId,
      points_change: pointsToAdd,
      reason,
      type
    })

  if (historyError) {
    console.error("Failed to add reward history:", historyError)
  }

  return { success: true, newTier, newPoints }
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
