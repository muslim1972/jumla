"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Package, Receipt, Inbox, Truck } from "lucide-react"
import { cn } from "@/lib/utils"

export function MerchantTabs() {
  const pathname = usePathname()

  const tabs = [
    {
      name: "المنتجات والإعدادات",
      href: "/dashboard",
      icon: Package
    },
    {
      name: "الطلبات الواردة",
      href: "/dashboard/orders",
      icon: Inbox
    },
    {
      name: "التحاسب مع التطبيق",
      href: "/dashboard/billing",
      icon: Receipt
    },
    {
      name: "تحاسب المندوبين",
      href: "/dashboard/delivery-billing",
      icon: Truck
    }
  ]

  return (
    <div className="bg-background border-b border-border/40">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex gap-6 pt-4 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.href === "/dashboard" 
              ? pathname === "/dashboard"
              : pathname.includes(tab.href)
              
            const Icon = tab.icon

            return (
              <Link 
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 pb-3 px-1 border-b-2 font-bold text-sm transition-colors whitespace-nowrap",
                  isActive 
                    ? "border-brand-orange text-brand-orange" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
