"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function getMerchantsForRegistration() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, store_name")
    .eq("role", "merchant")
  
  return data || []
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const full_name = formData.get("full_name") as string
  const role = formData.get("role") as string
  const assigned_merchants_str = formData.get("assigned_merchants") as string
  const latStr = formData.get("latitude") as string
  const lngStr = formData.get("longitude") as string
  
  const assigned_merchants = assigned_merchants_str ? JSON.parse(assigned_merchants_str) : []
  const latitude = latStr ? parseFloat(latStr) : null
  const longitude = lngStr ? parseFloat(lngStr) : null

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role,
        assigned_merchants,
        latitude,
        longitude
      },
    },
  })

  if (error) {
    return redirect("/register?message=" + encodeURIComponent("حدث خطأ أثناء إنشاء الحساب: " + error.message))
  }

  return redirect("/login?message=" + encodeURIComponent("تم إنشاء الحساب بنجاح. يرجى تسجيل الدخول."))
}
