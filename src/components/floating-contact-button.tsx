"use client"

import { useState, useEffect } from "react"
import { Phone, MessageCircle, Send, Globe, X, PhoneCall } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFloatingMenu } from "@/components/floating-menu-provider"

export function FloatingContactButton({ settings }: { settings: any }) {
  const { openMenu, setOpenMenu } = useFloatingMenu()
  const isOpen = openMenu === 'contact'
  const isHidden = openMenu !== null && openMenu !== 'contact'
  
  const [activeIconIndex, setActiveIconIndex] = useState(0)

  // Hide the button entirely if another menu is open
  if (isHidden) return null;

  if (!settings) return null

  const hasAnyContact = 
    settings.whatsapp_number || 
    settings.support_phone || 
    settings.telegram_link || 
    settings.facebook_link

  if (!hasAnyContact) return null

  // Function to format whatsapp link
  const getWhatsappLink = (number: string) => {
    const cleanNumber = number.replace(/[^\d+]/g, '')
    return `https://wa.me/${cleanNumber.replace('+', '')}`
  }

  // Build the animation sequence (Phone -> App -> Phone -> App...)
  const sequence: { Icon: any, color?: string }[] = []
  const baseIcon = { Icon: PhoneCall }
  
  if (settings.whatsapp_number) {
    sequence.push(baseIcon)
    sequence.push({ Icon: MessageCircle, color: "text-emerald-400" })
  }
  if (settings.facebook_link) {
    sequence.push(baseIcon)
    sequence.push({ Icon: Globe, color: "text-blue-300" })
  }
  if (settings.telegram_link) {
    sequence.push(baseIcon)
    sequence.push({ Icon: Send, color: "text-blue-300" })
  }
  if (settings.support_phone) {
    sequence.push(baseIcon)
    sequence.push({ Icon: Phone, color: "text-brand-orange" })
  }
  
  if (sequence.length === 0) sequence.push(baseIcon)

  // Cycle icons every 2 seconds
  useEffect(() => {
    if (isOpen || sequence.length <= 1) {
      setActiveIconIndex(0) // Reset to base when open
      return
    }
    const interval = setInterval(() => {
      setActiveIconIndex((prev) => (prev + 1) % sequence.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isOpen, sequence.length])

  const ActiveIconInfo = sequence[activeIconIndex]
  const ActiveIcon = ActiveIconInfo.Icon

  return (
    <div className="relative flex flex-col items-end pointer-events-auto">
      {/* Floating Menu Items */}
      <div 
        className={cn(
          "absolute bottom-full mb-3 flex flex-col items-end gap-3 transition-all duration-300 origin-bottom left-0",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        {settings.whatsapp_number && (
          <a
            href={getWhatsappLink(settings.whatsapp_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors group"
            title="تواصل عبر واتساب"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">واتساب</span>
              <span className="text-xs text-muted-foreground font-sans" dir="ltr">{settings.whatsapp_number}</span>
            </span>
            <div className="bg-emerald-500 p-2 rounded-full text-white shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
          </a>
        )}

        {settings.telegram_link && (
          <a
            href={settings.telegram_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
            title="تواصل عبر تليكرام"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">تليكرام</span>
            </span>
            <div className="bg-blue-500 p-2 rounded-full text-white shrink-0">
              <Send className="w-5 h-5" />
            </div>
          </a>
        )}

        {settings.facebook_link && (
          <a
            href={settings.facebook_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
            title="صفحتنا على فيسبوك"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">فيسبوك</span>
            </span>
            <div className="bg-blue-700 p-2 rounded-full text-white shrink-0">
              <Globe className="w-5 h-5" />
            </div>
          </a>
        )}

        {settings.support_phone && (
          <a
            href={`tel:${settings.support_phone}`}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors group"
            title="اتصال هاتفي"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">اتصال مباشر</span>
              <span className="text-xs text-muted-foreground font-sans" dir="ltr">{settings.support_phone}</span>
            </span>
            <div className="bg-brand-orange p-2 rounded-full text-white shrink-0">
              <Phone className="w-5 h-5" />
            </div>
          </a>
        )}
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={() => setOpenMenu(isOpen ? null : 'contact')}
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-500 focus:outline-none hover:scale-105 active:scale-95 relative overflow-hidden",
          isOpen ? "bg-slate-800 text-white rotate-90" : "bg-brand-blue text-white"
        )}
      >
        <div className="absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300">
          {isOpen ? (
            <X className="w-6 h-6 animate-in zoom-in duration-300" />
          ) : (
            <ActiveIcon 
              key={activeIconIndex} 
              className={cn("w-7 h-7 animate-in zoom-in spin-in-12 duration-500", ActiveIconInfo.color)} 
            />
          )}
        </div>
      </button>
    </div>
  )
}
