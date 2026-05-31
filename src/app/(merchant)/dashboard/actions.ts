"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateMerchantSettings(fee: number, phone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('profiles')
    .update({ delivery_fee: fee, support_phone: phone })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  return { success: true }
}
