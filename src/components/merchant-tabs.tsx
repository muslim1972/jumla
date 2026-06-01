"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Package, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

export function MerchantTabs() {
  const pathname = usePathname()

  return (
    <div className="bg-background border-b border-border/40">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex gap-4 pt-4 overflow-x-auto no-scrollbar">
          <Link 
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 pb-3 px-1 border-b-2 font-bold text-sm transition-colors whitespace-nowrap",
              pathname === "/dashboard" 
                ? "border-brand-orange text-brand-orange" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Package className="w-4 h-4" />
            المنتجات والإعدادات
          </Link>
          <Link 
            href="/dashboard/billing"
            className={cn(
              "flex items-center gap-2 pb-3 px-1 border-b-2 font-bold text-sm transition-colors whitespace-nowrap",
              pathname.includes("/dashboard/billing") 
                ? "border-brand-orange text-brand-orange" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <DollarSign className="w-4 h-4" />
            التحاسب والفواتير
          </Link>
        </div>
      </div>
    </div>
  )
}
