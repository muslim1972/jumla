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
