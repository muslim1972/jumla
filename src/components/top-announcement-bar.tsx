"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Volume2, Sparkles, X, Megaphone, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TopBanner {
  id: string
  text: string
  link_url: string | null
  start_date: string
  end_date: string
}

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "def-1",
    text: "📢 هل تريد مضاعفة مبيعاتك؟ أعلن معنا هنا لتصل إلى آلاف تجار الجملة والمشترين يومياً! 🚀",
    link_url: "#advertise"
  },
  {
    id: "def-2",
    text: "💡 مساحة إعلانية مميزة للشركات والمصانع وموزعي الجملة. احجز مساحتك الآن وتصدر الواجهة! 📈",
    link_url: "#advertise"
  },
  {
    id: "def-3",
    text: "🎉 انضم إلى كبار التجار المميزين في منصة 'جملة' واعرض عروضك وخصوماتك هنا. اتصل بنا 📞",
    link_url: "#advertise"
  }
]

export function TopAnnouncementBar({ initialBanners }: { initialBanners: TopBanner[] }) {
  const [banners, setBanners] = useState<TopBanner[]>(initialBanners)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  // Form states
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [duration, setDuration] = useState("week")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch top banners on the client side in case they updated
  useEffect(() => {
    async function fetchTopBanners() {
      try {
        const supabase = createClient()
        const nowString = new Date().toISOString()
        const { data, error } = await supabase
          .from("top_banners")
          .select("*")
          .eq("is_active", true)
          .lte("start_date", nowString)
          .gte("end_date", nowString)
          .order("created_at", { ascending: false })

        if (!error && data && data.length > 0) {
          setBanners(data)
        }
      } catch (err) {
        console.log("Error fetching top banners, using initial/fallback data:", err)
      }
    }
    
    // Only fetch if initialBanners was empty
    if (initialBanners.length === 0) {
      fetchTopBanners()
    }
  }, [initialBanners])

  const activeItems = banners.length > 0 ? banners : DEFAULT_ANNOUNCEMENTS

  // Cycle announcements every 5 seconds
  useEffect(() => {
    if (activeItems.length <= 1) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeItems.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [activeItems.length])

  // Handle inquiry submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("ad_requests")
        .insert({
          name,
          phone,
          duration,
          message: message || null
        })

      if (!error) {
        setIsSuccess(true)
        setName("")
        setPhone("")
        setMessage("")
        // Close modal after 2.5s on success
        setTimeout(() => {
          setIsModalOpen(false)
          // Reset success state after transition
          setTimeout(() => setIsSuccess(false), 500)
        }, 2500)
      } else {
        alert("فشل إرسال الطلب: " + error.message)
      }
    } catch (err: any) {
      alert("حدث خطأ أثناء الاتصال بالخادم: " + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBannerClick = () => {
    setIsModalOpen(true)
  }

  return (
    <>
      {/* Creative Announcement Bar */}
      <div 
        onClick={handleBannerClick}
        className="w-full bg-gradient-to-r from-indigo-950 via-brand-blue to-indigo-900 border-b border-indigo-800/40 text-white cursor-pointer relative overflow-hidden group shadow-md"
      >
        {/* Animated ambient light lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03),rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.03))] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
        
        <div className="container mx-auto px-4 flex items-center justify-between h-8 sm:h-9">
          {/* Badge indicator on the right (RTL Layout) */}
          <div className="flex items-center gap-1.5 z-10 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange"></span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-brand-orange/20 text-brand-orange border border-brand-orange/30 px-2 py-0.5 rounded-full">
              إعلان مميز
            </span>
          </div>

          {/* Sliding Text Area */}
          <div className="relative overflow-hidden h-full flex-grow flex items-center justify-center mx-4">
            <div 
              className="absolute flex flex-col w-full transition-transform duration-500 ease-in-out text-center"
              style={{ transform: `translateY(-${activeIndex * 100}%)` }}
            >
              {activeItems.map((item) => (
                <div 
                  key={item.id} 
                  className="h-8 sm:h-9 flex items-center justify-center text-[10px] sm:text-xs font-bold leading-none select-none text-white/95 group-hover:text-white transition-colors truncate max-w-[280px] sm:max-w-xl md:max-w-3xl"
                >
                  <Sparkles className="w-3.5 h-3.5 ml-1.5 text-brand-orange shrink-0 animate-pulse" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Action Call-to-action on the left */}
          <div className="z-10 shrink-0 hidden xs:flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-brand-orange group-hover:underline transition-all bg-white/5 group-hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5">
            <Megaphone className="w-3 h-3 text-brand-orange" />
            أعلن معنا
          </div>
        </div>
      </div>

      {/* Advertise Dialog Inquiry Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md w-[92%] sm:w-full rounded-2xl p-6 overflow-hidden border border-indigo-900/10 shadow-premium" dir="rtl">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-xl font-black text-brand-blue flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-brand-orange" /> أعلن في صدارة تطبيق جملة
            </DialogTitle>
            <DialogDescription className="text-xs">
              احجز مساحة إعلانية مدفوعة في صدارة التطبيق لتصل عروضك مباشرة إلى آلاف تجار الجملة والمشترين.
            </DialogDescription>
          </DialogHeader>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in zoom-in duration-300">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-black text-brand-blue text-center">تم إرسال طلبك بنجاح!</h3>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                شكراً لتواصلك معنا. سيقوم فريق المبيعات والتسويق بمراجعة طلبك والتواصل معك عبر الواتساب/الهاتف في أقرب وقت لتفعيل إعلانك.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="ad-name" className="text-xs font-bold text-foreground">الاسم الكامل / اسم الشركة</Label>
                <Input 
                  id="ad-name" 
                  placeholder="شركة الجود لتوزيع المواد الغذائية..." 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ad-phone" className="text-xs font-bold text-foreground">رقم الهاتف / الواتساب</Label>
                <Input 
                  id="ad-phone" 
                  placeholder="077XXXXXXXX..." 
                  type="tel"
                  dir="ltr"
                  className="text-right"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ad-duration" className="text-xs font-bold text-foreground">فترة الإعلان المطلوبة</Label>
                <Select value={duration} onValueChange={(val) => setDuration(val || "week")}>
                  <SelectTrigger id="ad-duration" className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="اختر فترة الإعلان" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="week">أسبوع واحد (7 أيام)</SelectItem>
                    <SelectItem value="two_weeks">أسبوعين (14 يوم)</SelectItem>
                    <SelectItem value="month">شهر كامل (30 يوم)</SelectItem>
                    <SelectItem value="custom">فترة مخصصة (أكثر من شهر)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ad-msg" className="text-xs font-bold text-foreground">تفاصيل الإعلان أو المنتجات (اختياري)</Label>
                <textarea 
                  id="ad-msg" 
                  rows={3}
                  className="w-full min-h-[80px] px-3 py-2 text-xs rounded-xl border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="اكتب هنا العروض أو المنتجات التي ترغب بالإعلان عنها..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full cursor-pointer shadow-lg shadow-brand-orange/20"
                disabled={isLoading}
              >
                {isLoading ? "جاري الإرسال..." : "إرسال طلب الإعلان والاتصال بالمبيعات"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
