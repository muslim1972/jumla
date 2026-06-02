"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect("/login?message=" + encodeURIComponent(error.message))
  }

  return redirect("/")
}

export async function checkUserRoleByEmail(email: string) {
  if (!email || !email.includes('@')) return null
  
  const supabase = await createClient()
  
  // نستخدم الـ RPC function التي أنشأناها لجلب الـ role
  const { data, error } = await supabase.rpc('get_role_by_email', {
    user_email: email
  })

  if (error || !data) return null
  
  return data as string
}
