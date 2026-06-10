"use client"

import { useState } from "react"
import { Menu, X, ShoppingCart, LogOut, LogIn, LayoutDashboard, UserCheck, HeadphonesIcon, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useTheme } from "next-themes"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export function FloatingAppMenu({
  userRole,
  cartCount = 0
}: {
  userRole?: string | null
  cartCount?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <div className="fixed bottom-[110px] sm:bottom-[100px] left-4 sm:left-6 z-[100] flex flex-col items-start gap-3">
      {/* Floating Menu Items */}
      <div 
        className={cn(
          "flex flex-col gap-3 transition-all duration-300 origin-bottom left-0",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        {/* Dashboard Links based on Role */}
        {userRole === 'merchant' && (
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-muted transition-colors group flex-row-reverse"
            title="لوحة التاجر"
          >
            <span className="flex flex-col items-end opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pr-2 transition-all duration-300 whitespace-nowrap">
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
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-muted transition-colors group flex-row-reverse"
            title="لوحة الإدارة"
          >
            <span className="flex flex-col items-end opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pr-2 transition-all duration-300 whitespace-nowrap">
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
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-muted transition-colors group flex-row-reverse"
            title="لوحة الدعم"
          >
            <span className="flex flex-col items-end opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pr-2 transition-all duration-300 whitespace-nowrap">
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
          className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-muted transition-colors group flex-row-reverse"
          title="الوضع الليلي/النهاري"
        >
          <span className="flex flex-col items-end opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pr-2 transition-all duration-300 whitespace-nowrap">
            <span className="text-sm font-bold">{theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}</span>
          </span>
          <div className="bg-slate-200 dark:bg-slate-700 p-2 rounded-full text-foreground shrink-0">
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
        </button>

        {/* Cart */}
        <Link
          href="/cart"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-brand-orange/10 transition-colors group flex-row-reverse"
          title="سلة المشتريات"
        >
          <span className="flex flex-col items-end opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pr-2 transition-all duration-300 whitespace-nowrap text-brand-orange">
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
        {userRole && userRole !== 'guest' ? (
          <button
            onClick={() => {
              handleSignOut()
              setIsOpen(false)
            }}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group flex-row-reverse text-red-500"
            title="تسجيل الخروج"
          >
            <span className="flex flex-col items-end opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pr-2 transition-all duration-300 whitespace-nowrap">
              <span className="text-sm font-bold">تسجيل الخروج</span>
            </span>
            <div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full text-red-500 shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
          </button>
        ) : (
          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 bg-white dark:bg-card p-3 rounded-full shadow-lg border hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group flex-row-reverse text-emerald-600"
            title="تسجيل الدخول"
          >
            <span className="flex flex-col items-end opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pr-2 transition-all duration-300 whitespace-nowrap">
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
        onClick={() => setIsOpen(!isOpen)}
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
              <Menu className="w-7 h-7 animate-in zoom-in spin-in-12 duration-500" />
              {cartCount > 0 && !isOpen && (
                <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-[10px] font-bold w-3 h-3 rounded-full border border-background"></span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
