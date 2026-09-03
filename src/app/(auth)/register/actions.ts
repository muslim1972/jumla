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

  return redirect("/login?message=" + encodeURIComponent("تم إنشاء الحساب بنجاح. يرجى تسجيل الدخول."))
}
