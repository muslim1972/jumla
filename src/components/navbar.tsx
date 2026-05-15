"use client"

import Link from "next/link"
import { ShoppingCart, User, PackageOpen, LayoutDashboard, LogOut } from "lucide-react"
import { ModeToggle } from "./mode-toggle"
import { buttonVariants } from "./ui/button"
import { signOut } from "@/app/(auth)/actions"

export function Navbar({ 
  userRole, 
  fullName 
}: { 
  userRole?: string | null,
  fullName?: string | null
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
              <PackageOpen className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight">جملة</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-muted/50 rounded-full text-[10px] sm:text-xs font-medium border border-border/50">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="truncate max-w-[80px] sm:max-w-none">
              {fullName ? fullName : "زائر"}
              {userRole === 'merchant' && <span className="mr-1 text-primary hidden sm:inline">(تاجر)</span>}
            </span>
          </div>

          <ModeToggle />
          
          {userRole === 'merchant' && (
            <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <LayoutDashboard className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline-block">لوحة التاجر</span>
            </Link>
          )}

          <Link href="/cart" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ShoppingCart className="h-4 w-4 sm:ml-2" />
            <span className="hidden sm:inline-block">السلة</span>
          </Link>

          {fullName ? (
            <form action={signOut}>
              <button type="submit" className={buttonVariants({ variant: "default", size: "sm" })}>
                <LogOut className="h-4 w-4 sm:ml-2" />
                <span className="hidden sm:inline-block">خروج</span>
              </button>
            </form>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "default", size: "sm" })}>
              <User className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline-block">الدخول</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
