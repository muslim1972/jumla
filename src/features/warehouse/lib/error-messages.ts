/** رسائل أخطاء إجراءات المخزن — تُخفي تفاصيل قاعدة البيانات عن واجهة المستخدم. */
export function warehouseCatalogInsertErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code === "23505" || /master_products_barcode_unique|duplicate key/i.test(error.message ?? "")) {
    return "هذا الباركود مسجّل لمادة أخرى. اترك حقل الباركود فارغاً أو أدخل باركوداً مختلفاً ثم أعد المحاولة."
  }
  if (error.code === "23514" || /master_products_barcode_format/i.test(error.message ?? "")) {
    return "صيغة الباركود غير مقبولة. استخدم 8 أو 12 أو 13 أو 14 رقماً، أو اتركه فارغاً."
  }
  return "تعذّرت إضافة المادة إلى الكتالوج المركزي. راجع البيانات وحاول مرة أخرى."
}
