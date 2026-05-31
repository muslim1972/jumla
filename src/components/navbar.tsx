"use client"

import Link from "next/link"
import { ShoppingCart, User, PackageOpen, LayoutDashboard, LogOut, UserCheck } from "lucide-react"
import { ModeToggle } from "./mode-toggle"
import { buttonVariants } from "./ui/button"
import { signOut } from "@/app/(auth)/actions"

export function Navbar({ 
  userRole, 
  fullName,
  cartCount = 0
}: { 
  userRole?: string | null,
  fullName?: string | null,
  cartCount?: number
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b glass transition-all duration-300">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105 active:scale-95">
            <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-all duration-300 shadow-inner">
              <PackageOpen className="h-6 w-6 text-primary animate-in zoom-in duration-500" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-gradient">جملتي</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-[10px] sm:text-xs font-bold border border-border/50 shadow-sm transition-all hover:bg-muted">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="truncate max-w-[80px] sm:max-w-none">
              {fullName ? fullName : "زائر"}
              {userRole === 'merchant' && <span className="mr-1 text-primary hidden sm:inline">(تاجر)</span>}
            </span>
          </div>

          <ModeToggle />
          
          {userRole === 'merchant' && (
            <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" }) + " rounded-full"}>
              <LayoutDashboard className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline-block">لوحة التاجر</span>
            </Link>
          )}

          {userRole === 'admin' && (
            <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" }) + " rounded-full text-brand-orange hover:text-brand-orange hover:bg-brand-orange/10"}>
              <UserCheck className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline-block">لوحة الإدارة</span>
            </Link>
          )}

          {userRole === 'support' && (
            <Link href="/support" className={buttonVariants({ variant: "ghost", size: "sm" }) + " rounded-full text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"}>
              <UserCheck className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline-block">لوحة الدعم</span>
            </Link>
          )}

          <Link href="/cart" className={buttonVariants({ variant: "outline", size: "sm" }) + " relative rounded-full group hover:border-primary/50"}>
            <ShoppingCart className="h-4 w-4 sm:ml-2 group-hover:text-primary transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-black shadow-lg animate-in zoom-in duration-300">
                {cartCount}
              </span>
            )}
            <span className="hidden sm:inline-block">السلة</span>
          </Link>

          {fullName ? (
            <form action={signOut}>
              <button type="submit" className={buttonVariants({ variant: "default", size: "sm" }) + " rounded-full shadow-lg shadow-primary/20"}>
                <LogOut className="h-4 w-4 sm:ml-2" />
                <span className="hidden sm:inline-block">خروج</span>
              </button>
            </form>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "default", size: "sm" }) + " rounded-full shadow-lg shadow-primary/20"}>
              <User className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline-block">الدخول</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
