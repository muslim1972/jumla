"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Banner {
  id: string
  title: string
  description: string | null
  bg_gradient: string | null
  image_url: string | null
  link_url: string | null
}

const DEFAULT_BANNERS: Banner[] = [
  {
    id: "1",
    title: "عروض الصيف الكبرى ☀️",
    description: "خصومات حصرية تصل إلى 25% على جميع المواد الغذائية والألبان لدى كبار تجار الجملة.",
    bg_gradient: "from-amber-500 via-orange-500 to-red-500",
    image_url: null,
    link_url: "/"
  },
  {
    id: "2",
    title: "جملة السجائر ومستلزمات التدخين 🚬",
    description: "تسوّق الآن بأقل الأسعار الحقيقية في الأسواق. جميع الماركات متوفرة مع توصيل فوري لمكانك.",
    bg_gradient: "from-blue-600 via-indigo-600 to-brand-blue",
    image_url: null,
    link_url: "/"
  },
  {
    id: "3",
    title: "توصيل سريع ومخفّض 🚗",
    description: "استمتع بأجور توصيل تبدأ من 3,000 د.ع فقط أو توصيل مجاني عند زيادة كمية الطلب.",
    bg_gradient: "from-emerald-500 to-teal-600",
    image_url: null,
    link_url: "/"
  },
  {
    id: "4",
    title: "بلاستيكيات وسفريات بأفضل سعر 📦",
    description: "وفر في مصاريف مطعمك أو متجرك واشترِ كارتونات الأكياس والعلب السفري بأسعار المصنع.",
    bg_gradient: "from-pink-500 via-rose-500 to-red-500",
    image_url: null,
    link_url: "/"
  }
]

export function PromoBanners() {
  const [banners, setBanners] = useState<Banner[]>(DEFAULT_BANNERS)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Fetch banners from Supabase database
  useEffect(() => {
    async function fetchBanners() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("banners")
          .select("*")
          .order("created_at", { ascending: false })

        if (!error && data && data.length > 0) {
          setBanners(data)
        }
      } catch (err) {
        console.log("Could not load banners from Supabase table, using local defaults:", err)
      }
    }
    fetchBanners()
  }, [])

  // Auto-scroll every 3 seconds
  useEffect(() => {
    if (isPaused || banners.length <= 1) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [isPaused, banners.length])

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % banners.length)
  }

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }

  if (banners.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 w-full bg-background/90 dark:bg-background/90 backdrop-blur-md border-t border-border/40 py-2 px-3 sm:px-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
      <div 
        className="relative overflow-hidden rounded-2xl h-24 sm:h-32 border border-border/40 shadow-premium bg-card group max-w-4xl mx-auto"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides Track */}
        <div 
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }} // RTL support: negative or positive depending on layout dir
        >
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className={cn(
                "w-full shrink-0 h-full flex flex-col justify-center p-3.5 sm:p-5 text-white relative select-none bg-gradient-to-r",
                banner.bg_gradient || "from-brand-blue to-blue-600"
              )}
            >
              {/* Glass overlay grid */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/10 pointer-events-none" />
              
              <div className="relative z-10 max-w-lg space-y-0.5 sm:space-y-1">
                <h3 className="text-sm sm:text-lg font-black tracking-tight leading-tight">
                  {banner.title}
                </h3>
                {banner.description && (
                  <p className="text-[9px] sm:text-xs text-white/90 font-medium line-clamp-1 sm:line-clamp-2 leading-relaxed max-w-md sm:max-w-xl">
                    {banner.description}
                  </p>
                )}
                <button className="mt-1 sm:mt-2 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white text-foreground hover:bg-white/90 active:scale-95 transition-all text-[9px] sm:text-[10px] font-extrabold rounded-lg shadow-sm w-fit cursor-pointer">
                  تسوق العرض الآن
                </button>
              </div>

              {/* Decorative elements */}
              <div className="absolute left-6 bottom-4 w-12 h-12 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute right-12 top-2 w-16 h-16 bg-black/10 rounded-full blur-xl pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
        >
          <ChevronRight className="h-4.5 w-4.5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>

        {/* Indicators Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                  activeIndex === index 
                    ? "bg-white w-4" 
                    : "bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
