"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Sparkles, Megaphone, CheckCircle2, Trash2, Clock, Phone } from "lucide-react"
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
    text: "هل تريد مضاعفة مبيعاتك؟ أعلن معنا في صدارة التطبيق لتصل عروضك مباشرة إلى آلاف تجار الجملة والمشترين يومياً! 🚀",
    link_url: "#advertise",
    isDefault: true,
    images: ["cat_grocery.jpg", "cat_sweets.jpg", "cat_dairy.jpg", "cat_all.jpg"]
  },
  {
    id: "def-2",
    text: "مساحة إعلانية مميزة وحصرية للشركات، المصانع، وموزعي الجملة. احجز مساحتك الترويجية وتصدر الواجهة الآن! 📈",
    link_url: "#advertise",
    isDefault: true,
    images: ["cat_cleaning.jpg", "cat_plastics.jpg", "cat_smoking.jpg", "cat_all.jpg"]
  },
  {
    id: "def-3",
    text: "انضم إلى كبار التجار المميزين في منصة 'جملة' واعرض خصوماتك هنا. تواصل مع إدارة التسويق والمبيعات فوراً 📞",
    link_url: "#advertise",
    isDefault: true,
    images: ["cat_grocery.jpg", "cat_smoking.jpg", "cat_plastics.jpg", "cat_sweets.jpg"]
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
      {/* Creative Hero Billboard Banner */}
      <div 
        onClick={handleBannerClick}
        className="w-full max-w-4xl mx-auto mt-6 mb-8 px-3 sm:px-4 cursor-pointer"
      >
        <div className="relative overflow-hidden rounded-3xl h-36 sm:h-44 border border-border/40 shadow-premium bg-card/60 backdrop-blur-sm group flex items-center justify-center transition-all duration-300 hover:border-primary/30">
          {/* Creative ambient glows */}
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-700 pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-brand-orange/5 rounded-full blur-3xl group-hover:bg-brand-orange/10 transition-all duration-700 pointer-events-none" />
          
          {/* Animated light line sweep */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0),rgba(255,255,255,0.03)_50%,rgba(255,255,255,0))] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />

          {/* Slides Content */}
          <div className="relative overflow-hidden h-full w-full flex items-center justify-center z-10">
            <div 
              className="absolute flex flex-col w-full transition-transform duration-700 ease-in-out text-center"
              style={{ transform: `translateY(-${(activeIndex * 100) / activeItems.length}%)` }}
            >
              {activeItems.map((item: any) => (
                <div 
                  key={item.id} 
                  className="h-36 sm:h-44 flex flex-col items-center justify-center px-6 sm:px-16 text-center select-none space-y-2 sm:space-y-3"
                >
                  {/* Badge */}
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-orange animate-pulse" />
                    إعلان مميز
                  </span>
                  
                  {/* Big Headline */}
                  <h2 className="text-xs sm:text-base md:text-lg font-black text-brand-blue dark:text-foreground leading-relaxed max-w-2xl px-2 line-clamp-2">
                    {item.text}
                  </h2>
                  
                  {/* Category Images for Default Invitation Slides */}
                  {item.isDefault ? (
                    <div className="flex gap-2 justify-center my-1 pointer-events-none">
                      {item.images.map((imgName: string, imgIdx: number) => (
                        <img 
                          key={imgIdx}
                          src={`/categories/${imgName}`} 
                          alt="category" 
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-border bg-card shadow-sm object-cover animate-bounce" 
                          style={{ animationDelay: `${imgIdx * 150}ms`, animationDuration: '2s' }}
                        />
                      ))}
                    </div>
                  ) : null}
                  
                  {/* Action Link/Badge */}
                  <div className="inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black text-white bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-xl shadow-md transition-all active:scale-95 hover:shadow-lg shadow-primary/10">
                    <Megaphone className="w-3.5 h-3.5 text-white" />
                    احجز مساحتك هنا
                  </div>
                </div>
              ))}
            </div>
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
