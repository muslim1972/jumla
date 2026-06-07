"use client"

import { useState, useMemo, useRef, useEffect } from "react"
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
    <div className="bg-background min-h-screen pb-32">
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 p-4 flex items-center gap-4">
        <Link href="/" className="bg-muted hover:bg-muted/80 p-2 rounded-full transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </Link>
        <h1 className="font-bold text-lg text-foreground truncate">{merchant.full_name}</h1>
      </div>

      {/* Hero Header */}
      <div className="relative pt-16">
        <div className="h-48 sm:h-64 bg-gradient-to-r from-brand-blue/80 to-brand-orange/80 relative overflow-hidden">
          {/* Pattern overlay using CSS */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
        </div>

        {/* Store Info Card (Overlapping Hero) */}
        <div className="max-w-4xl mx-auto px-4 relative -mt-16 sm:-mt-20">
          <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start text-center sm:text-right">
            {/* Store Logo Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-background border-4 border-background shadow-md flex items-center justify-center shrink-0 -mt-12 sm:mt-0 relative overflow-hidden">
              <span className="text-3xl font-black text-brand-orange">
                {merchant.full_name.charAt(0)}
              </span>
            </div>

            <div className="flex-grow space-y-2">
              <h2 className="text-2xl font-black text-foreground">{merchant.full_name}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-brand-orange/10 text-brand-orange px-2 py-1 rounded-md font-bold">
                  <Star className="w-4 h-4 fill-brand-orange" />
                  {rating.toFixed(1)} (100+ تقييم)
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  {merchant.delivery_fee !== null 
                    ? `${merchant.delivery_fee.toLocaleString()} د.ع` 
                    : "حسب المنطقة"}
                </div>
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  بيع بالجملة
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promotions Banner */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-emerald-500 text-white p-2 rounded-lg">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">عروض وتخفيضات!</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">احصل على نقاط مجانية عند شرائك بأكثر من 100,000 د.ع</p>
          </div>
        </div>
      </div>

      {/* Sticky Categories Navigation */}
      <div className="sticky top-[65px] z-40 bg-background/95 backdrop-blur shadow-sm border-b border-border/50 mt-6 overflow-hidden">
        <div 
          ref={categoryNavRef}
          className="flex overflow-x-auto hide-scrollbar max-w-4xl mx-auto px-4 py-3 gap-2"
        >
          {activeCategoriesList.map(cat => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all shrink-0",
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


    </div>
  )
}
