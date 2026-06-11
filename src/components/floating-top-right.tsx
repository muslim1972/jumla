"use client"

import Link from "next/link"
import { useState } from "react"
import { UserProfileModal } from "@/components/user-profile-modal"

export function FloatingTopRight({
  userRole,
  fullName
}: {
  userRole?: string | null
  fullName?: string | null
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  return (
    <>
      {/* اسم المستخدم قابل للنقر (في اليسار) */}
      <div className="fixed top-4 left-4 z-[100] flex items-center">
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-full text-[10px] sm:text-xs font-bold border shadow-lg transition-all hover:bg-muted hover:scale-105 active:scale-95"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="truncate max-w-[80px] sm:max-w-none">
              {fullName ? fullName : "زائر"}
              {userRole === 'merchant' && <span className="mr-1 text-primary hidden sm:inline">(تاجر)</span>}
            </span>
          </button>
        </div>
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
