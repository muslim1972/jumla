/**
 * توليد كود تحقق مكون من 7 أرقام عشوائية
 * يُستخدم لتأكيد استلام الطلب من عامل التوصيل
 */
export function generateVerificationCode(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString()
}
