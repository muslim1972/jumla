"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { isFakePhoneEmail } from "@/utils/phone"
import { translateError, StatusMessage } from "./types"

export function PasswordManager({ isOpen }: { isOpen: boolean }) {
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // حيلة بسيطة لمنع المتصفح من حشر كلمة المرور (نجعل الحقل للقراءة فقط حتى ينقر عليه المستخدم)
  const [isOldPwdReadOnly, setIsOldPwdReadOnly] = useState(true)
  const [isNewPwdReadOnly, setIsNewPwdReadOnly] = useState(true)

  // رسائل الحالة
  const [passwordMessage, setPasswordMessage] = useState<StatusMessage | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      // تفريغ الحقول عند فتح النافذة وإعادتها لوضع القراءة فقط
      setOldPassword("")
      setNewPassword("")
      setIsOldPwdReadOnly(true)
      setIsNewPwdReadOnly(true)
      setPasswordMessage(null)

      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          setUserEmail(user.email || null)
        }
      })
    }
  }, [isOpen])

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
    /* قسم تغيير كلمة المرور */
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-orange font-bold">
          <KeyRound className="w-5 h-5" />
          <h3>تغيير كلمة المرور</h3>
        </div>
        {/* أصحاب الحسابات المسجلة برقم الهاتف لا يملكون بريداً حقيقياً لاستلام رابط إعادة التعيين */}
        {!isFakePhoneEmail(userEmail) && (
          <Button
            variant="link"
            onClick={handleForgotPassword}
            disabled={isSendingReset}
            className="h-auto p-0 text-xs text-primary underline"
          >
            {isSendingReset ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : ""}
            نسيت كلمة المرور؟
          </Button>
        )}
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
  )
}
