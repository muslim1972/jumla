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

  const handleSave = async () => {
    if (fee === "" || phone.trim() === "") return
    
    setIsLoading(true)
    setIsSaved(false)
    try {
      const result = await updateMerchantSettings(parseFloat(fee), phone.trim())
      if (result.success) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert("خطأ في الحفظ: " + result.error)
      }
    } catch (error) {
      alert("خطأ في الاتصال")
    } finally {
      setIsLoading(false)
    }
  }

  const isComplete = fee !== "" && phone.trim() !== ""
  const [isOpen, setIsOpen] = useState(!isComplete)

  return (
    <div className="flex flex-col bg-primary/5 rounded-xl border border-primary/20 mb-6 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/15 transition-colors font-bold text-primary"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <span>إعدادات المتجر (أجور التوصيل والدعم)</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      
      {isOpen && (
        <div className="p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
        <Label htmlFor="delivery_fee" className="text-primary font-bold">أجور التوصيل (د.ع)</Label>
        <div className="relative">
          <Input 
            id="delivery_fee" 
            type="number" 
            value={fee} 
            onChange={(e) => setFee(e.target.value)}
            className="h-12 text-lg font-bold pr-10"
            placeholder="0"
            dir="ltr"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground font-medium">
            د.ع
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support_phone" className="text-primary font-bold flex items-center gap-1">
          <Phone className="w-4 h-4" /> رقم الدعم للطلبات
        </Label>
        <Input 
          id="support_phone" 
          type="tel" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          className="h-12 text-lg font-bold text-left"
          placeholder="07XXXXXXXXX"
          dir="ltr"
          maxLength={11}
        />
      </div>

      <button 
        onClick={handleSave}
        disabled={isLoading || !isComplete}
        className={`h-12 w-full rounded-lg flex items-center justify-center gap-2 font-bold transition-all mt-2 ${
          isSaved 
            ? "bg-green-500 text-white" 
            : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        }`}
        title="حفظ الإعدادات"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSaved ? (
          <>
            <Check className="w-5 h-5" /> تم الحفظ بنجاح
          </>
        ) : (
          <>
            <Check className="w-5 h-5" /> حفظ إعدادات المتجر
          </>
        )}
      </button>

      <p className="text-[10px] text-muted-foreground text-center mt-1">* يجب تحديد أجور التوصيل ورقم الدعم قبل إضافة أي منتجات جديدة.</p>
        </div>
      )}
    </div>
  )
}
