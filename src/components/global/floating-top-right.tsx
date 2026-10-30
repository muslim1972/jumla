"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { FloatingAppMenu } from "@/components/global/floating-app-menu"
import { NotificationCenter } from "@/components/global/notification-center"
import { cn } from "@/lib/utils"

// تحميل المودال الثقيل ديناميكياً (يُعرض عبر Portal — بدون إزاحة في التخطيط)
const UserProfileModal = dynamic(
  () => import("@/features/user/components/user-profile-modal").then((mod) => mod.UserProfileModal),
  { ssr: false }
)

export function FloatingTopRight({
  userRole,
  fullName,
  settings,
  cartCount
}: {
  userRole?: string | null
  fullName?: string | null
  settings?: any
  cartCount?: number
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const router = useRouter()

  const handleProfileClick = () => {
    // If there is no fullName and role is empty/guest, they are a guest
    if (!fullName && (!userRole || userRole === 'guest')) {
      router.push('/register')
    } else {
      setIsProfileOpen(true)
    }
  }

  return (
    <>
      {/* الشريط العلوي الموحد فائق الرشاقة (السطر الأول المتكامل) */}
      <header className="fixed top-2 sm:top-3 inset-x-2 sm:inset-x-4 z-[100] flex items-center justify-between pointer-events-none">
        
        {/* أقصى اليمين: زر جملتي + اسم المتجر مباشرة إلى يساره */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <Link 
            href="/" 
            className="flex items-center group transition-transform hover:scale-105 active:scale-95 bg-background/95 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm"
          >
            <span className="font-black text-lg sm:text-xl tracking-tighter text-gradient">جملتي</span>
          </Link>

          <button
            onClick={handleProfileClick}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-background/95 backdrop-blur-md rounded-full text-[11px] sm:text-xs font-bold border shadow-sm transition-all hover:bg-muted hover:scale-105 active:scale-95"
            title="الملف الشخصي وإعدادات الحساب"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse shrink-0" />
            <span className="truncate max-w-[85px] sm:max-w-none">
              {fullName ? fullName : "زائر"}
              {userRole === 'merchant' && <span className="mr-1 text-primary hidden sm:inline">(تاجر)</span>}
            </span>
          </button>
        </div>

        {/* الوسط / مائل لليسار قليلاً: شارة التوصيل المجاني 0 د.ع */}
        <div className="flex items-center pointer-events-auto mx-1">
          <span className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-black shadow-2xs backdrop-blur-md whitespace-nowrap">
            🎁 توصيل 0 د.ع مجاني
          </span>
        </div>

        {/* أقصى اليسار: الزر البرتقالي للقائمة المنسدلة المدمجة */}
        <div className="flex items-center pointer-events-auto">
          <FloatingAppMenu 
            userRole={userRole} 
            fullName={fullName} 
            cartCount={cartCount} 
            settings={settings}
          />
        </div>

      </header>

      {/* جرس الإشعارات العائم في الركن السفلي الأيسر (يرتفع تلقائياً فوق شريط السلة) */}
      <div 
        className={cn(
          "fixed left-3 sm:left-4 z-[90] pointer-events-auto transition-all duration-300",
          cartCount && cartCount > 0 ? "bottom-20 sm:bottom-24" : "bottom-5 sm:bottom-6"
        )}
      >
        <NotificationCenter />
      </div>

      <UserProfileModal 
        isOpen={isProfileOpen} 
        setIsOpen={setIsProfileOpen} 
        userRole={userRole} 
        fullName={fullName} 
      />
    </>
  )
}
