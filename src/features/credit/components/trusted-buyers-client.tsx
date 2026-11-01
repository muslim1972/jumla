"use client"

import { useState, useEffect } from "react"
import { getTrustedBuyers, searchBuyers, addTrustedBuyer, removeTrustedBuyer } from "../actions"
import { Button } from "@/components/ui/button"
import { UserCheck, UserX, Search, Loader2, Store, Phone } from "lucide-react"
import { AutocompleteSearch } from "@/components/global/autocomplete-search"

type Buyer = {
  id: string
  full_name: string
  store_name: string
  phone: string
}

export function TrustedBuyersClient({ merchantId }: { merchantId: string }) {
  const [trustedBuyers, setTrustedBuyers] = useState<Buyer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  useEffect(() => {
    loadTrustedBuyers()
  }, [])

  async function loadTrustedBuyers() {
    setIsLoading(true)
    const { buyers, error } = await getTrustedBuyers(merchantId)
    if (!error && buyers) {
      setTrustedBuyers(buyers)
    }
    setIsLoading(false)
  }

  async function handleSearch(query: string) {
    const { buyers } = await searchBuyers(merchantId, query)
    return buyers || []
  }

  async function handleAdd(buyerId: string, closeDropdown: () => void) {
    setIsAdding(buyerId)
    const { success, error } = await addTrustedBuyer(merchantId, buyerId)
    if (error) {
      alert(error)
    } else {
      await loadTrustedBuyers()
      closeDropdown()
    }
    setIsAdding(null)
  }

  async function handleRemove(buyerId: string) {
    if (!confirm("هل أنت متأكد من إزالة هذا المشتري من قائمة الثقات؟ لن يتمكن من الشراء بالآجل بعد الآن.")) return
    
    setIsRemoving(buyerId)
    const { success, error } = await removeTrustedBuyer(merchantId, buyerId)
    if (error) {
      alert(error)
    } else {
      await loadTrustedBuyers()
    }
    setIsRemoving(null)
  }

  return (
    <div className="px-2 sm:px-4 py-2 sm:py-3.5 space-y-2.5 sm:space-y-3 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h1 className="text-base sm:text-lg font-black text-brand-blue flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-orange" />
            إدارة قائمة الثقات
          </h1>
          <p className="text-muted-foreground text-[11px] sm:text-xs">
            المشترون المصرح لهم بالشراء بالآجل (دين) من متجرك
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-2.5 sm:p-3.5 shadow-2xs relative z-20">
        <h2 className="font-bold text-xs sm:text-sm mb-2 flex items-center gap-1.5 text-foreground">
          <Search className="w-4 h-4 text-brand-orange" />
          إضافة مشتري جديد لقائمة الآجل
        </h2>
        
        <AutocompleteSearch<Buyer>
          placeholder="ابحث عن مشتري بالاسم، اسم المتجر، أو رقم الهاتف..."
          onSearch={handleSearch}
          minChars={2}
          renderItem={(buyer, index, closeDropdown) => {
            const isAlreadyTrusted = trustedBuyers.some(tb => tb.id === buyer.id)
            return (
              <div key={buyer.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-bold">{buyer.full_name}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
                    {buyer.store_name && (
                      <span className="flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> {buyer.store_name}
                      </span>
                    )}
                    {buyer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {buyer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant={isAlreadyTrusted ? "outline" : "default"}
                  onClick={() => handleAdd(buyer.id, closeDropdown)}
                  disabled={isAlreadyTrusted || isAdding === buyer.id}
                  className="shrink-0"
                  size="sm"
                >
                  {isAdding === buyer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                   isAlreadyTrusted ? "موجود في القائمة" : "إضافة للثقات"}
                </Button>
              </div>
            )
          }}
        />
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-2xs relative z-10">
        <div className="p-2.5 sm:p-3 border-b bg-muted/10 flex items-center justify-between">
          <h2 className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
            <UserCheck className="w-4 h-4 text-brand-orange" />
            قائمة الثقات الحالية
          </h2>
          <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
            {trustedBuyers.length} مشتري
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>جاري تحميل القائمة...</p>
          </div>
        ) : trustedBuyers.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            <UserX className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">القائمة فارغة</p>
            <p className="text-sm mt-1">قم بالبحث عن المشترين في الأعلى لإضافتهم</p>
          </div>
        ) : (
          <div className="divide-y">
            {trustedBuyers.map(buyer => (
              <div key={buyer.id} className="p-2 sm:p-2.5 flex items-center justify-between gap-2.5 hover:bg-muted/10 transition-colors">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">{buyer.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {buyer.store_name && (
                      <span className="flex items-center gap-1 bg-muted/60 px-1.5 py-0.2 rounded font-medium">
                        <Store className="w-3 h-3 text-muted-foreground" /> {buyer.store_name}
                      </span>
                    )}
                    {buyer.phone && (
                      <span className="flex items-center gap-1 font-mono" dir="ltr">
                        <Phone className="w-3 h-3 text-muted-foreground" /> {buyer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemove(buyer.id)}
                  disabled={isRemoving === buyer.id}
                  className="shrink-0 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 h-7 text-[10px] sm:text-xs px-2.5 font-bold rounded-lg cursor-pointer shadow-2xs"
                >
                  {isRemoving === buyer.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "إزالة من القائمة"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
