"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Loader2, Phone, Settings, ChevronDown, ChevronUp } from "lucide-react"
import { updateMerchantSettings } from "@/app/(merchant)/dashboard/actions"

interface MerchantSettingsProps {
  initialDeliveryFee: number | null
  initialSupportPhone: string | null
}

export function MerchantSettings({ initialDeliveryFee, initialSupportPhone }: MerchantSettingsProps) {
  const [fee, setFee] = useState(initialDeliveryFee?.toString() || "")
  const [phone, setPhone] = useState(initialSupportPhone || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const isComplete = fee !== "" && phone.trim() !== ""
  const [isOpen, setIsOpen] = useState(!isComplete)

  const handleFeeChange = (val: string) => {
    setFee(val)
    if (isSaved) setIsSaved(false)
  }

  const handlePhoneChange = (val: string) => {
    setPhone(val.replace(/\D/g, ''))
    if (isSaved) setIsSaved(false)
  }

  const handleSave = async () => {
    if (fee === "" || phone.trim() === "") return
    
    setIsLoading(true)
    try {
      const result = await updateMerchantSettings(parseFloat(fee), phone.trim())
      if (result.success) {
        setIsSaved(true)
      } else {
        alert("خطأ في الحفظ: " + result.error)
      }
    } catch {
      alert("خطأ في الاتصال")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-primary/5 rounded-xl border border-primary/20 mb-3 overflow-hidden text-xs">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 px-3 bg-primary/10 hover:bg-primary/15 transition-colors font-bold text-primary text-xs sm:text-sm cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-brand-orange" />
          <span>إعدادات المتجر (أجور التوصيل والدعم)</span>
          {isComplete && (
            <span className="text-[10px] bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 px-2 py-0.2 rounded-full font-bold">
              مكتملة
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {isOpen && (
        <div className="p-3 sm:p-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5">
            <Label htmlFor="delivery_fee" className="text-primary font-bold text-xs">أجور التوصيل (د.ع)</Label>
            <div className="relative">
              <Input 
                id="delivery_fee" 
                type="number" 
                value={fee} 
                onChange={(e) => handleFeeChange(e.target.value)}
                className="h-9 sm:h-10 text-sm sm:text-base font-bold pr-10"
                placeholder="0"
                dir="ltr"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground font-medium text-xs">
                د.ع
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support_phone" className="text-primary font-bold text-xs flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> رقم الدعم للطلبات
            </Label>
            <Input 
              id="support_phone" 
              type="tel" 
              value={phone} 
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="h-9 sm:h-10 text-sm sm:text-base font-bold text-left"
              placeholder="07XXXXXXXXX"
              dir="ltr"
              maxLength={11}
            />
          </div>

          <button 
            type="button"
            onClick={handleSave}
            disabled={isLoading || !isComplete}
            className={`h-9 sm:h-10 w-full rounded-lg flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all mt-1 cursor-pointer ${
              isSaved 
                ? "bg-green-600 text-white" 
                : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            }`}
            title="حفظ الإعدادات"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSaved ? (
              <>
                <Check className="w-4 h-4" /> تم الحفظ بنجاح
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> حفظ إعدادات المتجر
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
