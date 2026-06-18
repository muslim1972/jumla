"use client"

import { useState, useMemo, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Star, Truck, Info, Percent } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { cn } from "@/lib/utils"

// Extracted static categories array to follow bundle best practices
const CATEGORIES = [
  { id: "smoking", name: "مستلزمات التدخين", keywords: ["سجائر", "معسل", "فحم", "فيب", "سحبة", "تبغ", "تدخين", "دخان", "cigarette", "tobacco"] },
  { id: "grocery", name: "الغذائية", keywords: ["زيت", "سكر", "رز", "طحين", "معجون", "بهارات", "ملح", "معلبات", "جبن", "قشطة", "زبدة", "صلصة", "شاي", "قهوة", "حليب", "عدس", "حمص", "فاصوليا", "سمن", "خضار", "فواكه", "عسل", "معكرونة", "اندومي"] },
  { id: "sweets", name: "حلويات", keywords: ["شيكولاتة", "كاكاو", "كيك", "بسكت", "جبس", "مصاص", "علك", "نوتيلا", "حلاوة", "كراميل", "سكاكر", "حلويات", "حلوى", "نستله", "كرزات", "مكسرات"] },
  { id: "plastics", name: "أكياس بلاستيك", keywords: ["أكياس", "كيس", "بلاستك", "سفري", "صحون بلاستك", "سفريات", "نايلون", "علاكة", "علاكات", "سفره", "كاسة", "علبة", "بلاستيك"] },
  { id: "dairy", name: "ألبان وأجبان", keywords: ["حليب", "لبن", "جبن", "قشطة", "زبدة", "قيمر", "ألبان", "أجبان", "زبادي", "روب", "كريم"] },
  { id: "cleaning", name: "منظفات", keywords: ["صابون", "زاهي", "تايت", "شامبو", "معقم", "ديتول", "كلور", "غسيل", "ليفة", "منظف", "معطر", "قاصر", "كلوركس", "مساحة", "قماش", "فلاش"] },
]

export function StoreClient({ 
  merchant, 
  products, 
  user, 
  cartItems, 
  userRole 
}: { 
  merchant: any
  products: any[]
  user: any
  cartItems: any[]
  userRole: string
}) {
  const [activeCategory, setActiveCategory] = useState<string>("popular")
  const categoryNavRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Generate stable mock rating
  const rating = useMemo(() => {
    const name = merchant.full_name || ""
    return ((name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % 5) * 0.1 + 4.5
  }, [merchant.full_name])

  // Group products by categories based on keywords
  const groupedProducts = useMemo(() => {
    const groups: Record<string, any[]> = {
      "popular": products.slice(0, 6) // Mock popular products
    }

    products.forEach(product => {
      let matched = false
      const name = (product.name || "").toLowerCase()
      const desc = (product.description || "").toLowerCase()

      for (const cat of CATEGORIES) {
        if (cat.keywords.some(kw => name.includes(kw) || desc.includes(kw))) {
          if (!groups[cat.id]) groups[cat.id] = []
          groups[cat.id].push(product)
          matched = true
          break
        }
      }
      
      if (!matched) {
        if (!groups["other"]) groups["other"] = []
        groups["other"].push(product)
      }
    })

    return groups
  }, [products])

  // Categories that actually have products
  const activeCategoriesList = [
    { id: "popular", name: "شائع" },
    ...CATEGORIES.filter(c => groupedProducts[c.id] && groupedProducts[c.id].length > 0).map(c => ({ id: c.id, name: c.name })),
    ...(groupedProducts["other"] && groupedProducts["other"].length > 0 ? [{ id: "other", name: "أخرى" }] : [])
  ]

  const scrollToCategory = (id: string) => {
    setActiveCategory(id)
    const el = document.getElementById(`category-${id}`)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 180 // offset for sticky header
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  // Optimize scroll spy using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first entry that is intersecting
        const intersectingEntry = entries.find(entry => entry.isIntersecting);
        if (intersectingEntry) {
          const catId = intersectingEntry.target.id.replace('category-', '');
          setActiveCategory(catId);
        }
      },
      {
        rootMargin: "-180px 0px -40% 0px", // Trigger when element hits top 180px
        threshold: 0
      }
    );

    activeCategoriesList.forEach(cat => {
      const el = document.getElementById(`category-${cat.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeCategoriesList]);

  // Calculate cart totals
  const totalCartItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems])
  const totalCartPrice = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id)
      if (product) {
        const unit = product.units?.find((u: any) => u.type === item.unit_type)
        const price = unit ? unit.price : product.price
        return sum + (price * item.quantity)
      }
      return sum
    }, 0)
  }, [cartItems, products])

  return (
    <div className={cn("bg-background w-full", totalCartItems > 0 ? "pb-32" : "pb-4")}>
      {/* Sticky Header Group: Navbar + Store Info + Tabs */}
      <div className="sticky top-0 z-50 bg-background shadow-sm border-b border-border/50 flex flex-col">
        {/* Top Navbar */}
        <div className="bg-background/95 backdrop-blur-md p-3 pr-[110px] pl-[140px] flex items-center h-[60px]">
          <button 
            onClick={() => {
              startTransition(() => {
                router.push('/')
              })
            }}
            disabled={isPending}
            className={cn(
              "flex items-center gap-3 w-full text-right p-2 rounded-2xl transition-all duration-300 group",
              isPending 
                ? "opacity-60" 
                : "hover:bg-muted/50 active:scale-[0.98]"
            )}
          >
            <div className="bg-muted group-hover:bg-muted/80 p-2 rounded-full transition-colors relative overflow-hidden shrink-0 shadow-lg shadow-brand-orange/20">
              {isPending ? (
                <div className="w-4 h-4 rounded-full border-2 border-brand-orange border-t-transparent animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4 animate-fade-orange group-active:-translate-x-1 transition-transform" />
              )}
            </div>
            <h1 className="font-bold text-base animate-fade-orange truncate">{merchant.full_name}</h1>
          </button>
        </div>

        {/* Hero Header */}
        <div className="relative">
          <div className="h-24 sm:h-32 bg-gradient-to-r from-brand-blue/80 to-brand-orange/80 relative overflow-hidden">
            {/* Pattern overlay using CSS */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
          </div>

          {/* Store Info Card (Overlapping Hero) */}
          <div className="max-w-4xl mx-auto px-4 relative -mt-10 sm:-mt-12 mb-3">
            <div className="bg-card rounded-2xl shadow-sm border border-border/40 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-center sm:items-start text-center sm:text-right">
              {/* Store Logo Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-background border-4 border-background shadow-sm flex items-center justify-center shrink-0 -mt-8 sm:-mt-10 relative overflow-hidden">
                <span className="text-2xl sm:text-3xl font-black text-brand-orange">
                  {merchant.full_name.charAt(0)}
                </span>
              </div>

              <div className="flex-grow space-y-1 sm:mt-0">
                <h2 className="text-lg sm:text-xl font-black text-foreground">{merchant.full_name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-md font-bold">
                    <Star className="w-3.5 h-3.5 fill-brand-orange" />
                    {rating.toFixed(1)} (100+)
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    {merchant.delivery_fee !== null 
                      ? `${merchant.delivery_fee.toLocaleString('en-US')} د.ع` 
                      : "حسب المنطقة"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    جملة
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Navigation */}
        <div className="bg-background/95 backdrop-blur overflow-hidden pb-2">
          <div 
            ref={categoryNavRef}
            className="flex overflow-x-auto hide-scrollbar max-w-4xl mx-auto px-4 py-1 gap-2"
          >
            {activeCategoriesList.map(cat => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0",
                  activeCategory === cat.id 
                    ? "bg-brand-blue text-white shadow-md" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid Sections */}
      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-12">
        {activeCategoriesList.map(cat => {
          const catProducts = groupedProducts[cat.id]
          if (!catProducts || catProducts.length === 0) return null

          return (
            <div key={cat.id} id={`category-${cat.id}`} className="scroll-mt-[180px]">
              <h3 className="text-xl font-black text-foreground mb-4">{cat.name}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {catProducts.map(product => (
                  <ProductCard 
                    key={`${cat.id}-${product.id}`}
                    product={product}
                    user={user}
                    cartItems={cartItems}
                    viewMode="grid"
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating Go to Cart Banner */}
      {totalCartItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-full duration-300 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <Link 
              href="/cart"
              className="w-full flex items-center justify-between p-4 bg-brand-orange text-white rounded-2xl shadow-xl shadow-brand-orange/20 hover:bg-brand-orange/90 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <div className="font-black leading-none">{totalCartItems}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg leading-none mb-1">عرض السلة</div>
                  <div className="text-sm font-medium text-white/80">
                    المجموع: {totalCartPrice.toLocaleString('en-US')} د.ع
                  </div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 rotate-180" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
