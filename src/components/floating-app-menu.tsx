"use client"

import { useState, useEffect, useTransition } from "react"
import { Menu, X, ShoppingCart, LogOut, LogIn, LayoutDashboard, UserCheck, HeadphonesIcon, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useFloatingMenu } from "@/components/floating-menu-provider"
import { signOut } from "@/app/(auth)/actions"

export function FloatingAppMenu({
  userRole,
  fullName,
  cartCount = 0
}: {
  userRole?: string | null
  fullName?: string | null
  cartCount?: number
}) {
  const { openMenu, setOpenMenu } = useFloatingMenu()
  const isOpen = openMenu === 'app'
  const isHidden = openMenu !== null && openMenu !== 'app'
  
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [activeIconIndex, setActiveIconIndex] = useState(0)
  const [isPending, startTransition] = useTransition()

  // The early return was causing a React Hooks mismatch error, moving it down.

  const handleSignOut = () => {
    startTransition(() => {
      signOut()
    })
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  // Build the animation sequence
  const sequence: { Icon: any, color?: string }[] = [
    { Icon: Menu }, // Default
    { Icon: ShoppingCart, color: "text-brand-orange" },
    { Icon: theme === 'light' ? Moon : Sun, color: "text-slate-200" },
    fullName 
      ? { Icon: LogOut, color: "text-red-400" } 
      : { Icon: LogIn, color: "text-emerald-400" }
  ]

  // Cycle icons every 2.5 seconds
  useEffect(() => {
    if (isOpen || sequence.length <= 1) {
      setActiveIconIndex(0) // Reset to base when open
      return
    }
    const interval = setInterval(() => {
      setActiveIconIndex((prev) => (prev + 1) % sequence.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [isOpen, sequence.length])

  const ActiveIconInfo = sequence[activeIconIndex]
  const ActiveIcon = ActiveIconInfo.Icon

  if (isHidden) return null;

  return (
    <div className="relative flex flex-col items-end pointer-events-auto">
      {/* Floating Menu Items */}
      <div 
        className={cn(
          "absolute bottom-full mb-3 flex flex-col items-end gap-3 transition-all duration-300 origin-bottom left-0",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        {/* Dashboard Links based on Role */}
        {userRole === 'merchant' && (
          <Link
            href="/dashboard"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-muted transition-colors group"
            title="لوحة التاجر"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">لوحة التاجر</span>
            </span>
            <div className="bg-primary/20 p-2 rounded-full text-primary shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
          </Link>
        )}

        {userRole === 'admin' && (
          <Link
            href="/admin"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-muted transition-colors group"
            title="لوحة الإدارة"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">لوحة الإدارة</span>
            </span>
            <div className="bg-brand-orange/20 p-2 rounded-full text-brand-orange shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
          </Link>
        )}

        {userRole === 'support' && (
          <Link
            href="/support"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-muted transition-colors group"
            title="لوحة الدعم"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">لوحة الدعم</span>
            </span>
            <div className="bg-blue-500/20 p-2 rounded-full text-blue-500 shrink-0">
              <HeadphonesIcon className="w-5 h-5" />
            </div>
          </Link>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-muted transition-colors group"
          title="الوضع الليلي/النهاري"
        >
          <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
            <span className="text-sm font-bold">{theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}</span>
          </span>
          <div className="bg-slate-200 dark:bg-slate-700 p-2 rounded-full text-foreground shrink-0">
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
        </button>

        {/* Cart */}
        <Link
          href="/cart"
          onClick={() => setOpenMenu(null)}
          className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-brand-orange/10 transition-colors group"
          title="سلة المشتريات"
        >
          <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap text-brand-orange">
            <span className="text-sm font-bold">السلة</span>
          </span>
          <div className="bg-brand-orange p-2 rounded-full text-white shrink-0 relative">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-background">
                {cartCount}
              </span>
            )}
          </div>
        </Link>

        {/* Auth (Login/Logout) */}
        {fullName ? (
          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group text-red-500 disabled:opacity-50"
            title="تسجيل الخروج"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">{isPending ? "جاري الخروج..." : "تسجيل الخروج"}</span>
            </span>
            <div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full text-red-500 shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
          </button>
        ) : (
          <Link
            href="/login"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group text-emerald-600"
            title="تسجيل الدخول"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">تسجيل الدخول</span>
            </span>
            <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-full text-emerald-600 shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
          </Link>
        )}
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={() => setOpenMenu(isOpen ? null : 'app')}
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-500 focus:outline-none hover:scale-105 active:scale-95 relative overflow-hidden",
          isOpen ? "bg-slate-800 text-white rotate-90" : "bg-primary text-white"
        )}
      >
        <div className="absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300">
          {isOpen ? (
            <X className="w-6 h-6 animate-in zoom-in duration-300" />
          ) : (
            <div className="relative">
              <ActiveIcon 
                key={activeIconIndex} 
                className={cn("w-7 h-7 animate-in zoom-in spin-in-12 duration-500", ActiveIconInfo.color)} 
              />
              {cartCount > 0 && !isOpen && activeIconIndex === 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-[10px] font-bold w-3 h-3 rounded-full border border-background"></span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
