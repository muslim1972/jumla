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
  CheckCircle2,
  Sparkles,
  X
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORIES } from "@/features/products/lib/taxonomy"

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
  units?: { type?: string; price?: number | string; multiplier_to_base?: number }[]
}

// دالة تسوية الحروف العربية للبحث الذكي المرن (الهمزات، التاء المربوطة، التشكيل)
function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .trim()
}

export function ProductExplorer({ 
  products, 
  user,
  dbCategories = []
}: { 
  products: Product[] | null,
  user: unknown,
  profile?: unknown,
  dbCategories?: { id: string; name: string; icon_url: string | null; emoji?: string }[]
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState<"price_asc" | "popular" | "price_desc" | "newest">("popular")
  const [viewTab, setViewTab] = useState<"products" | "merchants">("products")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // اقتراحات البحث والفلترة اللحظية (AutoComplete)
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !products) return []
    const rawQ = searchQuery.trim().toLowerCase()
    const normQ = normalizeArabic(searchQuery)
    
    const startsWithMatches: Product[] = []
    const includesMatches: Product[] = []

    for (const p of products) {
      const searchableValues = [p.name, p.description || "", p.profiles?.full_name || "", p.unit_type || "", String(p.price ?? "")]
      const rawValues = searchableValues.map((value) => value.toLowerCase())
      const normalizedValues = searchableValues.map(normalizeArabic)

      if (rawValues.some((value) => value.startsWith(rawQ)) || (normQ && normalizedValues.some((value) => value.startsWith(normQ)))) {
        startsWithMatches.push(p)
      } else if (rawValues.some((value) => value.includes(rawQ)) || (normQ && normalizedValues.some((value) => value.includes(normQ)))) {
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
    "ابحث باسم المادة أو التاجر...",
    "ابحث بوصف المادة أو وحدتها...",
    "ابحث عن مادة بسعرها...",
    "اكتب أي معلومة تعرفها عن المادة..."
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
      const rawQ = deferredSearchQuery.toLowerCase()
      const normQ = normalizeArabic(deferredSearchQuery)
      list = list.filter(p => {
        const rawName = p.name.toLowerCase()
        const searchableValues = [
          rawName,
          normalizeArabic(p.name),
          p.description?.toLowerCase() || "",
          p.description ? normalizeArabic(p.description) : "",
          p.profiles?.full_name?.toLowerCase() || "",
          p.profiles?.full_name ? normalizeArabic(p.profiles.full_name) : "",
          p.unit_type?.toLowerCase() || "",
          p.unit_type ? normalizeArabic(p.unit_type) : "",
          String(p.price ?? ""),
        ]

        return searchableValues.some((value) => value.includes(rawQ) || (normQ && value.includes(normQ)))
      })
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

  return (
    <div className="space-y-2.5 sm:space-y-3.5">
      
      {/* 1. واجهة الزائر الرشيقة المدمجة (Compact Above-The-Fold B2B Hero) */}
      {!user && (
        <div className="w-full bg-[#0c1c2e] text-white rounded-2xl overflow-hidden shadow-md border border-slate-800 mb-2.5 mt-1">
          <div className="p-3 sm:p-4 lg:p-5 space-y-2 sm:space-y-2.5">
            {/* شارة سوق الجملة الأول ممركزة في وسط الحاوية بخط أكبر وأوضح */}
            <div className="w-full flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-black shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>سوق الجملة العراقي الأول في كربلاء المقدسة</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0 flex-1 text-center sm:text-right">
                <h1 className="text-sm sm:text-base lg:text-lg font-black leading-snug text-white tracking-tight">
                  بضاعة متجرك بالجملة بالكرتون والكيس، <span className="text-[#d97706]">من المصنع والمجهّز لباب محلك مباشرةً.</span>
                </h1>
              </div>

              <div className="shrink-0 flex items-center justify-center">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-[#d97706] hover:bg-[#b45309] text-white font-black px-4 py-2 h-9 sm:h-10 text-xs sm:text-sm rounded-xl shadow-md border-0 transition-all cursor-pointer">
                    افتح حساب متجرك مجاناً
                  </Button>
                </Link>
              </div>
            </div>

            {/* شارات الثقة السريعة المصغرة */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-[10px] sm:text-xs text-slate-300 font-bold">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> بيع بالكارتون والكيس الصافي</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> مجهّزون محليون موثوقون</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. شريط التحكم والبحث الموحد المدمج (Unified Compact Command Center) */}
      <div id="b2b-market-section" className="bg-white dark:bg-card rounded-2xl p-2 sm:p-3 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-1.5 sm:space-y-2">
        
        {/* حقل البحث الذكي الكامل العرض */}
        <div className="relative w-full">
          
          {/* حقل البحث الذكي الرشيق مع الإكمال والفلترة اللحظية (AutoComplete) */}
          <div className="relative w-full min-w-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10" />
            <Input 
              ref={searchInputRef}
              aria-label="ابحث باسم المادة أو التاجر أو الوصف أو الوحدة أو السعر"
              placeholder="" 
              className="w-full pr-8.5 pl-8 sm:pl-9 h-9 sm:h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-[#d97706] rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-foreground"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsFocused(true)
              }}
              onClick={() => setIsFocused(true)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setIsFocused(true)
                  searchInputRef.current?.focus()
                }}
                aria-label="مسح حقل البحث"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200/90 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-800 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {searchQuery === "" && !isFocused && (
              <div 
                key={placeholderIndex}
                aria-hidden="true"
                className="absolute right-8.5 left-8 top-1/2 -translate-y-1/2 pointer-events-none select-none text-slate-600 dark:text-slate-300 text-xs font-medium animate-placeholder-fade truncate"
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

        </div>

        {viewTab === "products" && (
          <div className="flex items-center justify-between gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "price_asc" | "popular" | "price_desc" | "newest")}
              aria-label="ترتيب عروض الجملة"
              className="h-9 sm:h-10 px-2 sm:px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] sm:text-xs font-bold focus:outline-none focus:border-[#d97706] cursor-pointer"
            >
              <option value="popular">⚡ الأكثر رواجاً</option>
              <option value="price_asc">💰 الأقل سعراً</option>
              <option value="price_desc">💎 الأعلى سعراً</option>
              <option value="newest">✨ الأحدث</option>
            </select>

            <button
              type="button"
              onClick={() => setViewTab("merchants")}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-black shrink-0 transition-all cursor-pointer flex items-center gap-2 bg-amber-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-amber-200 dark:border-slate-800 hover:bg-amber-100"
              title="عرض دليل كبار تجار الجملة"
            >
              <Store className="w-5 h-5 text-[#d97706]" />
              <span>كبار تجار الجملة</span>
              <span className="text-[10px] font-bold opacity-75">({groupedMerchants.length})</span>
            </button>
          </div>
        )}

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
                  <span className="text-xs">{"emoji" in cat && cat.emoji ? cat.emoji : "🏷️"}</span>
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

                return (
                  <Link
                    key={product.id}
                    href={`/store/${encodeURIComponent(product.merchant_id)}?product=${encodeURIComponent(product.id)}`}
                    prefetch={false}
                    aria-label={`عرض ${product.name} في متجر ${merchantName}`}
                    className="bg-white rounded-2xl border border-slate-200 px-3 sm:px-4 pb-3 sm:pb-4 pt-0 hover:border-[#d97706]/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97706] transition-all flex flex-col justify-between group"
                  >
                    {/* صورة المادة بعرض البطاقة ومحاذاة أعلى حافتها */}
                    <div className="aspect-video bg-slate-50 rounded-xl relative overflow-hidden flex items-center justify-center mb-2.5 border border-slate-100">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-contain object-top p-2 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <PackageOpen className="w-10 h-10 text-slate-300" />
                      )}
                    </div>

                    <div>
                      {/* اسم المجهّز */}
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 block line-clamp-1 mb-1">
                        المجهّز: {merchantName}
                      </span>

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
                  </Link>
                )
              })}
            </div>
          )}

        </div>

      ) : (

        /* تبويب دليل المجهزين في كربلاء */
        <div className="space-y-4">
          <section
            aria-labelledby="merchant-directory-title"
            className="relative isolate min-h-[142px] overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-l from-[#fff0c2] via-[#fffaf0] to-[#ffe1a3] shadow-[0_10px_28px_rgba(217,119,6,0.12)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:min-h-[164px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_80%,rgba(249,115,22,0.22),transparent_48%)]" />
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 260 160"
              className="pointer-events-none absolute bottom-0 left-0 h-full w-[45%] text-amber-600/80 dark:text-amber-400/70"
              fill="none"
            >
              <path d="M22 150h220" stroke="currentColor" strokeOpacity=".32" strokeWidth="3" />
              <path d="M60 148V91h140v57" fill="#d97706" fillOpacity=".14" />
              <path d="M60 96h140M70 112h120M70 132h120" stroke="currentColor" strokeOpacity=".45" strokeWidth="2" />
              <path d="M86 147v-24a14 14 0 0 1 28 0v24m31 0v-24a14 14 0 0 1 28 0v24" stroke="currentColor" strokeOpacity=".72" strokeWidth="3" />
              <path d="M91 91c0-25 16-45 39-59 23 14 39 34 39 59H91Z" fill="url(#wholesale-dome-fill)" />
              <path d="M130 32V20m-5 0h10m-5-7v7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path d="M64 90V47h14v43m104 0V47h14v43" fill="#f59e0b" fillOpacity=".76" />
              <path d="m60 48 11-18 11 18m96 0 11-18 11 18" fill="#fbbf24" />
              <path d="M69 58h4m100 0h4" stroke="#fff7ed" strokeWidth="3" strokeLinecap="round" />
              <path d="M26 148c9-22 8-39-3-54m3 54c-12-17-20-20-25-20m25 20c-4-22 1-37 16-48" stroke="currentColor" strokeOpacity=".58" strokeWidth="3" strokeLinecap="round" />
              <defs>
                <linearGradient id="wholesale-dome-fill" x1="91" y1="32" x2="169" y2="91" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fcd34d" />
                  <stop offset="1" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </svg>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#fffaf0]/95 via-[#fffaf0]/55 to-transparent dark:from-slate-900/95 dark:via-slate-900/55" />

            <div className="relative z-10 flex min-h-[142px] items-center justify-between px-4 py-4 sm:min-h-[164px] sm:px-6">
              <div className="max-w-[76%] space-y-2 sm:max-w-[68%] sm:space-y-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-white/75 px-2.5 py-1 text-[10px] font-black text-amber-800 shadow-sm dark:border-amber-400/30 dark:bg-slate-800/80 dark:text-amber-300 sm:text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  كربلاء المقدسة
                </span>
                <h2 id="merchant-directory-title" className="text-lg font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  دليل تجار الجملة الكبار
                </h2>
                <p className="max-w-md text-[11px] font-bold leading-relaxed text-amber-950/80 dark:text-slate-200 sm:text-sm">
                  كل ما يحتاجه متجرك، من مجهزين معتمدين وبأسعار تنافسية.
                </p>
                <button
                  type="button"
                  onClick={() => setViewTab("products")}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#0c1c2e] px-2.5 text-[10px] font-black text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 sm:h-8 sm:px-3 sm:text-xs"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  العودة للمواد
                </button>
              </div>
            </div>
          </section>

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
