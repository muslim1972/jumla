// أدوات هوية رقم الهاتف — جسر بريدي داخلي:
// رقم الهاتف العراقي (11 رقماً تبدأ بـ07) يُحوَّل إلى بريد داخلي زائف تستخدمه Supabase للمصادقة
// بدل الاعتماد على البريد الإلكتروني في التسجيل والدخول
export const PHONE_FAKE_DOMAIN = "phone.jumla.app"

// هل المُدخل رقم هاتف بالصيغة المطلوبة بالضبط (11 رقماً تبدأ بـ07)؟
export function isPhoneIdentity(value: string): boolean {
  return /^07\d{9}$/.test((value || "").trim())
}

// تطبيع الرقم (يتقبل +964 / 00964 / 964 أو حذف الصفر) ويعيد 11 رقماً تبدأ بـ07 أو null إن كان غير صالح
export function normalizeIrqiPhone(raw: string): string | null {
  let d = (raw || "").replace(/\D/g, "")
  if (d.startsWith("00964")) d = "0" + d.slice(5)
  else if (d.startsWith("964") && d.length >= 12) d = "0" + d.slice(3)
  else if (d.length === 10 && d.startsWith("7")) d = "0" + d
  return /^07\d{9}$/.test(d) ? d : null
}

// تحويل رقم الهاتف إلى البريد الداخلي الزائف (9647XXXXXXXXX@phone.jumla.app) أو null إن كان غير صالح
export function phoneToEmail(raw: string): string | null {
  const normalized = normalizeIrqiPhone(raw)
  return normalized ? normalized.replace(/^0/, "964") + "@" + PHONE_FAKE_DOMAIN : null
}

// هل هذا بريد داخلي زائف ناتج عن رقم هاتف (لا صندوق بريدي حقيقي له)؟
export function isFakePhoneEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith("@" + PHONE_FAKE_DOMAIN)
}
