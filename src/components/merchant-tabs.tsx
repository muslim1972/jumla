"use client"

import { usePathname, useRouter } from "next/navigation"
import { Package, Receipt, Inbox, Truck, Archive as ArchiveIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTransition, useState } from "react"

export function MerchantTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingTab, setPendingTab] = useState<string | null>(null)

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
      name: "الأرشيف",
      href: "/dashboard/archive",
      icon: ArchiveIcon
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
            const isTabPending = isPending && pendingTab === tab.href

            return (
              <button 
                key={tab.href}
                onClick={() => {
                  if (isActive) return;
                  setPendingTab(tab.href);
                  startTransition(() => {
                    router.push(tab.href);
                  });
                }}
                disabled={isPending}
                className={cn(
                  "flex items-center gap-2 pb-3 px-1 border-b-2 font-bold text-sm transition-colors whitespace-nowrap outline-none",
                  isActive 
                    ? "border-brand-orange text-brand-orange" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  isTabPending && "opacity-70",
                  isPending && !isTabPending && "opacity-50 cursor-not-allowed"
                )}
              >
                {isTabPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {tab.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
