"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Trash2, Loader2, CheckCircle2, AlertCircle, MapPin } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { translateError, StatusMessage } from "./types"

export function ProfileInfoForm({ isOpen, fullName }: { isOpen: boolean, fullName?: string | null }) {
  const [newFullName, setNewFullName] = useState(fullName || "")
  const [addressText, setAddressText] = useState("")
  const [gpsLink, setGpsLink] = useState("")

  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)

  // رسائل الحالة
  const [nameMessage, setNameMessage] = useState<StatusMessage | null>(null)
  const [addressMessage, setAddressMessage] = useState<StatusMessage | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      setNameMessage(null)
      setAddressMessage(null)

      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          const { data } = await supabase.from('profiles').select('address').eq('id', user.id).single()
          if (data) {
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

  return (
    <>
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
    </>
  )
}
