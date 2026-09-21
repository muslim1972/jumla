"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { isPhoneIdentity, phoneToEmail } from "@/utils/phone"

export async function signIn(formData: FormData) {
  const identity = ((formData.get("identity") as string) || "").trim()
  const password = formData.get("password") as string
  const supabase = await createClient()

  // الدخول برقم الهاتف (يُحوَّل داخلياً إلى البريد الزائف) أو بالبريد الإلكتروني للحسابات القديمة
  const email = isPhoneIdentity(identity) ? phoneToEmail(identity)! : identity

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    let errorMessage = "حدث خطأ أثناء تسجيل الدخول."
    if (error.message.includes("Invalid login credentials")) {
      errorMessage = "رقم الهاتف أو كلمة المرور غير صحيحة"
    } else if (error.message.includes("Email not confirmed")) {
      errorMessage = "يرجى تأكيد الحساب أولاً"
    } else {
      errorMessage = error.message
    }
    return { error: errorMessage }
  }

  // فحص الحظر والموافقة: منع دخول الحسابات المحظورة أو المعلقة فور نجاح التحقق من كلمة المرور
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("banned_until, approval_status")
      .eq("id", user.id)
      .single()

    // 1. فحص موافقة الإدارة (Approval)
    if (profile?.approval_status === 'pending') {
      await supabase.auth.signOut()
      return {
        error: "حسابك قيد المراجعة والتدقيق من قبل الإدارة ولم يتم تفعيله بعد ⏳. سيصلك إشعار فور تفعيله، أو يمكنك التواصل مع الدعم للتعجيل."
      }
    }

    if (profile?.approval_status === 'rejected') {
      await supabase.auth.signOut()
      return {
        error: "نعتذر، لم تتم الموافقة على تفعيل هذا الحساب من قبل الإدارة. يرجى التواصل مع الدعم الفني للاستفسار."
      }
    }

    // 2. فحص الحظر (Ban)
    const bannedUntil = profile?.banned_until as string | null | undefined
    // "infinity" حظر دائم — لا يفهمها Date في JS لذا نفحص السلسلة مباشرة
    const isPermanent = !!bannedUntil && (bannedUntil === "infinity" || bannedUntil.startsWith("9999"))
    const isBannedTemporarily = !!bannedUntil && !isPermanent && new Date(bannedUntil) > new Date()

    if (bannedUntil && (isPermanent || isBannedTemporarily)) {
      await supabase.auth.signOut()
      return {
        error: isPermanent
          ? "تم حظرك من التطبيق نهائياً. للاستفسار يرجى التواصل مع الدعم."
          : `تم حظرك من التطبيق حتى ${new Date(bannedUntil).toLocaleString("ar-IQ")}. للاستفسار يرجى التواصل مع الدعم.`,
      }
    }
  }

  return redirect("/")
}

export async function checkUserRole(identity: string) {
  const trimmed = (identity || "").trim()
  if (!trimmed) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration in environment variables")
    return null
  }

  try {
    // عميل بمفتاح الخدمة لتخطي قيود الـ RLS والوصول الآمن
    const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // هوية الهاتف: استعلام مباشر عن profiles بالرقم — بدل سحب جدول المستخدمين كاملاً بـ listUsers
    if (isPhoneIdentity(trimmed)) {
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('role, full_name')
        .eq('phone', trimmed)
        .maybeSingle()

      if (profileError) {
        console.error("Error fetching profile role in checkUserRole:", profileError.message)
        return null
      }

      return profile ? { role: profile.role, name: profile.full_name } : null
    }

    // الحسابات البريدية القديمة فقط: البحث في قائمة المستخدمين
    if (!trimmed.includes('@')) return null

    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      console.error("Error listing users in checkUserRole:", listError.message)
      return null
    }

    const user = usersData.users.find(u => u.email?.toLowerCase() === trimmed.toLowerCase())
    if (!user) {
      return null
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile role in checkUserRole:", profileError.message)
      return null
    }

    return profile ? { role: profile.role, name: profile.full_name } : null
  } catch (e) {
    console.error("Unexpected error in checkUserRole:", e)
    return null
  }
}
