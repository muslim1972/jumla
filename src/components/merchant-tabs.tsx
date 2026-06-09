"use client"

import { usePathname, useRouter } from "next/navigation"
import { Package, Receipt, Inbox, Archive as ArchiveIcon, Loader2, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTransition, useState, useRef, useEffect } from "react"

export function MerchantTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      // في وضع RTL (من اليمين لليسار):
      // scrollLeft غالباً يكون سالباً في المتصفحات الحديثة، أو يعتمد على اتجاه المتصفح.
      const absScrollLeft = Math.abs(scrollLeft)
      
      // إذا تحركنا بعيداً عن نقطة البداية (اليمين)، يمكننا العودة لليمين
      setCanScrollRight(absScrollLeft > 2)
      // إذا لم نصل إلى النهاية (اليسار)، يمكننا التمرير لليسار
      setCanScrollLeft(absScrollLeft < scrollWidth - clientWidth - 2)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    // إعادة التحقق بعد مدة قصيرة للتأكد من حساب الخطوط بشكل صحيح
    const timeout = setTimeout(checkScroll, 100)
    return () => {
      window.removeEventListener('resize', checkScroll)
      clearTimeout(timeout)
    }
  }, [])

  const scroll = (direction: 'right' | 'left') => {
    if (scrollRef.current) {
      const scrollAmount = 250
      // في وضع RTL، التمرير لليسار يكون بقيمة سالبة، ولليمين بقيمة موجبة
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      })
    }
  }

  const tabs = [
    {
      name: "المنتجات والإعدادات",
      href: "/dashboard",
      icon: Package
    },
    {
      name: "الطلبات الواردة",
      href: "/dashboard/orders",
      icon: Inbox
    },
    {
      name: "التحاسب مع التطبيق",
      href: "/dashboard/billing",
      icon: Receipt
    },
    {
      name: "الأرشيف",
      href: "/dashboard/archive",
      icon: ArchiveIcon
    }
  ]

  return (
    <div className="bg-background/90 backdrop-blur-md border-b border-border/40 sticky top-[224px] sm:top-[256px] z-30 transition-all shadow-sm">
      <div className="container mx-auto max-w-6xl relative">
        
        {canScrollRight && (
          <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/80 to-transparent z-10 flex items-center justify-start pr-2">
            <button 
              onClick={() => scroll('right')}
              className="bg-background border shadow-sm rounded-full p-1.5 text-muted-foreground hover:text-brand-blue hover:border-brand-blue/50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-6 pt-4 px-4 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {tabs.map((tab) => {
            const isActive = tab.href === "/dashboard" 
              ? pathname === "/dashboard"
              : pathname.includes(tab.href)
              
            const Icon = tab.icon
            const isTabPending = isPending && pendingTab === tab.href

            return (
              <button 
                key={tab.href}
                onClick={() => {
                  if (isActive) return;
                  setPendingTab(tab.href);
                  startTransition(() => {
                    router.push(tab.href);
                  });
                }}
                disabled={isPending}
                className={cn(
                  "flex items-center gap-2 pb-3 px-1 border-b-2 font-bold text-sm sm:text-base transition-colors whitespace-nowrap outline-none",
                  isActive 
                    ? "border-brand-orange text-brand-orange" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  isTabPending && "opacity-70",
                  isPending && !isTabPending && "opacity-50 cursor-not-allowed"
                )}
              >
                {isTabPending ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                {tab.name}
              </button>
            )
          })}
        </div>

        {canScrollLeft && (
          <div className="absolute top-0 left-0 bottom-0 w-16 bg-gradient-to-r from-background via-background/80 to-transparent z-10 flex items-center justify-start pl-2" dir="ltr">
            <button 
              onClick={() => scroll('left')}
              className="bg-background border shadow-sm rounded-full p-1.5 text-muted-foreground hover:text-brand-blue hover:border-brand-blue/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
