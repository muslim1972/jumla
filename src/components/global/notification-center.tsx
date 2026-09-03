"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
    load()

    // تحديث لحظي: أي إشعار جديد يصل لأي حساب يظهر فوراً
    const supabase = createClient()
    const channel = supabase
      .channel("notification_center_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        load()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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

  return (
    <div className="relative pointer-events-auto" ref={containerRef}>
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
          "absolute top-full mt-2.5 left-0 w-[300px] sm:w-[360px] max-h-[380px] overflow-y-auto custom-scrollbar",
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
                className={cn(
                  "px-4 py-3 flex flex-col gap-1 hover:bg-muted/40 transition-colors",
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
