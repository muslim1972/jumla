"use client"

import { useState, useMemo, useEffect, useRef, useDeferredValue } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button"
import { ProductCard } from "@/features/products/components/product-card"
import Image from "next/image"
import Link from "next/link"
import { 
  PackageOpen, 
  LayoutGrid, 
  List, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Store,
  Star,
  Truck
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
  user_id: string
  merchant_id: string
  profiles: {
    full_name: string | null
    delivery_fee: number | null
  } | null
  category_id?: string | null
  stock_quantity?: number
}

interface Category {
  id: string
  name: string
  emoji: string
  keywords: string[]
}

const CATEGORIES: Category[] = [
  { id: "all", name: "الكل", emoji: "🛍️", keywords: [] },
  { id: "smoking", name: "مستلزمات التدخين", emoji: "🚬", keywords: ["سجائر", "معسل", "فحم", "فيب", "سحبة", "تبغ", "تدخين", "دخان", "cigarette", "tobacco"] },
  { id: "grocery", name: "الغذائية", emoji: "🥫", keywords: ["زيت", "سكر", "رز", "طحين", "معجون", "بهارات", "ملح", "معلبات", "جبن", "قشطة", "زبدة", "صلصة", "شاي", "قهوة", "حليب", "عدس", "حمص", "فاصوليا", "سمن", "خضار", "فواكه", "عسل", "معكرونة", "اندومي"] },
  { id: "sweets", name: "حلويات", emoji: "🍬", keywords: ["شيكولاتة", "كاكاو", "كيك", "بسكت", "جبس", "مصاص", "علك", "نوتيلا", "حلاوة", "كراميل", "سكاكر", "حلويات", "حلوى", "نستله", "كرزات", "مكسرات"] },
  { id: "plastics", name: "أكياس بلاستيك", emoji: "📦", keywords: ["أكياس", "كيس", "بلاستك", "سفري", "صحون بلاستك", "سفريات", "نايلون", "علاكة", "علاكات", "سفره", "كاسة", "علبة", "بلاستيك"] },
  { id: "dairy", name: "ألبان وأجبان", emoji: "🥛", keywords: ["حليب", "لبن", "جبن", "قشطة", "زبدة", "قيمر", "ألبان", "أجبان", "زبادي", "روب", "كريم"] },
  { id: "cleaning", name: "منظفات", emoji: "🧼", keywords: ["صابون", "زاهي", "تايت", "شامبو", "معقم", "ديتول", "كلور", "غسيل", "ليفة", "منظف", "معطر", "قاصر", "كلوركس", "مساحة", "قماش", "فلاش"] },
]

export function ProductExplorer({ 
  products, 
  user,
  cartItems = [],
  dbCategories = []
}: { 
  products: Product[] | null,
  user: any,
  cartItems?: { id: string; product_id: string; quantity: number }[],
  dbCategories?: {id: string, name: string, icon_url: string | null}[]
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)

  const placeholders = useMemo(() => [
    'ابحث عن "مستلزمات التدخين"...',
    'ابحث عن "المواد الغذائية"...',
    'ابحث عن "جملتي السجائر"...',
    'ابحث عن "أكياس بلاستيك"...',
    'ابحث عن "حلويات"...',
    'ابحث عن "ألبان وأجبان"...',
    'ابحث عن "منظفات ومعقمات"...'
  ], [])

  // Rotate placeholder keywords every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [placeholders.length])

  // Filter and group products by merchant
  const filteredGroupedProducts = useMemo(() => {
    if (!products) return {}
    const groups: Record<string, { merchantId: string, products: Product[] }> = {}
    
    let filtered = products

    if (deferredSearchQuery) {
      const q = deferredSearchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.profiles?.full_name?.toLowerCase().includes(q))
      )
    }

    if (selectedCategory !== "all") {
      // Check if it's a legacy category ID or DB category ID
      const legacyCategory = CATEGORIES.find(c => c.id === selectedCategory)
      
      filtered = filtered.filter(p => {
        // Match by new DB category_id
        if (p.category_id === selectedCategory) return true;
        
        // Fallback to legacy keyword search if it's a legacy category
        if (legacyCategory && legacyCategory.keywords.length > 0) {
          return legacyCategory.keywords.some(keyword => 
            p.name.toLowerCase().includes(keyword) || 
            (p.description && p.description.toLowerCase().includes(keyword))
          )
        }
        return false;
      })
    }

    filtered.forEach(product => {
      const merchantName = product.profiles?.full_name || "تاجر غير معروف"
      if (!groups[merchantName]) {
        groups[merchantName] = { merchantId: product.merchant_id, products: [] }
      }
      groups[merchantName].products.push(product)
    })
    return groups
  }, [products, deferredSearchQuery, selectedCategory])

  const filteredMerchantNames = useMemo(() => {
    return Object.keys(filteredGroupedProducts)
  }, [filteredGroupedProducts])



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
      <div className="max-w-4xl mx-auto mt-2 sm:mt-4 mb-4 space-y-4">
        <div className="flex gap-2.5 items-center">
          <div className="relative flex-grow group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-orange transition-colors" />
            <Input 
              placeholder="" 
              className="pr-10 h-11 bg-card/90 border-border focus:border-brand-orange transition-all rounded-xl shadow-sm text-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {searchQuery === "" && !isFocused && (
              <div 
                key={placeholderIndex}
                className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none select-none text-muted-foreground/60 text-sm animate-placeholder-fade"
              >
                {placeholders[placeholderIndex]}
              </div>
            )}
          </div>
        </div>

        {/* Categories Quick Filter Carousel (Toters Style) */}
        <div className="relative group/carousel max-w-4xl mx-auto px-1">
          {/* Carousel Scroll Element */}
          <div 
            className="flex gap-4 overflow-x-auto pb-3 pt-2 scrollbar-none px-6 scroll-smooth select-none hide-scrollbar"
          >
            {/* عرض الكل */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden relative border transition-all duration-300 shadow-sm flex items-center justify-center bg-card cursor-pointer select-none",
                  selectedCategory === "all" 
                    ? "border-brand-orange ring-2 ring-brand-orange/40 scale-105 bg-brand-orange/5" 
                    : "border-border/60 hover:border-brand-blue/30 hover:shadow"
                )}
              >
                <div className="text-2xl sm:text-3xl">🛍️</div>
              </button>
              <span className={cn(
                "text-[10px] sm:text-xs font-bold transition-colors select-none",
                selectedCategory === "all" ? "text-brand-orange font-black" : "text-muted-foreground hover:text-foreground"
              )}>
                الكل
              </span>
            </div>

            {/* الأقسام الديناميكية أو الافتراضية */}
            {(dbCategories.length > 0 ? dbCategories : CATEGORIES.slice(1)).map((category) => {
              const isActive = selectedCategory === category.id
              return (
                <div 
                  key={category.id} 
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden relative border transition-all duration-300 shadow-sm flex items-center justify-center bg-card cursor-pointer select-none",
                      isActive 
                        ? "border-brand-orange ring-2 ring-brand-orange/40 scale-105 bg-brand-orange/5" 
                        : "border-border/60 hover:border-brand-blue/30 hover:shadow"
                    )}
                  >
                    {(category as any).icon_url ? (
                      <Image
                        src={(category as any).icon_url}
                        alt={category.name}
                        fill
                        sizes="(max-width: 640px) 64px, 80px"
                        className={cn(
                          "object-contain p-2 transition-transform duration-500",
                          isActive ? "scale-110" : "hover:scale-105"
                        )}
                      />
                    ) : (
                      <div className="text-2xl sm:text-3xl">
                        {(category as any).emoji || "🏷️"}
                      </div>
                    )}
                  </button>
                  <span className={cn(
                    "text-[10px] sm:text-xs font-bold transition-colors select-none",
                    isActive ? "text-brand-orange font-black" : "text-muted-foreground hover:text-foreground"
                  )}>
                    {category.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Merchants List */}
      <div className="space-y-4">
        {filteredMerchantNames.length > 0 && (
          <h2 className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground pr-1 mb-2 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 bg-brand-orange rounded-full inline-block animate-pulse" />
            التجار المتاحون
          </h2>
        )}
        {filteredMerchantNames.length === 0 ? (
          <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border border-dashed border-border/50 text-muted-foreground">
            <PackageOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            لا يوجد تجار يطابقون خيارات البحث أو التصنيف المحدد.
          </div>

        ) : (
          filteredMerchantNames.map(merchantName => {
            const groupData = filteredGroupedProducts[merchantName]
            const merchantProducts = groupData.products
            const merchantId = groupData.merchantId
            const deliveryFee = merchantProducts[0]?.profiles?.delivery_fee
            // Generate stable mock rating based on name characters
            const rating = ((merchantName.charCodeAt(0) + (merchantName.charCodeAt(1) || 0)) % 5) * 0.1 + 4.5

            return (
              <div key={merchantName} className="space-y-3">
                {/* Merchant Card */}
                <Link 
                  href={`/store/${merchantId}`}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 glass rounded-2xl hover:bg-muted/30 transition-all duration-300 group border border-border/40 shadow-premium text-right cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl transition-all duration-300 shadow-inner bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue group-hover:text-white">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base sm:text-lg text-brand-blue dark:text-foreground leading-none">{merchantName}</h3>
                        <div className="flex items-center gap-0.5 bg-brand-orange/10 text-brand-orange text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          <Star className="h-3 w-3 fill-brand-orange" />
                          <span>{rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mt-2">
                        <span>{merchantProducts.length} منتج متاح</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground/75" />
                          {deliveryFee !== null && deliveryFee !== undefined
                            ? `توصيل: ${Number(deliveryFee).toLocaleString('en-US')} د.ع`
                            : "التوصيل حسب المنطقة"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-brand-orange group-hover:-translate-x-1 transition-all" />
                </Link>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
