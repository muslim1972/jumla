"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateDeliveryFee(fee: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('profiles')
    .update({ delivery_fee: fee })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  return { success: true }
}
