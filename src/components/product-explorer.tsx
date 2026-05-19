"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AddToCartButton } from "@/components/add-to-cart-button"
import Image from "next/image"
import { 
  PackageOpen, 
  LayoutGrid, 
  List, 
  Search, 
  ChevronDown, 
  ChevronUp,
  User
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  price: number
  image_url: string | null
  unit_type: string
  description?: string
  profiles: {
    full_name: string | null
  } | null
}

export function ProductExplorer({ 
  products, 
  user 
}: { 
  products: Product[] | null,
  user: any 
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set())

  // Group products by merchant
  const groupedProducts = useMemo(() => {
    if (!products) return {}
    const groups: Record<string, Product[]> = {}
    products.forEach(product => {
      const merchantName = product.profiles?.full_name || "تاجر غير معروف"
      if (!groups[merchantName]) {
        groups[merchantName] = []
      }
      groups[merchantName].push(product)
    })
    return groups
  }, [products])

  // Filter merchants based on search
  const filteredMerchantNames = useMemo(() => {
    const names = Object.keys(groupedProducts)
    if (!searchQuery.trim()) return names
    return names.filter(name => 
      name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [groupedProducts, searchQuery])

  const toggleMerchant = (name: string) => {
    const newSet = new Set(expandedMerchants)
    if (newSet.has(name)) {
      newSet.delete(name)
    } else {
      newSet.add(name)
    }
    setExpandedMerchants(newSet)
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-20 glass rounded-3xl border-dashed border-2">
        <PackageOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground text-lg">لا توجد منتجات معروضة حالياً.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search & Controls Section - Part of Hero but integrated */}
      <div className="max-w-4xl mx-auto -mt-4 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="ابحث عن تاجر محدد..." 
              className="pr-10 h-11 bg-background/80 backdrop-blur-sm border-primary/20 focus:border-primary transition-all rounded-xl shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button 
              variant="outline" 
              className="h-11 px-4 rounded-xl glass flex items-center gap-2 group hover:border-primary/50 transition-all duration-300"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              title={viewMode === "grid" ? "تحويل لعرض القائمة" : "تحويل للعرض الشبكي"}
            >
              {viewMode === "grid" ? (
                <>
                  <List className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold hidden sm:inline">عرض قائمة</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold hidden sm:inline">عرض شبكي</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Merchants List */}
      <div className="space-y-4">
        {filteredMerchantNames.length > 0 && (
          <h2 className="text-lg font-bold text-foreground pr-1 mb-2 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 bg-primary rounded-full inline-block" />
            التجار المتاحون
          </h2>
        )}
        {filteredMerchantNames.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا يوجد تجار يطابقون بحثك.
          </div>
        ) : (
          filteredMerchantNames.map(merchantName => (
            <div key={merchantName} className="space-y-3">
              {/* Merchant Accordion Header */}
              <button 
                onClick={() => toggleMerchant(merchantName)}
                className="w-full flex items-center justify-between p-4 glass rounded-2xl hover:bg-muted/50 transition-all group border-none shadow-premium text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-none">{merchantName}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{groupedProducts[merchantName].length} منتج</p>
                  </div>
                </div>
                {expandedMerchants.has(merchantName) ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </button>

              {/* Products Container */}
              {expandedMerchants.has(merchantName) && (
                <div className={cn(
                  "animate-in fade-in slide-in-from-top-2 duration-300",
                  viewMode === "grid" 
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6" 
                    : "space-y-2"
                )}>
                  {groupedProducts[merchantName].map(product => (
                    viewMode === "grid" ? (
                      <Card 
                        key={product.id} 
                        className="overflow-hidden border-none shadow-premium hover:shadow-premium-hover transition-all duration-500 group bg-card/80 backdrop-blur-sm flex flex-col h-full rounded-2xl"
                      >
                        <div className="aspect-[4/5] relative bg-muted overflow-hidden">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                              className="object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full bg-secondary/20">
                              <PackageOpen className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 glass px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm z-10">
                            {product.unit_type}
                          </div>
                        </div>

                        <CardHeader className="p-3 sm:p-4 pb-1 space-y-1">
                          <CardTitle className="text-sm sm:text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">
                            {product.name}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="p-3 sm:p-4 pt-0 flex-grow">
                          <div className="flex flex-col mt-1">
                            <span className="text-base sm:text-xl font-black text-primary">
                              {Number(product.price).toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">د.ع</span>
                            </span>
                          </div>
                        </CardContent>

                        <CardFooter className="p-3 sm:p-4 pt-0">
                          <AddToCartButton 
                            user={user} 
                            productId={product.id} 
                            variant="compact"
                          />
                        </CardFooter>
                      </Card>
                    ) : (
                      /* List View - Ultra Compact */
                      <div 
                        key={product.id}
                        className="flex items-center gap-3 p-2 glass rounded-xl hover:bg-muted/30 transition-all group"
                      >
                        <div className="h-12 w-12 rounded-lg bg-muted relative overflow-hidden shrink-0 shadow-sm">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              <PackageOpen className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          <h4 className="text-sm font-bold line-clamp-1 leading-tight group-hover:text-primary transition-colors">{product.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-primary font-black text-sm">
                              {Number(product.price).toLocaleString()} <span className="text-[10px] font-normal">د.ع</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                              {product.unit_type}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <AddToCartButton 
                            user={user} 
                            productId={product.id} 
                            variant="icon"
                          />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
