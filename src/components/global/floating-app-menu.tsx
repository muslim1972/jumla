"use client"

import { useState, useEffect, useTransition } from "react"
import { Menu, X, ShoppingCart, LogOut, LogIn, LayoutDashboard, UserCheck, HeadphonesIcon, Moon, Sun, Wallet, PackagePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useFloatingMenu } from "@/components/global/floating-menu-provider"
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
  const [mounted, setMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-close menu when clicking outside or after 5 seconds of inactivity
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest('.floating-app-menu-container')) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Auto-close timeout (5 seconds)
    let timeoutId: NodeJS.Timeout;
    if (isOpen && !isHovered) {
      timeoutId = setTimeout(() => {
        setOpenMenu(null);
      }, 5000);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, isHovered, setOpenMenu]);

  // The early return was causing a React Hooks mismatch error, moving it down.

  const handleSignOut = () => {
    // إطلاق حدث مخصص لإغلاق أي نوافذ مفتوحة (مثل الصفحة الشخصية)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event('user-logout'))
    }
    startTransition(() => {
      signOut()
    })
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  // Build the animation sequence
  const sequence: { Icon: any, color?: string }[] = [
    { Icon: Menu }, // ثلاث خطوط
    fullName ? { Icon: LogOut } : { Icon: LogIn }, // تسجيل الخروج
    { Icon: ShoppingCart }, // السلة
    { Icon: mounted && theme === 'light' ? Moon : Sun } // المظهر (معتمد على mounted لمنع الـ Hydration error)
  ]

  // Cycle icons every 2.5 seconds
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

  if (isHidden) return null;

  return (
    <div 
      className="relative flex flex-col items-end pointer-events-auto floating-app-menu-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating Menu Items */}
      <div 
        className={cn(
          "absolute top-full mt-2.5 flex flex-col items-end gap-2 transition-all duration-300 origin-top left-0",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 -translate-y-5 pointer-events-none"
        )}
      >
        {/* Dashboard Links based on Role */}
        {userRole === 'merchant' && (
          <Link
            href="/dashboard"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-muted transition-colors group"
            title="لوحة التاجر"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap">
              <span className="text-[11px] font-black">لوحة التاجر</span>
            </span>
            <div className="bg-primary/20 p-1 rounded-full text-primary shrink-0">
              <LayoutDashboard className="w-4 h-4" />
            </div>
          </Link>
        )}

        {userRole === 'admin' && (
          <Link
            href="/admin"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-muted transition-colors group"
            title="لوحة الإدارة"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap">
              <span className="text-[11px] font-black">لوحة الإدارة</span>
            </span>
            <div className="bg-brand-orange/20 p-1 rounded-full text-brand-orange shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
          </Link>
        )}

        {userRole === 'materials' && (
          <Link
            href="/materials"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-muted transition-colors group"
            title="إدارة المواد"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap">
              <span className="text-[11px] font-black">إدارة المواد</span>
            </span>
            <div className="bg-brand-blue/20 p-1 rounded-full text-brand-blue shrink-0">
              <PackagePlus className="w-4 h-4" />
            </div>
          </Link>
        )}

        {userRole === 'support' && (
          <Link
            href="/support"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-muted transition-colors group"
            title="لوحة الدعم"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap">
              <span className="text-[11px] font-black">لوحة الدعم</span>
            </span>
            <div className="bg-blue-500/20 p-1 rounded-full text-blue-500 shrink-0">
              <HeadphonesIcon className="w-4 h-4" />
            </div>
          </Link>
        )}

        {/* Wallet Link (Available to all logged-in users) */}
        {userRole && (
          <Link
            href="/wallet"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-muted transition-colors group"
            title="المحفظة"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap">
              <span className="text-[11px] font-black">المحفظة</span>
            </span>
            <div className="bg-green-500/20 p-1 rounded-full text-green-600 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </Link>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-muted transition-colors group"
          title="الوضع الليلي/النهاري"
          suppressHydrationWarning
        >
          <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap">
            <span className="text-[11px] font-black" suppressHydrationWarning>
              {mounted && theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}
            </span>
          </span>
          <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-full text-foreground shrink-0" suppressHydrationWarning>
            {mounted && theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </div>
        </button>

        {/* Debts */}
        {(!userRole || !['admin', 'merchant', 'delivery', 'support'].includes(userRole)) && (
          <Link
            href="/debts"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-destructive/10 transition-colors group"
            title="الديون والتسديد"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap text-destructive">
              <span className="text-[11px] font-black">الديون</span>
            </span>
            <div className="bg-destructive/10 p-1 rounded-full text-destructive shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </Link>
        )}

        {/* Cart */}
        {(!userRole || !['admin', 'merchant', 'delivery', 'support'].includes(userRole)) && (
          <Link
            href="/cart"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-brand-orange/10 transition-colors group"
            title="سلة المشتريات"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap text-brand-orange">
              <span className="text-[11px] font-black">السلة</span>
            </span>
            <div className="bg-brand-orange p-1 rounded-full text-white shrink-0 relative">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-background">
                  {cartCount}
                </span>
              )}
            </div>
          </Link>
        )}

        {/* Auth (Login/Logout) */}
        {fullName ? (
          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group text-red-500 disabled:opacity-50"
            title="تسجيل الخروج"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap">
              <span className="text-[11px] font-black">{isPending ? "جاري الخروج..." : "تسجيل الخروج"}</span>
            </span>
            <div className="bg-red-100 dark:bg-red-500/20 p-1 rounded-full text-red-500 shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
          </button>
        ) : (
          <Link
            href="/login"
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-full shadow-lg border hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group text-emerald-600"
            title="تسجيل الدخول"
          >
            <span className="flex flex-col items-start opacity-0 group-hover:opacity-100 w-0 overflow-hidden group-hover:w-auto group-hover:pl-1.5 transition-all duration-300 whitespace-nowrap">
              <span className="text-[11px] font-black">تسجيل الدخول</span>
            </span>
            <div className="bg-emerald-100 dark:bg-emerald-500/20 p-1 rounded-full text-emerald-600 shrink-0">
              <LogIn className="w-4 h-4" />
            </div>
          </Link>
        )}
      </div>

      {/* Main Toggle Button (غلاف خارجي حتى لا تُقص شارة العدد بـ overflow-hidden) */}
      <div className="relative pointer-events-auto">
        <button
          onClick={() => setOpenMenu(isOpen ? null : 'app')}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-full shadow-md transition-all duration-500 focus:outline-none hover:scale-105 active:scale-95 relative overflow-hidden",
            isOpen ? "bg-slate-800 text-white rotate-90" : "bg-primary text-white"
          )}
        >
          <div className="absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300">
            {isOpen ? (
              <X className="w-4 h-4 animate-in zoom-in duration-300" />
            ) : (
              <ActiveIcon
                key={activeIconIndex}
                className={cn("w-5 h-5 animate-in zoom-in spin-in-12 duration-500", ActiveIconInfo.color)}
              />
            )}
          </div>
        </button>

        {/* شارة عدد عناصر السلة — خارج الزر لضمان ظهورها كاملة */}
        {cartCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -right-1.5 z-20 bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-background shadow-sm pointer-events-none">
            {cartCount > 9 ? "+9" : cartCount}
          </span>
        )}
      </div>
    </div>
  )
}
