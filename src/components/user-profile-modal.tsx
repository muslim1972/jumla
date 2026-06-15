"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, KeyRound, Trash2, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { deleteUserAccount } from "@/app/actions/auth-actions"

interface UserProfileModalProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  userRole?: string | null
  fullName?: string | null
}

// دالة مساعدة لترجمة أشهر رسائل الخطأ من Supabase إلى العربية
function translateError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("new password should be different")) return "يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.";
  if (msg.includes("password should be at least")) return "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.";
  if (msg.includes("error sending recovery email")) return "تعذر إرسال الإيميل. يرجى التأكد من إعدادات SMTP وأن (إيميل المُرسل) موثق في Resend.";
  if (msg.includes("rate limit")) return "تجاوزت الحد المسموح من المحاولات، يرجى المحاولة لاحقاً.";
  if (msg.includes("invalid login credentials")) return "بيانات الدخول غير صحيحة.";
  return errorMsg; // إرجاع النص الأصلي إذا لم تكن هناك ترجمة
}

export function UserProfileModal({ isOpen, setIsOpen, userRole, fullName }: UserProfileModalProps) {
  const [newFullName, setNewFullName] = useState(fullName || "")
  
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // حيلة بسيطة لمنع المتصفح من حشر كلمة المرور (نجعل الحقل للقراءة فقط حتى ينقر عليه المستخدم)
  const [isOldPwdReadOnly, setIsOldPwdReadOnly] = useState(true)
  const [isNewPwdReadOnly, setIsNewPwdReadOnly] = useState(true)

  // رسائل الحالة
  const [nameMessage, setNameMessage] = useState<{type: 'error'|'success', text: string} | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{type: 'error'|'success', text: string} | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      // تفريغ الحقول عند فتح النافذة وإعادتها لوضع القراءة فقط
      setOldPassword("")
      setNewPassword("")
      setIsOldPwdReadOnly(true)
      setIsNewPwdReadOnly(true)
      setNameMessage(null)
      setPasswordMessage(null)

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserEmail(user.email || null)
      })
    }
  }, [isOpen])

  // مستمع الإغلاق عند تسجيل الخروج
  useEffect(() => {
    const handleLogout = () => setIsOpen(false)
    window.addEventListener('user-logout', handleLogout)
    return () => window.removeEventListener('user-logout', handleLogout)
  }, [setIsOpen])

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("هل أنت متأكد تماماً أنك تريد حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء!")
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await deleteUserAccount(user.id)
      
      if (result.error) {
        alert("حدث خطأ أثناء محاولة حذف الحساب: " + translateError(result.error))
      } else {
        alert("تم حذف حسابك بنجاح. نتمنى أن نراك مجدداً!")
        await supabase.auth.signOut()
        window.location.reload()
      }
    } catch (error) {
      console.error("Delete account error:", error)
      alert("حدث خطأ غير متوقع")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateName = async () => {
    if (!newFullName.trim() || newFullName.trim() === fullName) return
    setIsUpdatingName(true)
    setNameMessage(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: newFullName.trim() })
        .eq('id', user.id)

      if (!profileError) {
        await supabase.auth.updateUser({
          data: { full_name: newFullName.trim() }
        })
        setNameMessage({ type: 'success', text: 'تم تحديث الاسم بنجاح!' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setNameMessage({ type: 'error', text: translateError(profileError.message) || "حدث خطأ أثناء تحديث الاسم" })
      }
    } catch (error: any) {
      setNameMessage({ type: 'error', text: translateError(error.message) || "حدث خطأ غير متوقع" })
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword) return
    if (!userEmail) {
      setPasswordMessage({ type: 'error', text: "لم يتم العثور على بريد المستخدم." })
      return
    }

    setIsUpdatingPassword(true)
    setPasswordMessage(null)
    
    try {
      // التحقق من كلمة المرور القديمة أولاً
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword
      })

      if (signInError) {
        setPasswordMessage({ type: 'error', text: "كلمة المرور الحالية غير صحيحة." })
        setIsUpdatingPassword(false)
        return
      }

      // تحديث بكلمة المرور الجديدة
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setPasswordMessage({ type: 'error', text: translateError(updateError.message) || "حدث خطأ أثناء تغيير كلمة المرور." })
      } else {
        setPasswordMessage({ type: 'success', text: "تم تغيير كلمة المرور بنجاح!" })
        setOldPassword("")
        setNewPassword("")
        setIsOldPwdReadOnly(true)
        setIsNewPwdReadOnly(true)
      }
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: translateError(error.message) || "حدث خطأ غير متوقع." })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!userEmail) return
    setIsSendingReset(true)
    setPasswordMessage(null)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) {
        setPasswordMessage({ type: 'error', text: translateError(error.message) || "حدث خطأ أثناء إرسال الرابط." })
      } else {
        setPasswordMessage({ type: 'success', text: "تم إرسال رابط إعادة التعيين إلى بريدك بنجاح!" })
      }
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: translateError(error.message) || "حدث خطأ غير متوقع." })
    } finally {
      setIsSendingReset(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md w-[92%] sm:w-full rounded-2xl p-0 overflow-hidden border border-border shadow-premium" dir="rtl">
        {/* الهيدر مع زر الرجوع */}
        <div className="bg-muted/50 p-4 border-b flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-background rounded-full transition-colors active:scale-95"
          >
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <DialogTitle className="text-xl font-black text-brand-blue m-0">
            الصفحة الشخصية
          </DialogTitle>
          <DialogDescription className="sr-only">
            إدارة إعدادات حسابك الشخصي
          </DialogDescription>
        </div>

        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          
          {/* قسم تعديل الاسم */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand-orange font-bold">
              <User className="w-5 h-5" />
              <h3>تعديل اسم المستخدم</h3>
            </div>
            
            {nameMessage && (
              <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${nameMessage.type === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-green-500/10 text-green-600 border border-green-500/20'}`}>
                {nameMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {nameMessage.text}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="fullName" className="text-xs text-muted-foreground">الاسم الكامل</Label>
                <Input 
                  id="fullName" 
                  value={newFullName} 
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="bg-background"
                  placeholder="ادخل اسمك الجديد..."
                  autoComplete="off"
                />
              </div>
              <Button 
                onClick={handleUpdateName}
                disabled={isUpdatingName || !newFullName.trim() || newFullName.trim() === fullName}
                className="sm:mt-5 bg-brand-blue hover:bg-brand-blue/90 text-white min-w-[100px]"
              >
                {isUpdatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الاسم"}
              </Button>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          {/* قسم تغيير كلمة المرور */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-orange font-bold">
                <KeyRound className="w-5 h-5" />
                <h3>تغيير كلمة المرور</h3>
              </div>
              <Button 
                variant="link" 
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className="h-auto p-0 text-xs text-primary underline"
              >
                {isSendingReset ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : ""}
                نسيت كلمة المرور؟
              </Button>
            </div>

            {passwordMessage && (
              <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${passwordMessage.type === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-green-500/10 text-green-600 border border-green-500/20'}`}>
                {passwordMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <p>{passwordMessage.text}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="oldPassword" className="text-xs text-muted-foreground">كلمة المرور الحالية</Label>
                <Input 
                  id="oldPassword" 
                  name="old_pwd_no_fill"
                  type="password"
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)}
                  readOnly={isOldPwdReadOnly}
                  onFocus={() => setIsOldPwdReadOnly(false)}
                  className="bg-background"
                  placeholder="********"
                  autoComplete="new-password"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="newPassword" className="text-xs text-muted-foreground">كلمة المرور الجديدة</Label>
                  <Input 
                    id="newPassword" 
                    name="new_pwd_no_fill"
                    type="password"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    readOnly={isNewPwdReadOnly}
                    onFocus={() => setIsNewPwdReadOnly(false)}
                    className="bg-background"
                    placeholder="********"
                    autoComplete="new-password"
                  />
                </div>
                <Button 
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword || !oldPassword || !newPassword}
                  className="sm:mt-5 bg-brand-blue hover:bg-brand-blue/90 text-white min-w-[100px]"
                >
                  {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث السر"}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          {/* قسم حذف الحساب */}
          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-right w-full">
                <h3 className="font-bold text-destructive flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  منطقة الخطر
                </h3>
                <p className="text-xs text-muted-foreground">
                  حذف حسابك سيؤدي إلى مسح جميع بياناتك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full sm:w-auto shrink-0 whitespace-nowrap min-w-[100px]"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف الحساب"}
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
