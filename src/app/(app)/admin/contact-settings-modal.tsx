"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, Phone, MessageCircle, Send, Globe } from "lucide-react"
import { updateContactSettings } from "./actions"
import { createClient } from "@/utils/supabase/client"

interface ContactSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactSettingsModal({ open, onOpenChange }: ContactSettingsModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [formData, setFormData] = useState({
    whatsapp_number: "",
    support_phone: "",
    telegram_link: "",
    facebook_link: ""
  })

  useEffect(() => {
    if (open) {
      fetchSettings()
    }
  }, [open])

  const fetchSettings = async () => {
    setIsFetching(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (data) {
        setFormData({
          whatsapp_number: data.whatsapp_number || "",
          support_phone: data.support_phone || "",
          telegram_link: data.telegram_link || "",
          facebook_link: data.facebook_link || ""
        })
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateContactSettings(formData)
      if (result.error) {
        alert(result.error)
      } else {
        alert("تم حفظ الإعدادات بنجاح")
        onOpenChange(false)
      }
    } catch (error) {
      console.error(error)
      alert("حدث خطأ أثناء الحفظ")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>إعدادات التواصل والدعم</DialogTitle>
          <DialogDescription>
            حدد أرقام الهواتف وروابط التواصل التي ستظهر للمستخدمين في زر الدعم العائم
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                رقم الواتساب (مع رمز الدولة، مثلاً: +964...)
              </Label>
              <Input 
                id="whatsapp_number"
                placeholder="+964..."
                value={formData.whatsapp_number}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-orange" />
                رقم هاتف الدعم (للاتصال المباشر)
              </Label>
              <Input 
                id="support_phone"
                placeholder="07..."
                value={formData.support_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, support_phone: e.target.value }))}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_link" className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                رابط التليكرام (اختياري)
              </Label>
              <Input 
                id="telegram_link"
                placeholder="https://t.me/..."
                value={formData.telegram_link}
                onChange={(e) => setFormData(prev => ({ ...prev, telegram_link: e.target.value }))}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook_link" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-700" />
                رابط صفحة الفيسبوك (اختياري)
              </Label>
              <Input 
                id="facebook_link"
                placeholder="https://facebook.com/..."
                value={formData.facebook_link}
                onChange={(e) => setFormData(prev => ({ ...prev, facebook_link: e.target.value }))}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-brand-blue hover:bg-brand-blue/90">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                حفظ الإعدادات
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
