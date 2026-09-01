export type StatusMessage = { type: 'error' | 'success', text: string }

// دالة مساعدة لترجمة أشهر رسائل الخطأ من Supabase إلى العربية
export function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("new password should be different")) return "يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.";
  if (msg.includes("password should be at least")) return "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.";
  if (msg.includes("error sending recovery email")) return "تعذر إرسال الإيميل. يرجى التأكد من إعدادات SMTP وأن (إيميل المُرسل) موثق في Resend.";
  if (msg.includes("rate limit")) return "تجاوزت الحد المسموح من المحاولات، يرجى المحاولة لاحقاً.";
  if (msg.includes("invalid login credentials")) return "بيانات الدخول غير صحيحة.";
  return errorMsg; // إرجاع النص الأصلي إذا لم تكن هناك ترجمة
}
