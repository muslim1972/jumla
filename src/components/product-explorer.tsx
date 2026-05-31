"use client"

import { useState, useMemo, useEffect, useRef } from "react"
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
  Store,
  Star,
  Truck,
  ChevronLeft,
  ChevronRight
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
    delivery_fee: number | null
  } | null
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
  cartItems = []
}: { 
  products: Product[] | null,
  user: any,
  cartItems?: { id: string; product_id: string; quantity: number }[]
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set())
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(true)
  const [showRightArrow, setShowRightArrow] = useState(false)

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

  // Scroll limits detection (RTL aware)
  const checkScrollLimits = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      const maxScroll = scrollWidth - clientWidth
      const currentScroll = Math.abs(scrollLeft)
      
      // In RTL, scrollLeft is 0 at start, and goes negative when scrolled left.
      setShowRightArrow(currentScroll > 10)
      setShowLeftArrow(currentScroll < maxScroll - 10)
    }
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.addEventListener("scroll", checkScrollLimits)
      checkScrollLimits()
      window.addEventListener("resize", checkScrollLimits)
      requestAnimationFrame(checkScrollLimits)
    }
    return () => {
      if (el) {
        el.removeEventListener("scroll", checkScrollLimits)
      }
      window.removeEventListener("resize", checkScrollLimits)
    }
  }, [products])

  const scrollCarousel = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -220 : 220
      scrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth"
      })
    }
  }

  // Helper to match category keyword
  const isProductInCategory = (product: Product, categoryId: string) => {
    if (categoryId === "all") return true
    const cat = CATEGORIES.find(c => c.id === categoryId)
    if (!cat) return true
    
    const name = (product.name || "").toLowerCase()
    const desc = (product.description || "").toLowerCase()
    
    return cat.keywords.some(keyword => 
      name.includes(keyword.toLowerCase()) || desc.includes(keyword.toLowerCase())
    )
  }

  // Filter and group products by merchant
  const filteredGroupedProducts = useMemo(() => {
    if (!products) return {}
    const groups: Record<string, Product[]> = {}
    
    products.forEach(product => {
      // Apply category filter
      if (!isProductInCategory(product, selectedCategory)) return
      
      // Apply search query filter
      const merchantName = product.profiles?.full_name || "تاجر غير معروف"
      const query = searchQuery.toLowerCase().trim()
      
      if (query !== "") {
        const merchantMatch = merchantName.toLowerCase().includes(query)
        const productNameMatch = product.name.toLowerCase().includes(query)
        const productDescMatch = (product.description || "").toLowerCase().includes(query)
        
        if (!merchantMatch && !productNameMatch && !productDescMatch) {
          return
        }
      }
      
      if (!groups[merchantName]) {
        groups[merchantName] = []
      }
      groups[merchantName].push(product)
    })
    return groups
  }, [products, searchQuery, selectedCategory])

  const filteredMerchantNames = useMemo(() => {
    return Object.keys(filteredGroupedProducts)
  }, [filteredGroupedProducts])

  // Expand all matched merchants by default when filtering/searching
  useEffect(() => {
    if (searchQuery.trim() !== "" || selectedCategory !== "all") {
      setExpandedMerchants(new Set(filteredMerchantNames))
    }
  }, [searchQuery, selectedCategory, filteredMerchantNames])

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
      <div className="max-w-4xl mx-auto -mt-4 mb-4 space-y-4">
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
          <div className="shrink-0">
            <Button 
              variant="outline" 
              className="h-11 px-4 rounded-xl glass flex items-center gap-2 group hover:border-brand-orange/40 hover:bg-muted/10 transition-all duration-300 border border-border/60"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              title={viewMode === "grid" ? "تحويل لعرض القائمة" : "تحويل للعرض الشبكي"}
            >
              {viewMode === "grid" ? (
                <>
                  <List className="h-5 w-5 text-brand-orange group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold hidden sm:inline">عرض قائمة</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="h-5 w-5 text-brand-orange group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold hidden sm:inline">عرض شبكي</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Categories Quick Filter Carousel (Toters Style) */}
        <div className="relative group/carousel max-w-4xl mx-auto px-1">
          {/* Right Arrow (Scroll back to start - right side in RTL) */}
          {showRightArrow && (
            <button
              onClick={() => scrollCarousel("right")}
              className="absolute right-0 top-8 sm:top-10 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card/90 backdrop-blur-md border border-brand-orange text-brand-orange flex items-center justify-center shadow-md cursor-pointer hover:bg-brand-orange hover:text-white transition-all select-none"
            >
              <div className="animate-pulse">
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>
          )}

          {/* Left Arrow (Scroll further to end - left side in RTL) */}
          {showLeftArrow && (
            <button
              onClick={() => scrollCarousel("left")}
              className="absolute left-0 top-8 sm:top-10 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card/90 backdrop-blur-md border border-brand-orange text-brand-orange flex items-center justify-center shadow-md cursor-pointer hover:bg-brand-orange hover:text-white transition-all select-none"
            >
              <div className="animate-pulse">
                <ChevronLeft className="h-5 w-5" />
              </div>
            </button>
          )}

          {/* Carousel Scroll Element */}
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-3 pt-2 scrollbar-none px-6 scroll-smooth select-none"
          >
            {CATEGORIES.map((category) => {
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
                    <Image
                      src={`/categories/cat_${category.id}.jpg`}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 64px, 80px"
                      className={cn(
                        "object-contain p-2 transition-transform duration-500",
                        isActive ? "scale-110" : "hover:scale-105"
                      )}
                    />
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
            const merchantProducts = filteredGroupedProducts[merchantName]
            const deliveryFee = merchantProducts[0]?.profiles?.delivery_fee
            // Generate stable mock rating based on name characters
            const rating = ((merchantName.charCodeAt(0) + (merchantName.charCodeAt(1) || 0)) % 5) * 0.1 + 4.5

            return (
              <div key={merchantName} className="space-y-3">
                {/* Merchant Accordion Header */}
                <button 
                  onClick={() => toggleMerchant(merchantName)}
                  className={cn(
                    "w-full flex items-center justify-between p-3.5 sm:p-4 glass rounded-2xl hover:bg-muted/30 transition-all duration-300 group border border-border/40 shadow-premium text-right cursor-pointer",
                    expandedMerchants.has(merchantName) && "border-brand-blue/30 bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl transition-all duration-300 shadow-inner",
                      expandedMerchants.has(merchantName)
                        ? "bg-brand-blue text-white" 
                        : "bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue group-hover:text-white"
                    )}>
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
                  {expandedMerchants.has(merchantName) ? (
                    <ChevronUp className="h-5 w-5 text-brand-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {/* Products Container */}
                {expandedMerchants.has(merchantName) && (
                  <div className={cn(
                    "animate-in fade-in slide-in-from-top-2 duration-300",
                    viewMode === "grid" 
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4" 
                      : "space-y-2"
                  )}>
                    {merchantProducts.map(product => (
                      viewMode === "grid" ? (
                        <Card 
                          key={product.id} 
                          className="overflow-hidden border border-border/40 shadow-premium hover:shadow-premium-hover hover:border-brand-orange/30 transition-all duration-500 group bg-card/85 backdrop-blur-sm flex flex-col h-full rounded-2xl"
                        >
                          <div className="aspect-[4/5] relative bg-muted/30 overflow-hidden">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full bg-secondary/10">
                                <PackageOpen className="w-8 h-8 text-muted-foreground/20" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2 bg-brand-blue/90 dark:bg-brand-blue text-white px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm z-10">
                              {product.unit_type}
                            </div>
                          </div>

                          <CardHeader className="p-3 pb-1 space-y-0.5">
                            <CardTitle className="text-sm font-bold line-clamp-1 group-hover:text-brand-orange transition-colors">
                              {product.name}
                            </CardTitle>
                            {product.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </CardHeader>

                          <CardContent className="p-3 pt-1 pb-2 flex-grow">
                            <div className="flex flex-col mt-0.5">
                              <span className="text-base font-black text-brand-blue dark:text-foreground">
                                {Number(product.price).toLocaleString('en-US')} <span className="text-[10px] font-normal">د.ع</span>
                              </span>
                            </div>
                          </CardContent>

                          <CardFooter className="p-3 pt-0">
                            <AddToCartButton 
                              user={user} 
                              productId={product.id} 
                              productPrice={product.price}
                              initialCartItem={cartItems.find(i => i.product_id === product.id)}
                              variant="compact"
                            />
                          </CardFooter>
                        </Card>
                      ) : (
                        /* List View - Ultra Compact */
                        <div 
                          key={product.id}
                          className="flex items-center gap-3 p-2.5 glass rounded-xl hover:bg-muted/30 hover:border-brand-orange/30 border border-border/30 transition-all duration-300 group"
                        >
                          <div className="h-12 w-12 rounded-lg bg-muted/40 relative overflow-hidden shrink-0 shadow-sm border border-border/10">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <PackageOpen className="w-4 h-4 text-muted-foreground/20" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-grow min-w-0">
                            <h4 className="text-sm font-bold line-clamp-1 leading-tight group-hover:text-brand-orange transition-colors">{product.name}</h4>
                            {product.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-brand-blue dark:text-foreground font-black text-sm">
                                {Number(product.price).toLocaleString('en-US')} <span className="text-[10px] font-normal">د.ع</span>
                              </span>
                              <span className="text-[9px] text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded font-bold">
                                {product.unit_type}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <AddToCartButton 
                              user={user} 
                              productId={product.id} 
                              productPrice={product.price}
                              initialCartItem={cartItems.find(i => i.product_id === product.id)}
                              variant="icon"
                            />
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
