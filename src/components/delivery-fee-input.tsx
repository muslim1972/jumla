"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Loader2 } from "lucide-react"
import { updateDeliveryFee } from "@/app/(merchant)/dashboard/actions"

export function DeliveryFeeInput({ initialValue }: { initialValue: number | null }) {
  const [value, setValue] = useState(initialValue?.toString() || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = async () => {
    if (value === "") return
    
    setIsLoading(true)
    setIsSaved(false)
    try {
      const result = await updateDeliveryFee(parseFloat(value))
      if (result.success) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert("خطأ في حفظ أجور التوصيل")
      }
    } catch (error) {
      alert("خطأ في الاتصال")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-primary/5 rounded-xl border border-primary/20 mb-6">
      <Label htmlFor="delivery_fee" className="text-primary font-bold">أجور التوصيل (د.ع)</Label>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Input 
            id="delivery_fee" 
            type="number" 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            className="h-12 text-lg font-bold pr-10"
            placeholder="0"
            dir="ltr"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground font-medium">
            د.ع
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isLoading || value === ""}
          className={`h-12 w-12 rounded-lg flex items-center justify-center transition-all ${
            isSaved 
              ? "bg-green-500 text-white" 
              : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          }`}
          title="حفظ"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isSaved ? (
            <Check className="w-6 h-6" />
          ) : (
            <Check className="w-6 h-6" />
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground italic">
        * يجب تحديد أجور التوصيل قبل إضافة أي منتجات جديدة.
      </p>
    </div>
  )
}
