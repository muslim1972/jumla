"use client"

import { useState, useMemo, useEffect, useDeferredValue, useRef, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  PackageOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Store,
  Star,
  Truck,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  ArrowDown
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORIES } from "@/features/products/lib/taxonomy"
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button"

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
  units?: any[]
}

export function ProductExplorer({ 
  products, 
  user,
  profile,
  cartItems = [],
  dbCategories = []
}: { 
  products: Product[] | null,
  user: any,
  profile?: any,
  cartItems?: { id: string; product_id: string; quantity: number; unit_type?: string }[],
  dbCategories?: { id: string; name: string; icon_url: string | null }[]
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState<"price_asc" | "popular" | "price_desc" | "newest">("popular")
  const [viewTab, setViewTab] = useState<"products" | "merchants">("products")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)

  // اقتراحات البحث والفلترة اللحظية (AutoComplete)
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !products) return []
    const q = searchQuery.trim().toLowerCase()
    
    const startsWithMatches: Product[] = []
    const includesMatches: Product[] = []

    for (const p of products) {
      const name = p.name.toLowerCase()
      if (name.startsWith(q)) {
        startsWithMatches.push(p)
      } else if (name.includes(q)) {
        includesMatches.push(p)
      }
      if (startsWithMatches.length + includesMatches.length >= 20) break
    }

    return [...startsWithMatches, ...includesMatches]
  }, [searchQuery, products])

  // مراجع وإشارات التحكم بالتمرير الأفقي لشريط الأقسام السريع
  const categoriesContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollCategoriesRight, setCanScrollCategoriesRight] = useState(false)
  const [canScrollCategoriesLeft, setCanScrollCategoriesLeft] = useState(false)
  const [hasCategoriesOverflow, setHasCategoriesOverflow] = useState(false)

  // تحديث حالة أزرار تمرير الأقسام السريعة
  const updateCategoriesScrollState = useCallback(() => {
    const el = categoriesContainerRef.current
    if (!el) return
    const currentScroll = Math.abs(el.scrollLeft)
    const maxScroll = el.scrollWidth - el.clientWidth
    const hasOverflow = maxScroll > 4
    setHasCategoriesOverflow(hasOverflow)
    setCanScrollCategoriesRight(hasOverflow && currentScroll > 6)
    setCanScrollCategoriesLeft(hasOverflow && currentScroll < maxScroll - 6)
  }, [])

  const scrollCategories = useCallback((direction: 'right' | 'left') => {
    const el = categoriesContainerRef.current
    if (!el) return
    const delta = direction === 'left' ? -220 : 220
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    updateCategoriesScrollState()

    const handleResize = () => {
      updateCategoriesScrollState()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateCategoriesScrollState, viewTab, dbCategories.length, products?.length])

  const placeholders = useMemo(() => [
    'ابحث عن "كارتون زيت زير"...',
    'ابحث عن "كيس سكر الأسرة"...',
    'ابحث عن "كارتون زاهي العملاق"...',
    'ابحث عن "كيس أرز بسمتي"...',
    'ابحث عن "كارتون معجون طماطم"...',
    'ابحث عن "منظفات ومعقمات"...'
  ], [])

  // تدوير عبارات البحث المقترحة
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [placeholders.length])

  // تصفية المنتجات حسب البحث والتصنيف والترتيب
  const filteredProducts = useMemo(() => {
    if (!products) return []
    let list = [...products]

    // فلترة البحث
    if (deferredSearchQuery) {
      const q = deferredSearchQuery.toLowerCase()
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.profiles?.full_name?.toLowerCase().includes(q))
      )
    }

    // فلترة القسم
    if (selectedCategory !== "all") {
      const legacyCategory = CATEGORIES.find(c => c.id === selectedCategory)
      list = list.filter(p => {
        if (p.category_id === selectedCategory) return true
        if (legacyCategory && legacyCategory.keywords.length > 0) {
          return legacyCategory.keywords.some(keyword => 
            p.name.toLowerCase().includes(keyword) || 
            (p.description && p.description.toLowerCase().includes(keyword))
          )
        }
        return false
      })
    }

    // الترتيب والفهرسة
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price)
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price)
    } else if (sortBy === "newest") {
      // Products already come ordered by created_at desc from query
    } else {
      // popular (default) - مستقر بناء على معرف المنتج
      list.sort((a, b) => ((b.name.length * 7) % 19) - ((a.name.length * 7) % 19))
    }

    return list
  }, [products, deferredSearchQuery, selectedCategory, sortBy])

  // تجميع المجهزين لعرضهم في تبويب دليل المجهزين
  const groupedMerchants = useMemo(() => {
    if (!products) return []
    const map = new Map<string, { merchantId: string; merchantName: string; deliveryFee: number | null; count: number }>()
    
    products.forEach(p => {
      const mId = p.merchant_id
      const mName = p.profiles?.full_name || "مجهّز جملة معتمد"
      const dFee = p.profiles?.delivery_fee ?? 0
      if (!map.has(mId)) {
        map.set(mId, { merchantId: mId, merchantName: mName, deliveryFee: dFee, count: 0 })
      }
      map.get(mId)!.count += 1
    })

    return Array.from(map.values())
  }, [products])

  const scrollToMarket = () => {
    const el = document.getElementById("b2b-market-section")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="space-y-2.5 sm:space-y-3.5">
      
      {/* 1. واجهة الزائر الرسمية (Landing Hero Section) إن لم يكن مسجلاً */}
      {!user && (
        <div className="w-full bg-[#0c1c2e] text-white rounded-3xl overflow-hidden shadow-xl border border-slate-800 mb-8 mt-2">
          
          {/* شريط الإعلان عن التوصيل المجاني لكربلاء */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold border-b border-emerald-600/30">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base">🎁</span>
              <span><strong>بشرى لأصحاب المتاجر في كربلاء المقدسة:</strong> جميع طلبيات الجملة بدون أجور توصيل (التوصيل 0 د.ع متكفل به تطبيق جملتي).</span>
            </div>
            <span className="hidden md:inline-block bg-white text-emerald-900 px-3 py-0.5 rounded-full text-xs font-black">توصيل 0 د.ع</span>
          </div>

          <div className="p-6 sm:p-10 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* النص التعريفي */}
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>سوق الجملة العراقي الأول في كربلاء المقدسة</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-white tracking-tight">
                  بضاعة متجرك بالجملة،<br />
                  <span className="text-[#d97706]">من المجهّز والمصنع لباب محلك مباشرةً.</span>
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                  نجمع لك كبار تجار الجملة والموردين في كربلاء بآلاف الأصناف وبأسعار الجملة الصافية بالكارتون والكيس. اطلب وأنت في متجرك بضمان وصول البضاعة وبدون أجور توصيل.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href="/register">
                    <Button className="bg-[#d97706] hover:bg-[#b45309] text-white font-black px-6 py-6 text-sm sm:text-base rounded-xl shadow-lg border-0">
                      افتح حساب متجرك مجاناً
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={scrollToMarket}
                    className="bg-[#13273e] hover:bg-[#1b3a61] text-white border-slate-700 font-bold px-6 py-6 text-sm sm:text-base rounded-xl"
                  >
                    تصفّح بضائع الجملة
                    <ArrowDown className="w-4 h-4 mr-2 text-amber-400" />
                  </Button>
                </div>
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> توصيل 0 د.ع لباب المحل</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> بيع بالكارتون والكيس الصافي</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> مجهّزون محليون موثوقون</span>
                </div>
              </div>

              {/* دفتر أسعار الجملة اللحظي (Interactive B2B Notebook) */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-2xl p-5 sm:p-6 text-slate-900 shadow-2xl border-2 border-[#d97706]">
                  <div className="flex justify-between items-center pb-3 border-b border-dashed border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">سوق كربلاء الميداني</span>
                      <h3 className="font-black text-slate-800 text-sm sm:text-base">دفتر أسعار الجملة اللحظي</h3>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full">سعر الجملة الصافي</span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs sm:text-sm py-1">
                    <div className="py-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-black text-slate-800">زيت طعام زير (كرتون 12 بطل × 1 لتر)</div>
                        <div className="text-[11px] text-slate-500">المجهّز: شركة الفرات للتوزيع</div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-[#047857] text-sm sm:text-base">23,500 د.ع</div>
                        <div className="text-[10px] text-slate-400">(1,958 د.ع / بطل)</div>
                      </div>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-black text-slate-800">سكر الأسرة نخب أول (كيس 50 كغم)</div>
                        <div className="text-[11px] text-slate-500">المجهّز: مخازن النور كربلاء</div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-[#047857] text-sm sm:text-base">61,000 د.ع</div>
                        <div className="text-[10px] text-slate-400">(كيس معتمد)</div>
                      </div>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-black text-slate-800">منظف زاهي العملاق (كرتون 24 بطل × 1 لتر)</div>
                        <div className="text-[11px] text-slate-500">المجهّز: وكالة المنظفات المركزية</div>
                      </div>
                      <div className="text-left">
                        <div className="font-black text-[#047857] text-sm sm:text-base">26,000 د.ع</div>
                        <div className="text-[10px] text-slate-400">(1,083 د.ع / بطل)</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-amber-900 font-bold block">التوصيل لباب متجرك:</span>
                      <span className="text-[11px] text-amber-700">تسهيلات حساب آجل للمتاجر</span>
                    </div>
                    <span className="text-emerald-700 font-black text-sm sm:text-base">0 د.ع مجاني</span>
                  </div>
                </div>
              </div>

            </div>

            {/* الأقسام الثلاثة: كيف يعمل */}
            <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
              <div className="bg-[#102237] p-5 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-[#d97706] font-black text-lg block">01. سجّل متجرك في دقيقة</span>
                <p className="text-xs text-slate-300 leading-relaxed">برقم هاتفك واسم محلك في كربلاء لفتح حساب التجزئة فوراً وبدء الطلب.</p>
              </div>
              <div className="bg-[#102237] p-5 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-[#d97706] font-black text-lg block">02. اطلب بالكارتون والكيس</span>
                <p className="text-xs text-slate-300 leading-relaxed">قارن أسعار الموردين واعرف تفاصيل كل كارتون قبل الشراء وبدون مفرد.</p>
              </div>
              <div className="bg-[#102237] p-5 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-emerald-400 font-black text-lg block">03. استلم مجاناً لباب المحل</span>
                <p className="text-xs text-slate-300 leading-relaxed">تصلك بضاعتك مجاناً أصولياً، وافحص طلبيتك ثم ادفع نقداً أو بالآجل.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. شريط التحكم والبحث الموحد المدمج (Unified Compact Command Center) */}
      <div id="b2b-market-section" className="bg-white dark:bg-card rounded-2xl p-2 sm:p-3 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-1.5 sm:space-y-2">
        
        {/* صف البحث الرشيق مع محدد الفرز وزر المجهزين المدمج */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* حقل البحث الذكي الرشيق مع الإكمال والفلترة اللحظية (AutoComplete) */}
          <div className="relative flex-grow min-w-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10" />
            <Input 
              placeholder="" 
              className="pr-8.5 pl-3 h-9 sm:h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-[#d97706] rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {searchQuery === "" && !isFocused && (
              <div 
                key={placeholderIndex}
                className="absolute right-8.5 top-1/2 -translate-y-1/2 pointer-events-none select-none text-slate-400 text-xs font-medium animate-placeholder-fade truncate max-w-[180px] sm:max-w-none"
              >
                {placeholders[placeholderIndex]}
              </div>
            )}

            {/* القائمة المنسدلة الذكية للاقتراحات المصفاة لحظياً (تأخذ 80% من عرض الشاشة لعدم اقتصاص الأسماء) */}
            {isFocused && searchQuery.trim().length > 0 && searchSuggestions.length > 0 && (
              <div 
                className="absolute top-full mt-1.5 right-0 w-[80vw] sm:w-[480px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80"
                onMouseDown={(e) => e.preventDefault()}
              >
                {searchSuggestions.slice(0, 15).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery(item.name)
                      setIsFocused(false)
                    }}
                    className="w-full text-right px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-slate-400 group-hover:text-[#d97706] shrink-0 text-sm">🔍</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs sm:text-sm">
                        {item.name.replace(/شوال/g, 'كيس')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-[11px] whitespace-nowrap">
                      <span className="text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {item.unit_type || "كرتون"}
                      </span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400">
                        {Number(item.price).toLocaleString('en-US')} د.ع
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* محدد الفرز والترتيب المدمج */}
          {viewTab === "products" && (
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="ترتيب عروض الجملة"
                className="h-9 sm:h-10 px-2 sm:px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] sm:text-xs font-bold focus:outline-none focus:border-[#d97706] cursor-pointer"
              >
                <option value="popular">⚡ الأكثر رواجاً</option>
                <option value="price_asc">💰 الأقل سعراً</option>
                <option value="price_desc">💎 الأعلى سعراً</option>
                <option value="newest">✨ الأحدث</option>
              </select>
            </div>
          )}

          {/* زر التبديل بين البضائع ودليل المجهزين */}
          <button
            type="button"
            onClick={() => setViewTab(viewTab === "products" ? "merchants" : "products")}
            className={cn(
              "h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border text-[11px] sm:text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5",
              viewTab === "merchants" 
                ? "bg-[#0c1c2e] text-white border-[#0c1c2e] shadow-xs" 
                : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
            )}
            title={viewTab === "products" ? "عرض دليل المجهزين" : "تصفح بضائع الجملة"}
          >
            <Store className="w-3.5 h-3.5 text-[#d97706]" />
            <span className="hidden xs:inline sm:inline">
              {viewTab === "products" ? `المجهّزون (${groupedMerchants.length})` : "البضائع"}
            </span>
          </button>

        </div>

        {/* شريط الأقسام السريع مع أسهم التمرير الأفقية الذكية (Horizontal Micro-Ribbon with Scroll Controls) */}
        <div className="relative flex items-center gap-1 w-full pt-0.5">
          {/* سهم التمرير الأيمن (نحو البداية) */}
          <button
            type="button"
            onClick={() => scrollCategories('right')}
            disabled={!canScrollCategoriesRight}
            aria-label="تمرير الأقسام لليمين"
            className={cn(
              "shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer",
              !hasCategoriesOverflow && "hidden",
              !canScrollCategoriesRight ? "opacity-25 pointer-events-none" : "opacity-100"
            )}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* حاوية الأقسام القابلة للتمرير */}
          <div 
            ref={categoriesContainerRef}
            onScroll={updateCategoriesScrollState}
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none select-none scroll-smooth flex-1"
          >
            <button
              type="button"
              onClick={() => {
                setViewTab("products")
                setSelectedCategory("all")
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer border whitespace-nowrap",
                viewTab === "products" && selectedCategory === "all"
                  ? "bg-[#0c1c2e] text-white border-[#0c1c2e] shadow-xs font-black"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              )}
            >
              جميع المواد ({products?.length || 0})
            </button>

            {(dbCategories.length > 0 ? dbCategories : CATEGORIES.slice(1)).map((cat) => {
              const isActive = viewTab === "products" && selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setViewTab("products")
                    setSelectedCategory(cat.id)
                  }}
                  className={cn(
                    "px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer border flex items-center gap-1 whitespace-nowrap",
                    isActive
                      ? "bg-[#0c1c2e] text-white border-[#0c1c2e] shadow-xs font-black"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  )}
                >
                  <span className="text-xs">{(cat as any).emoji || "🏷️"}</span>
                  <span>{cat.name.replace(/شوال/g, 'كيس')}</span>
                </button>
              )
            })}
          </div>

          {/* سهم التمرير الأيسر (نحو المزيد من الأقسام) */}
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            disabled={!canScrollCategoriesLeft}
            aria-label="تمرير الأقسام لليسار"
            className={cn(
              "shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer",
              !hasCategoriesOverflow && "hidden",
              !canScrollCategoriesLeft ? "opacity-25 pointer-events-none" : "opacity-100"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 3. عرض المحتوى: شبكة البضائع المباشرة أو دليل المجهزين */}
      {viewTab === "products" ? (
        
        <div className="space-y-2 sm:space-y-3">

          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
              <PackageOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold">لا توجد مواد تطابق خيارات البحث أو القسم المحدد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredProducts.map((product) => {
                const merchantName = product.profiles?.full_name || "مجهّز جملة معتمد"
                const unitClean = (product.unit_type || "كرتون").replace(/شوال/g, 'كيس')
                
                // البحث عن العنصر في السلة
                const initialCartItem = cartItems.find(i => i.product_id === product.id)

                return (
                  <div 
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 hover:border-[#d97706]/60 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* صورة المادة مع شارة التوصيل المجاني */}
                      <div className="aspect-square bg-slate-50 rounded-xl relative overflow-hidden flex items-center justify-center mb-2.5 border border-slate-100">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 25vw"
                            className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <PackageOpen className="w-10 h-10 text-slate-300" />
                        )}
                        <span className="absolute top-2 right-2 bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm">
                          توصيل 0 د.ع
                        </span>
                      </div>

                      {/* اسم المجهّز */}
                      <Link 
                        href={`/store/${product.merchant_id}`}
                        className="text-[10px] sm:text-xs font-bold text-slate-500 hover:text-[#d97706] block line-clamp-1 mb-1"
                      >
                        المجهّز: {merchantName}
                      </Link>

                      {/* اسم المادة */}
                      <h3 className="font-black text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 min-h-[2.4rem] mb-2">
                        {product.name.replace(/شوال/g, 'كيس')}
                      </h3>

                      {/* مواصفة وحدة الجملة وسعر القطعة الصافي */}
                      <div className="bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                        <span>📦 الوحدة: {unitClean}</span>
                        <span className="font-black text-emerald-700 dark:text-emerald-400">
                          {Number(product.price).toLocaleString('en-US')} د.ع
                        </span>
                      </div>
                    </div>

                    <div>
                      {/* زر الإضافة السريع للسلة مع عداد الكميات */}
                      <AddToCartButton 
                        user={user}
                        productId={product.id}
                        productPrice={product.price}
                        unitType={unitClean}
                        initialCartItem={initialCartItem}
                        variant="compact"
                        maxQuantity={product.stock_quantity ?? 999}
                      />
                    </div>

                  </div>
                )
              })}
            </div>
          )}

        </div>

      ) : (

        /* تبويب دليل المجهزين في كربلاء */
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-2 h-5 bg-[#d97706] rounded-full inline-block" />
              <span>دليل كبار مجهزي وتجار الجملة المعتمدين في كربلاء</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {groupedMerchants.map((m) => (
              <Link 
                key={m.merchantId}
                href={`/store/${m.merchantId}`}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-[#d97706] hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#0c1c2e] group-hover:text-white transition-colors flex items-center justify-center text-slate-700 text-xl font-bold">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-[#d97706] transition-colors">
                      {m.merchantName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mt-1">
                      <span>{m.count} مواد جملة متاحة</span>
                      <span>•</span>
                      <span className="text-emerald-700">توصيل 0 د.ع لكربلاء</span>
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-[#d97706] group-hover:-translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>

      )}

    </div>
  )
}
