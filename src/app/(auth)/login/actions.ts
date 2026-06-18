"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    let errorMessage = "حدث خطأ أثناء تسجيل الدخول."
    if (error.message.includes("Invalid login credentials")) {
      errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    } else if (error.message.includes("Email not confirmed")) {
      errorMessage = "يرجى تأكيد البريد الإلكتروني أولاً"
    } else {
      errorMessage = error.message
    }
    return { error: errorMessage }
  }

  return redirect("/")
}

export async function checkUserRoleByEmail(email: string) {
  if (!email || !email.includes('@')) return null
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration in environment variables")
    return null
  }
  
  try {
    // إنشاء عميل باستخدام مفتاح الخدمة لتخطي قيود الـ RLS والوصول الآمن للمستخدمين
    const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // 1. جلب قائمة المستخدمين والبحث عن المستخدم بواسطة الإيميل
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      console.error("Error listing users in checkUserRoleByEmail:", listError.message)
      return null
    }
    
    const user = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())
    if (!user) {
      return null
    }
    
    // 2. جلب دور المستخدم من جدول profiles
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profileError) {
      console.error("Error fetching profile role in checkUserRoleByEmail:", profileError.message)
      return null
    }
    
    return profile?.role || null
  } catch (e) {
    console.error("Unexpected error in checkUserRoleByEmail:", e)
    return null
  }
}
