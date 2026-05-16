"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Store, MapPin, Phone, Loader2, AlertCircle } from "lucide-react"

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchantName: string
  onConfirm: (data: { storeName: string; address: string; phone: string }) => void
}

const PHONE_REGEX = /^07\d{9}$/

export function CheckoutDialog({
  open,
  onOpenChange,
  merchantName,
  onConfirm,
}: CheckoutDialogProps) {
  const [storeName, setStoreName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!storeName.trim()) {
      newErrors.storeName = "اسم المتجر مطلوب"
    }

    if (!address.trim()) {
      newErrors.address = "العنوان الدقيق مطلوب"
    }

    if (!phone.trim()) {
      newErrors.phone = "رقم الهاتف مطلوب"
    } else if (!PHONE_REGEX.test(phone.trim())) {
      newErrors.phone = "رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بـ 07"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [storeName, address, phone])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return

    setIsSubmitting(true)
    try {
      onConfirm({
        storeName: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [validate, onConfirm, storeName, address, phone])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setErrors({})
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Store className="w-5 h-5 text-primary" />
            </div>
            بيانات التوصيل
          </DialogTitle>
          <DialogDescription>
            أدخل بيانات التوصيل لطلبك من <span className="font-bold text-foreground">{merchantName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* اسم المتجر */}
          <div className="space-y-2">
            <Label htmlFor="checkout-store-name" className="flex items-center gap-2 text-sm font-semibold">
              <Store className="w-4 h-4 text-muted-foreground" />
              اسم المتجر
            </Label>
            <Input
              id="checkout-store-name"
              placeholder="مثال: سوبر ماركت الأمل"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value)
                if (errors.storeName) setErrors(prev => ({ ...prev, storeName: "" }))
              }}
              className={errors.storeName ? "border-destructive ring-2 ring-destructive/20" : ""}
            />
            {errors.storeName && (
              <p className="text-xs text-destructive flex items-center gap-1 animate-in slide-in-from-top-1">
                <AlertCircle className="w-3 h-3" />
                {errors.storeName}
              </p>
            )}
          </div>

          {/* العنوان */}
          <div className="space-y-2">
            <Label htmlFor="checkout-address" className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              العنوان الدقيق
            </Label>
            <Input
              id="checkout-address"
              placeholder="مثال: كربلاء - حي الحسين - شارع 40 - بناية 5"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                if (errors.address) setErrors(prev => ({ ...prev, address: "" }))
              }}
              className={errors.address ? "border-destructive ring-2 ring-destructive/20" : ""}
            />
            {errors.address && (
              <p className="text-xs text-destructive flex items-center gap-1 animate-in slide-in-from-top-1">
                <AlertCircle className="w-3 h-3" />
                {errors.address}
              </p>
            )}
          </div>

          {/* رقم الهاتف */}
          <div className="space-y-2">
            <Label htmlFor="checkout-phone" className="flex items-center gap-2 text-sm font-semibold">
              <Phone className="w-4 h-4 text-muted-foreground" />
              رقم هاتف متاح دائماً
            </Label>
            <Input
              id="checkout-phone"
              type="tel"
              dir="ltr"
              placeholder="07XXXXXXXXX"
              maxLength={11}
              value={phone}
              onChange={(e) => {
                // السماح بالأرقام فقط
                const val = e.target.value.replace(/\D/g, '')
                setPhone(val)
                if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }))
              }}
              className={`text-left ${errors.phone ? "border-destructive ring-2 ring-destructive/20" : ""}`}
            />
            {errors.phone ? (
              <p className="text-xs text-destructive flex items-center gap-1 animate-in slide-in-from-top-1">
                <AlertCircle className="w-3 h-3" />
                {errors.phone}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                يجب أن يتكون من 11 رقم ويبدأ بـ 07
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-blue-600 shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري المعالجة...
              </>
            ) : (
              "استمرار"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
