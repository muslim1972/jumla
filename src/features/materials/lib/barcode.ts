// التحقق من صحة تنسيق الباركود (GTIN: EAN-8 / UPC-A / EAN-13 / GTIN-14)
// الحقل اختياري — القيمة الفارغة تعتبر صالحة
export function validateBarcode(raw: string): string | null {
  const v = (raw || "").trim()
  if (!v) return null

  if (!/^\d+$/.test(v)) {
    return "الباركود يجب أن يحتوي أرقاماً فقط"
  }
  if (!/^[0-9]{8}([0-9]{4,6})?$/.test(v)) {
    return "طول الباركود يجب أن يكون 8 أو 12 أو 13 أو 14 رقماً"
  }

  // المجموع الاختباري GTIN: الأوزان من اليمين 1 ثم 3 بالتناوب
  let sum = 0
  for (let i = 0; i < v.length; i++) {
    const distanceFromRight = v.length - i
    const weight = distanceFromRight % 2 === 1 ? 1 : 3
    sum += Number(v[i]) * weight
  }
  if (sum % 10 !== 0) {
    return "رقم الباركود غير صحيح (فشل المجموع الاختباري)"
  }
  return null
}
