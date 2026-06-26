"use client"

import { useState, useEffect } from "react"
import { getTrustedBuyers, searchBuyers, addTrustedBuyer, removeTrustedBuyer } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserCheck, UserX, Search, Loader2, Store, Phone } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

type Buyer = {
  id: string
  full_name: string
  store_name: string
  phone: string
}

export function TrustedBuyersClient({ merchantId }: { merchantId: string }) {
  const [trustedBuyers, setTrustedBuyers] = useState<Buyer[]>([])
  const [searchResults, setSearchResults] = useState<Buyer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const debouncedQuery = useDebounce(searchQuery, 500)

  useEffect(() => {
    loadTrustedBuyers()
  }, [])

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch(debouncedQuery)
    } else {
      setSearchResults([])
    }
  }, [debouncedQuery])

  async function loadTrustedBuyers() {
    setIsLoading(true)
    const { buyers, error } = await getTrustedBuyers(merchantId)
    if (!error && buyers) {
      setTrustedBuyers(buyers)
    }
    setIsLoading(false)
  }

  async function performSearch(query: string) {
    setIsSearching(true)
    const { buyers, error } = await searchBuyers(merchantId, query)
    if (!error && buyers) {
      setSearchResults(buyers)
    }
    setIsSearching(false)
  }

  async function handleAdd(buyerId: string) {
    setIsAdding(buyerId)
    const { success, error } = await addTrustedBuyer(merchantId, buyerId)
    if (error) {
      alert(error)
    } else {
      await loadTrustedBuyers()
      setSearchQuery("")
      setSearchResults([])
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-orange" />
            إدارة قائمة الثقات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            المشترون في هذه القائمة يمكنهم الشراء بالآجل (دين) من متجرك.
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          إضافة مشتري جديد
        </h2>
        <div className="relative">
          <Input
            type="search"
            placeholder="ابحث عن مشتري بالاسم، اسم المتجر، أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 bg-background/50"
          />
          {isSearching && (
            <div className="absolute left-3 top-3.5">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 border rounded-xl divide-y overflow-hidden">
            {searchResults.map(buyer => {
              const isAlreadyTrusted = trustedBuyers.some(tb => tb.id === buyer.id)
              return (
                <div key={buyer.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-bold">{buyer.full_name}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
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
                    onClick={() => handleAdd(buyer.id)}
                    disabled={isAlreadyTrusted || isAdding === buyer.id}
                    className="shrink-0"
                  >
                    {isAdding === buyer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                     isAlreadyTrusted ? "موجود في القائمة" : "إضافة للثقات"}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b bg-muted/10">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-orange" />
            قائمة الثقات الحالية
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full mr-auto">
              {trustedBuyers.length} مشتري
            </span>
          </h2>
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
              <div key={buyer.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                <div>
                  <h3 className="font-bold text-lg">{buyer.full_name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1.5">
                    {buyer.store_name && (
                      <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                        <Store className="w-4 h-4" /> {buyer.store_name}
                      </span>
                    )}
                    {buyer.phone && (
                      <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                        <Phone className="w-4 h-4" /> {buyer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemove(buyer.id)}
                  disabled={isRemoving === buyer.id}
                  className="shrink-0"
                >
                  {isRemoving === buyer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "إزالة من القائمة"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
