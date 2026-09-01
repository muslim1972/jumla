"use server"

import { createClient } from "@/utils/supabase/server"

/**
 * تحديد كل الإشعارات الخاصة بالمستخدم كمقروءة
 */
export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "يجب تسجيل الدخول" }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Mark notifications read error:", error)
    return { error: error.message }
  }
}
