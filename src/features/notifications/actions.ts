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

/**
 * جلب آخر الإشعارات مع عداد غير المقروءة (لجرس الإشعارات الموحد في كل الحسابات)
 */
export async function getNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { notifications: [], unreadCount: 0 }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error

    const notifications = data || []
    const unreadCount = notifications.filter(n => !n.is_read).length

    return { notifications, unreadCount }
  } catch (error: any) {
    console.error("Get notifications error:", error)
    return { notifications: [], unreadCount: 0 }
  }
}
