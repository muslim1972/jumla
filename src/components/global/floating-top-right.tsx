"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { FloatingContactButton } from "@/components/global/floating-contact-button"
import { FloatingAppMenu } from "@/components/global/floating-app-menu"

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
      {/* اسم المستخدم والأزرار العائمة (في اليسار) */}
      <div className="fixed top-4 left-4 z-[100] flex items-center gap-1.5 sm:gap-2 pointer-events-none">
        <div className="relative pointer-events-auto">
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-full text-[10px] sm:text-xs font-bold border shadow-lg transition-all hover:bg-muted hover:scale-105 active:scale-95"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="truncate max-w-[80px] sm:max-w-none">
              {fullName ? fullName : "زائر"}
              {userRole === 'merchant' && <span className="mr-1 text-primary hidden sm:inline">(تاجر)</span>}
            </span>
          </button>
        </div>

        <FloatingContactButton settings={settings} />
        <FloatingAppMenu userRole={userRole} fullName={fullName} cartCount={cartCount} />
      </div>

      <UserProfileModal 
        isOpen={isProfileOpen} 
        setIsOpen={setIsProfileOpen} 
        userRole={userRole} 
        fullName={fullName} 
      />

      {/* شعار جملتي العائم (في اليمين) */}
      <div className="fixed top-4 right-4 z-[100] flex items-center">
        <Link href="/" className="flex items-center group transition-transform hover:scale-105 active:scale-95 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-lg">
          <span className="font-black text-xl tracking-tighter text-gradient">جملتي</span>
        </Link>
      </div>
    </>
  )
}
