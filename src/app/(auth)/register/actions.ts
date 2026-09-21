"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { normalizeIrqiPhone, phoneToEmail } from "@/utils/phone"

export async function signUp(formData: FormData) {
  const phone = formData.get("phone") as string
  const password = formData.get("password") as string
  const full_name = formData.get("full_name") as string
  const role = formData.get("role") as string
  const latStr = formData.get("latitude") as string
  const lngStr = formData.get("longitude") as string

  const latitude = latStr ? parseFloat(latStr) : null
  const longitude = lngStr ? parseFloat(lngStr) : null

  // التسجيل برقم الهاتف: 11 رقماً تبدأ بـ07 (لا أكثر ولا أقل)
  const normalizedPhone = normalizeIrqiPhone(phone || "")
  const fakeEmail = phoneToEmail(phone || "")
  if (!normalizedPhone || !fakeEmail) {
    return redirect("/register?message=" + encodeURIComponent("رقم الهاتف غير صالح: يجب إدخال 11 رقماً تبدأ بـ07"))
  }

  const supabase = await createClient()

  // داخلياً يُسجَّل الحساب بالبريد الزائف المشتق من الرقم، والرقم الحقيقي يُحفظ في البيانات الوصفية
  // لينقله Trigger قاعدة البيانات إلى profiles.phone
  const { error } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
    options: {
      data: {
        full_name,
        role,
        latitude,
        longitude,
        phone: normalizedPhone
      },
    },
  })

  if (error) {
    if (error.message.includes("already registered") || error.message.includes("already exists")) {
      return redirect("/register?message=" + encodeURIComponent("هذا الرقم مسجل مسبقاً، جرّب تسجيل الدخول"))
    }
    return redirect("/register?message=" + encodeURIComponent("حدث خطأ أثناء إنشاء الحساب: " + error.message))
  }

  // إرسال إشعار فوري لجميع مدراء النظام بالطلب الجديد
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && supabaseServiceKey) {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js")
      const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey)
      
      const { data: admins } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const ROLE_NAMES: Record<string, string> = {
          guest: "مشتري / صاحب ماركت",
          merchant: "تاجر جملة",
          delivery: "مندوب توصيل",
          materials: "مسؤول مواد",
          support: "دعم فني",
        }
        const roleText = ROLE_NAMES[role] || role || "مستخدم جديد"
        const notifications = admins.map(adm => ({
          user_id: adm.id,
          title: "طلب تسجيل حساب جديد 🔔",
          message: `قام ${full_name || 'مستخدم جديد'} بالتسجيل كـ (${roleText}) برقم (${normalizedPhone}) وهو بانتظار موافقتك لتفعيل الحساب.`,
        }))

        await adminClient.from('notifications').insert(notifications)
      }
    }
  } catch (notifErr) {
    console.error("Failed to notify admins of new registration:", notifErr)
  }

  const queryParams = new URLSearchParams({
    name: full_name || "",
    phone: normalizedPhone,
    role: role || "guest"
  })

  return redirect(`/awaiting-approval?${queryParams.toString()}`)
}
