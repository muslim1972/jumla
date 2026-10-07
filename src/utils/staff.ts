// أدوات هوية الموظف الداخلي — عامة (تصلح للعميل والخادم)

export const STAFF_EMAIL_DOMAIN = "staff.jumla.app"

/** اسم المستخدم الداخلي → البريد التقني الداخلي للمصادقة (غير مرئي للموظف) */
export function staffUsernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`
}

export function isStaffEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith("@" + STAFF_EMAIL_DOMAIN)
}

/** تحقق شكل اسم المستخدم: حروف لاتينية/أرقام/نقطة/شرطة سفلية/شرطة، 3–20 */
export function isValidStaffUsername(username: string): boolean {
  return /^[a-zA-Z0-9._-]{3,20}$/.test((username || "").trim())
}

/** توليد كلمة مرور قوية قابلة للقراءة (12 محرفاً) */
export function generateStaffPassword(): string {
  const lower = "abcdefghjkmnpqrstuvwxyz"
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ"
  const digits = "23456789"
  const symbols = "!@#$%&*"
  const all = lower + upper + digits + symbols
  let out = ""
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]
  out += pick(lower) + pick(upper) + pick(digits) + pick(symbols)
  for (let i = 0; i < 8; i++) out += pick(all)
  return out
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}
