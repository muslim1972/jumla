"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, KeyRound, Trash2, ArrowRight, Loader2, CheckCircle2, AlertCircle, MapPin, Award, Wallet } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { deleteUserAccount } from "@/app/actions/auth-actions"
import { getBuyerActiveOrders, deletePendingOrder, requestOrderDeletion } from "@/app/actions/buyer-orders-actions"

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
  const [addressText, setAddressText] = useState("")
  const [gpsLink, setGpsLink] = useState("")
  
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<string | null>(null)
  const [userPoints, setUserPoints] = useState<number>(0)

  // حيلة بسيطة لمنع المتصفح من حشر كلمة المرور (نجعل الحقل للقراءة فقط حتى ينقر عليه المستخدم)
  const [isOldPwdReadOnly, setIsOldPwdReadOnly] = useState(true)
  const [isNewPwdReadOnly, setIsNewPwdReadOnly] = useState(true)

  // رسائل الحالة
  const [nameMessage, setNameMessage] = useState<{type: 'error'|'success', text: string} | null>(null)
  const [addressMessage, setAddressMessage] = useState<{type: 'error'|'success', text: string} | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{type: 'error'|'success', text: string} | null>(null)

  const [activeOrders, setActiveOrders] = useState<any[] | null>(null)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      // تفريغ الحقول عند فتح النافذة وإعادتها لوضع القراءة فقط
      setOldPassword("")
      setNewPassword("")
      setIsOldPwdReadOnly(true)
      setIsNewPwdReadOnly(true)
      setNameMessage(null)
      setAddressMessage(null)
      setPasswordMessage(null)

      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          setUserEmail(user.email || null)
          const { data } = await supabase.from('profiles').select('address, tier, points').eq('id', user.id).single()
          if (data) {
            if (data.tier) setUserTier(data.tier)
            if (data.points) setUserPoints(data.points)
            
            if (data.address) {
              if (data.address.includes("https://www.google.com/maps")) {
                const parts = data.address.split("https://")
                setAddressText(parts[0].replace(' - ', '').trim())
                setGpsLink("https://" + parts[1])
              } else {
                setAddressText(data.address)
                setGpsLink("")
              }
            }
          }
        }
      })
    }
  }, [isOpen])

  // مستمع الإغلاق عند تسجيل الخروج
  useEffect(() => {
    const handleLogout = () => setIsOpen(false)
    window.addEventListener('user-logout', handleLogout)
    return () => window.removeEventListener('user-logout', handleLogout)
  }, [setIsOpen])

  const handleCheckOrdersForDeletion = async (autoProceedToDeleteOrEvent?: boolean | React.BaseSyntheticEvent) => {
    // Determine if we should auto-proceed
    const autoProceedToDelete = typeof autoProceedToDeleteOrEvent === 'boolean' 
      ? autoProceedToDeleteOrEvent 
      : true; // Default to true when called from button click
    
    // If not a buyer (guest role usually means buyer in this system) or if we just want to be safe, check orders for everyone
    // Admin, Merchant, Support don't make orders typically, but if they do, same rules apply.
    setIsLoadingOrders(true)
    try {
      const res = await getBuyerActiveOrders()
      if (res.orders && res.orders.length > 0) {
        setActiveOrders(res.orders)
      } else {
        if (autoProceedToDelete) {
          // No active orders, proceed to delete
          handleDeleteAccount()
        } else {
          setActiveOrders(null)
        }
      }
    } catch (e) {
      console.error(e)
      alert("حدث خطأ أثناء التحقق من الطلبات الفعالة.")
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const handleOrderAction = async (orderId: string, status: string, cancelRequested: boolean) => {
    setActionLoadingId(orderId)
    if (status === "pending") {
      const res = await deletePendingOrder(orderId)
      if (res.success) {
        setActiveOrders(prev => prev ? prev.filter(o => o.id !== orderId) : null)
      } else {
        alert(res.error)
      }
    } else {
      if (cancelRequested) {
        setActionLoadingId(null)
        return
      }
      const res = await requestOrderDeletion(orderId)
      if (res.success) {
        setActiveOrders(prev => prev ? prev.map(o => o.id === orderId ? { ...o, cancel_requested: true } : o) : null)
        alert("تم إرسال طلب الحذف للتاجر. يرجى الانتظار حتى يوافق عليه.")
      } else {
        alert(res.error)
      }
    }
    setActionLoadingId(null)
  }

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("هل أنت متأكد تماماً أنك تريد حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء!")
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await deleteUserAccount(user.id)
      
      if (result.error) {
        console.error("Delete user account result.error:", result.error)
        alert("حدث خطأ أثناء محاولة حذف الحساب: " + result.error)
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

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      setAddressMessage({ type: 'error', text: 'المتصفح الخاص بك أو جهازك لا يدعم تحديد الموقع (GPS).' })
      return
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' })
        if (permissionStatus.state === 'denied') {
          setAddressMessage({ type: 'error', text: 'لقد قمت برفض صلاحية الوصول للموقع مسبقاً. يرجى تفعيل الـ GPS وإعطاء الصلاحية للمتصفح من الإعدادات ثم المحاولة مجدداً.' })
          return
        }
      }
    } catch (e) {
      // Ignore if permissions API is not fully supported
    }
    
    setAddressMessage({ type: 'success', text: 'جاري جلب الموقع، يرجى الموافقة على صلاحية الـ GPS إذا طُلب منك ذلك...' })
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setGpsLink(mapsLink);
        setAddressMessage({ type: 'success', text: 'تم التقاط الموقع بنجاح! اضغط "حفظ العنوان" لتأكيده.' })
      },
      (error) => {
        let errorMsg = 'تعذر الحصول على الموقع. يرجى تفعيل الـ GPS والمحاولة مجدداً.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'تم رفض صلاحية الوصول للموقع. يرجى إعطاء الصلاحية للمتصفح من الإعدادات.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'معلومات الموقع غير متوفرة حالياً. تأكد من تفعيل الـ GPS في جهازك.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'انتهى وقت طلب الموقع. يرجى التأكد من جودة الاتصال وتفعيل الـ GPS.';
        }
        setAddressMessage({ type: 'error', text: errorMsg })
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    )
  }

  const handleUpdateAddress = async () => {
    if (!addressText.trim() && !gpsLink) return
    setIsUpdatingAddress(true)
    setAddressMessage(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const finalAddress = gpsLink ? (addressText.trim() ? `${addressText.trim()} - ${gpsLink}` : gpsLink) : addressText.trim()

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ address: finalAddress })
        .eq('id', user.id)

      if (!profileError) {
        setAddressMessage({ type: 'success', text: 'تم تحديث العنوان بنجاح!' })
      } else {
        setAddressMessage({ type: 'error', text: translateError(profileError.message) || "حدث خطأ أثناء تحديث العنوان" })
      }
    } catch (error: any) {
      setAddressMessage({ type: 'error', text: translateError(error.message) || "حدث خطأ غير متوقع" })
    } finally {
      setIsUpdatingAddress(false)
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
          <div className="flex-1">
            <DialogTitle className="text-xl font-black text-brand-blue m-0">
              الصفحة الشخصية
            </DialogTitle>
            <DialogDescription className="sr-only">
              إدارة إعدادات حسابك الشخصي
            </DialogDescription>
          </div>
          {userTier && (
            <div className="flex items-center gap-2">
              <a href="/wallet" className="flex items-center justify-center bg-green-500/10 p-2 rounded-xl border border-green-500/20 hover:bg-green-500/20 transition-colors" title="المحفظة">
                <Wallet className="w-5 h-5 text-green-600" />
              </a>
              <a href="/rewards" className="flex flex-col items-center justify-center bg-brand-orange/10 px-3 py-1.5 rounded-xl border border-brand-orange/20 hover:bg-brand-orange/20 transition-colors">
                <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{userTier}</span>
                <span className="text-sm font-black text-brand-orange flex items-center gap-1">
                  {userPoints?.toLocaleString() || 0}
                  <Award className="w-3 h-3" />
                </span>
              </a>
            </div>
          )}
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

          {/* قسم تعديل العنوان */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand-orange font-bold">
              <MapPin className="w-5 h-5" />
              <h3>تعديل عنوان الأسواق</h3>
            </div>
            
            {addressMessage && (
              <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${addressMessage.type === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-green-500/10 text-green-600 border border-green-500/20'}`}>
                {addressMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <p>{addressMessage.text}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="space-y-1">
                <Label htmlFor="addressText" className="text-xs text-muted-foreground">العنوان (نصي)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="addressText" 
                    value={addressText} 
                    onChange={(e) => setAddressText(e.target.value)}
                    className="bg-background flex-1 text-right text-sm"
                    placeholder="مثال: بغداد، الكرادة، قرب..."
                    dir="rtl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetLocation}
                    title="التقاط الموقع الحالي (GPS)"
                    className="px-3 shrink-0 flex items-center gap-1.5"
                  >
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="hidden sm:inline text-xs font-bold text-emerald-700">تحديد موقعي</span>
                  </Button>
                </div>
              </div>
              
              {gpsLink && (
                <div className="space-y-1 animate-in fade-in zoom-in duration-300">
                  <Label htmlFor="gpsLink" className="text-xs text-muted-foreground">رابط الـ GPS المرفق</Label>
                  <div className="flex gap-2 relative">
                    <Input 
                      id="gpsLink" 
                      value={gpsLink} 
                      readOnly
                      className="bg-muted/50 text-blue-600 flex-1 text-left text-xs font-mono"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setGpsLink("")}
                      className="absolute right-1 top-1 h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="إزالة الـ GPS"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleUpdateAddress}
                disabled={isUpdatingAddress || (!addressText.trim() && !gpsLink)}
                className="bg-brand-blue hover:bg-brand-blue/90 text-white w-full sm:w-auto self-end min-w-[100px]"
              >
                {isUpdatingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ العنوان"}
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
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-right w-full">
                  <h3 className="font-bold text-destructive flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    منطقة الخطر
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    حذف حسابك سيؤدي إلى مسح جميع بياناتك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
                  </p>
                </div>
                {!activeOrders || activeOrders.length === 0 ? (
                  <Button 
                    variant="destructive" 
                    onClick={handleCheckOrdersForDeletion}
                    disabled={isDeleting || isLoadingOrders}
                    className="w-full sm:w-auto shrink-0 whitespace-nowrap min-w-[100px]"
                  >
                    {isDeleting || isLoadingOrders ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف الحساب"}
                  </Button>
                ) : null}
              </div>

              {activeOrders && activeOrders.length > 0 && (
                <div className="mt-2 border-t border-destructive/20 pt-4 space-y-3">
                  <div className="bg-orange-500/10 border border-orange-500/20 text-orange-700 p-3 rounded-lg text-xs font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      لا يمكنك حذف حسابك حالياً لوجود طلبات فعالة مرتبطة بك.
                      <br />- الطلبات قيد الانتظار يجب حذفها أولاً.
                      <br />- الطلبات الموافقة أو قيد التوصيل يجب إرسال طلب للتاجر لحذفها، وسيقوم بالتواصل معك أو مع المندوب لإرجاعها.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {activeOrders.map(order => {
                      const merchantName = order.profiles?.store_name || order.profiles?.full_name || "تاجر غير معروف"
                      const invoiceLabel = order.invoice_number
                        ? `#${String(order.invoice_number).padStart(5, '0')}`
                        : "بدون رقم"
                      const orderDate = order.created_at
                        ? new Date(order.created_at).toLocaleDateString("ar-IQ", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"
                      return (
                        <div key={order.id} className="bg-background border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                          <div className="text-right w-full space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-[10px] font-bold text-muted-foreground">التاجر:</span>
                              <span className="font-bold text-sm text-foreground">{merchantName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-[10px] font-bold text-muted-foreground">رقم القائمة:</span>
                              <span className="font-mono text-xs font-bold text-foreground">{invoiceLabel}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-[10px] font-bold text-muted-foreground">التأريخ:</span>
                              <span className="text-xs text-muted-foreground">{orderDate}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-[10px] font-bold text-muted-foreground">المجموع:</span>
                              <span className="text-xs font-bold text-foreground">{order.total_rounded?.toLocaleString("en-US")} د.ع</span>
                            </div>
                            <p className="text-[10px] font-bold mt-1.5">
                              {order.status === "pending" ? (
                                <span className="text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">بانتظار الموافقة</span>
                              ) : order.status === "approved" ? (
                                <span className="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">تمت الموافقة / بانتظار المندوب</span>
                              ) : (
                                <span className="text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">قيد التوصيل</span>
                              )}
                            </p>
                          </div>
                          <Button
                            variant={order.status === "pending" ? "destructive" : "outline"}
                            size="sm"
                            disabled={actionLoadingId === order.id || order.cancel_requested}
                            onClick={() => handleOrderAction(order.id, order.status, order.cancel_requested)}
                            className={`w-full sm:w-auto shrink-0 ${order.status !== "pending" && !order.cancel_requested ? "border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600" : ""}`}
                          >
                            {actionLoadingId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : order.cancel_requested ? (
                              "تم طلب الحذف"
                            ) : order.status === "pending" ? (
                              "حذف الطلب"
                            ) : (
                              "طلب حذف"
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveOrders(null)}
                      size="sm"
                      className="border-muted-foreground/30"
                    >
                      تراجع عن الحذف
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCheckOrdersForDeletion(false)}
                      disabled={isLoadingOrders}
                      size="sm"
                    >
                      {isLoadingOrders ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      تحديث القائمة
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
