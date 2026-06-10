"use client"

import Link from "next/link"
import { useState } from "react"

export function FloatingTopRight({
  userRole,
  fullName
}: {
  userRole?: string | null
  fullName?: string | null
}) {
  const [showUnderDev, setShowUnderDev] = useState(false)

  return (
    <div className="fixed top-4 right-4 z-[100] flex items-center gap-3">
      {/* اسم المستخدم قابل للنقر */}
      <div className="relative">
        <button
          onClick={() => setShowUnderDev(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-full text-[10px] sm:text-xs font-bold border shadow-lg transition-all hover:bg-muted hover:scale-105 active:scale-95"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
          <span className="truncate max-w-[80px] sm:max-w-none">
            {fullName ? fullName : "زائر"}
            {userRole === 'merchant' && <span className="mr-1 text-primary hidden sm:inline">(تاجر)</span>}
          </span>
        </button>

        {showUnderDev && (
          <div className="absolute top-full right-0 mt-2 w-40 p-3 bg-foreground text-background text-sm font-bold rounded-xl shadow-xl text-center animate-in fade-in slide-in-from-top-2">
            تحت التطوير 🚧
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setShowUnderDev(false)
              }}
              className="block w-full mt-2 text-xs text-muted/80 hover:text-background"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>

      {/* شعار جملتي العائم */}
      <Link href="/" className="flex items-center group transition-transform hover:scale-105 active:scale-95 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-lg">
        <span className="font-black text-xl tracking-tighter text-gradient">جملتي</span>
      </Link>
    </div>
  )
}
