"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { getNotifications, markAllNotificationsAsRead } from "@/features/notifications/actions"

// صيغة الوقت النسبي بالعربية (منذ ...)
function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "الآن"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${days} يوم`
  return new Date(dateStr).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" })
}

export function NotificationCenter() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const markedRef = useRef(false)

  const load = useCallback(async () => {
    const result = await getNotifications()
    setItems(result.notifications || [])
    setUnreadCount(result.unreadCount || 0)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      await load()
      // فلترة القناة بإشعارات هذا المستخدم فقط — بدل بث جدول notifications كاملاً
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      channel = supabase
        .channel("notification_center_realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
          load()
        })
        .subscribe()
    }
    init()

    // استماع للتحديث عند استعادة تركيز النافذة وتحديث دوري
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    const interval = setInterval(load, 15000)

    return () => {
      window.removeEventListener("focus", onFocus)
      clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
  }, [load])

  // إغلاق عند النقر خارج الجرس
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = async () => {
    const next = !isOpen
    setIsOpen(next)
    // عند الفتح: تعليم كل الإشعارات كمقروءة (مرة واحدة لكل فتح)
    if (next && unreadCount > 0 && !markedRef.current) {
      markedRef.current = true
      await markAllNotificationsAsRead()
      setUnreadCount(0)
      markedRef.current = false
    }
  }

  const handleItemClick = (n: any) => {
    setIsOpen(false)
    const title = n.title || ""
    const message = n.message || ""
    
    // توجيه ذكي حسب نوع الإشعار
    if (title.includes("تسجيل") || title.includes("تفعيل") || message.includes("بانتظار موافقتك")) {
      router.push("/admin?tab=users&approval=pending")
      return
    }

    if (title.includes("فاتورة") || message.includes("فاتورة")) {
      router.push("/dashboard/billing")
      return
    }

    if (title.includes("طلب") || message.includes("طلب")) {
      router.push("/dashboard/orders")
      return
    }
  }

  return (
    <div className="relative overflow-visible pointer-events-auto" ref={containerRef}>
      {/* زر الجرس مع شارة العدد */}
      <button
        onClick={handleToggle}
        title="الإشعارات"
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-full shadow-md border transition-all hover:scale-105 active:scale-95",
          "bg-background/90 backdrop-blur-md hover:bg-muted",
          isOpen && "bg-muted scale-105"
        )}
      >
        <Bell className={cn("w-4 h-4", unreadCount > 0 ? "text-brand-orange" : "text-foreground")} />
      </button>

      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 z-10 bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-background shadow-sm pointer-events-none">
          {unreadCount > 9 ? "+9" : unreadCount}
        </span>
      )}

      {/* قائمة الإشعارات المنسدلة */}
      <div
        className={cn(
          // موبايل: شريط بعرض الشاشة بهوامش آمنة وارتفاع نسبةً للشاشة (يتكيف ذاتياً مع القياس)
          "fixed inset-x-3 top-[60px] max-h-[min(420px,calc(100dvh-76px))] overflow-y-auto custom-scrollbar",
          // شاشات أكبر: قائمة منسدلة من الجرس
          "sm:absolute sm:inset-x-auto sm:top-full sm:mt-2.5 sm:left-0 sm:w-[360px] sm:max-h-[380px]",
          "bg-card border shadow-2xl rounded-2xl transition-all duration-200 origin-top",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-black text-brand-blue dark:text-foreground">الإشعارات</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
              {unreadCount} جديد
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
            لا توجد إشعارات بعد
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleItemClick(n) }}
                className={cn(
                  "px-4 py-3 flex flex-col gap-1 hover:bg-muted/70 transition-colors cursor-pointer text-right outline-none focus-visible:bg-muted",
                  !n.is_read && "bg-brand-orange/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("text-xs leading-relaxed", !n.is_read ? "font-black text-foreground" : "font-bold text-foreground/80")}>
                    {n.title}
                  </span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0 mt-1" />}
                </div>
                {/* نبذة عن الإشعار */}
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                <span className="text-[10px] text-muted-foreground/70">{timeAgo(n.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
