"use client"

import { useState } from "react"
import { MessageCircle, Phone, Send, Globe, X, HeadphonesIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppSettings {
  whatsapp_number?: string
  support_phone?: string
  telegram_link?: string
  facebook_link?: string
}

export function FloatingContactButton({ settings }: { settings: AppSettings | null }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!settings) return null

  const hasAnyContact = 
    settings.whatsapp_number || 
    settings.support_phone || 
    settings.telegram_link || 
    settings.facebook_link

  if (!hasAnyContact) return null

  // Function to format whatsapp link
  const getWhatsappLink = (number: string) => {
    // Remove all non-numeric characters except +
    const cleanNumber = number.replace(/[^\d+]/g, '')
    return `https://wa.me/${cleanNumber.replace('+', '')}`
  }

  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {/* Floating Menu Items */}
      <div 
        className={cn(
          "flex flex-col gap-3 transition-all duration-300 origin-bottom right-0",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        {settings.whatsapp_number && (
          <a
            href={getWhatsappLink(settings.whatsapp_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors group"
            title="تواصل عبر واتساب"
          >
            <span className="text-sm font-bold opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              واتساب
            </span>
            <div className="bg-emerald-500 p-2 rounded-full text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
          </a>
        )}

        {settings.telegram_link && (
          <a
            href={settings.telegram_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors group"
            title="تواصل عبر تليكرام"
          >
            <span className="text-sm font-bold opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              تليكرام
            </span>
            <div className="bg-blue-500 p-2 rounded-full text-white">
              <Send className="w-5 h-5" />
            </div>
          </a>
        )}

        {settings.facebook_link && (
          <a
            href={settings.facebook_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors group"
            title="صفحتنا على فيسبوك"
          >
            <span className="text-sm font-bold opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              فيسبوك
            </span>
            <div className="bg-blue-700 p-2 rounded-full text-white">
              <Globe className="w-5 h-5" />
            </div>
          </a>
        )}

        {settings.support_phone && (
          <a
            href={`tel:${settings.support_phone}`}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-brand-orange/10 transition-colors group"
            title="اتصال هاتفي"
          >
            <span className="text-sm font-bold opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              اتصال مباشر
            </span>
            <div className="bg-brand-orange p-2 rounded-full text-white">
              <Phone className="w-5 h-5" />
            </div>
          </a>
        )}
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 focus:outline-none hover:scale-105 active:scale-95",
          isOpen ? "bg-slate-800 text-white rotate-90" : "bg-brand-blue text-white animate-bounce-subtle"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <HeadphonesIcon className="w-7 h-7" />}
      </button>
    </div>
  )
}
