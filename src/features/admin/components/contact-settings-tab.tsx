"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Phone, MessageCircle, Send, Globe, CheckCircle2, ShieldCheck, Save } from "lucide-react"
import { updateContactSettings } from "@/features/admin/actions"
import { createClient } from "@/utils/supabase/client"

export function ContactSettingsTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState({
    whatsapp_number: "",
    support_phone: "",
    telegram_link: "",
    facebook_link: ""
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsFetching(true)
    const supabase = createClient()
    try {
      const { data } = await supabase
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
    setSaveSuccess(false)

    try {
      const result = await updateContactSettings(formData)
      if (result.error) {
        alert(result.error)
      } else {
        setSaveSuccess(true)
      }
    } catch (error) {
      console.error(error)
      alert("حدث خطأ أثناء الحفظ")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-300">
      <Card className="border border-border/60 shadow-premium">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </span>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                إعدادات قنوات التواصل والدعم الفني
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                تظهر هذه الروابط والأرقام لجميع التجار والمشترين في أزرار الدعم الفني وصفحة المساعدة
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isFetching ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
              <span className="text-xs font-bold">جارٍ جلب إعدادات التواصل الحالية...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تم حفظ وتحديث إعدادات التواصل بنجاح في كامل المنصة ✓</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* رقم الواتساب */}
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    رقم الواتساب الرسمي للدعم
                  </Label>
                  <Input
                    id="whatsapp"
                    placeholder="9647XXXXXXXXX"
                    value={formData.whatsapp_number}
                    onChange={(e) => {
                      setFormData({ ...formData, whatsapp_number: e.target.value })
                      setSaveSuccess(false)
                    }}
                    dir="ltr"
                    className="h-9 text-xs sm:text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">أدخل الرقم بالصيغة الدولية مع مفتاح الدولة (مثل: 9647700000000)</p>
                </div>

                {/* رقم هاتف الدعم */}
                <div className="space-y-1.5">
                  <Label htmlFor="support_phone" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-brand-blue" />
                    رقم هاتف الدعم والمبيعات
                  </Label>
                  <Input
                    id="support_phone"
                    placeholder="07XXXXXXXXX"
                    value={formData.support_phone}
                    onChange={(e) => {
                      setFormData({ ...formData, support_phone: e.target.value })
                      setSaveSuccess(false)
                    }}
                    dir="ltr"
                    className="h-9 text-xs sm:text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">يظهر للمستخدمين للاتصال الصوتي المباشر</p>
                </div>

                {/* رابط التيليجرام */}
                <div className="space-y-1.5">
                  <Label htmlFor="telegram" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-sky-500" />
                    رابط قناة / حساب التيليجرام
                  </Label>
                  <Input
                    id="telegram"
                    placeholder="https://t.me/jumla_support"
                    value={formData.telegram_link}
                    onChange={(e) => {
                      setFormData({ ...formData, telegram_link: e.target.value })
                      setSaveSuccess(false)
                    }}
                    dir="ltr"
                    className="h-9 text-xs sm:text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">رابط مباشر لحساب خدمة عملاء جملتي</p>
                </div>

                {/* رابط الفيسبوك */}
                <div className="space-y-1.5">
                  <Label htmlFor="facebook" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" />
                    رابط صفحة الفيسبوك الرسمية
                  </Label>
                  <Input
                    id="facebook"
                    placeholder="https://facebook.com/jumla"
                    value={formData.facebook_link}
                    onChange={(e) => {
                      setFormData({ ...formData, facebook_link: e.target.value })
                      setSaveSuccess(false)
                    }}
                    dir="ltr"
                    className="h-9 text-xs sm:text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">رابط الصفحة للتسويق واستقبال استفسارات التجار</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs sm:text-sm h-9 px-6 rounded-xl cursor-pointer gap-2 shadow-2xs"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ وتطبيق الإعدادات
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
