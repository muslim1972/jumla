"use client"

import { useState, useMemo, useRef, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Star, Info, Percent, Search, LayoutGrid, List, MessageSquare, CheckCircle2, Loader2 } from "lucide-react"
import { ProductCard } from "@/features/products/components/product-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RatingDialog } from "@/features/orders/components/rating-dialog"
import { createClient } from "@/utils/supabase/client"
import { upsertRating, getUserRatingForMerchant } from "@/features/orders/actions/rating-actions"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { filterStoreProductsByCategory } from "./prioritize-selected-product"

export function StoreClient({ 
  merchant, 
  products,
  categories,
  user,
  cartItems,
  userRole,
  salesRankingAvailable,
  averageRating = 0,
  ratingCount = 0,
  reviews = [],
  userCompletedOrderId = null
}: { 
  merchant: any
  products: any[]
  categories: { id: string; name: string }[]
  user: any
  cartItems: any[]
  userRole: string
  salesRankingAvailable: boolean
  averageRating?: number
  ratingCount?: number
  reviews?: any[]
  userCompletedOrderId?: string | null
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const categoriesContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollCategoriesRight, setCanScrollCategoriesRight] = useState(false)
  const [canScrollCategoriesLeft, setCanScrollCategoriesLeft] = useState(false)
  const router = useRouter()
  const [, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  // نوافذ التقييم والمراجعات
  const [showReviewsModal, setShowReviewsModal] = useState(false)

  // المستخدم الحالي (فحص من جانب العميل إن لم يكن متوفراً من السيرفر)
  const [clientUser, setClientUser] = useState<any>(user)
  useEffect(() => {
    if (!user) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setClientUser(data.user)
      })
    }
  }, [user])

  // حالة التقييم المباشر داخل نافذة المتجر
  const [myRating, setMyRating] = useState(0)
  const [myHoverRating, setMyHoverRating] = useState(0)
  const [myComment, setMyComment] = useState("")
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [ratingSuccess, setRatingSuccess] = useState(false)
  const [ratingError, setRatingError] = useState<string | null>(null)
  const [reviewsList, setReviewsList] = useState<any[]>(reviews)

  // حساب المتوسط وعدد التقييمات تلقائياً من قائمة التقييمات المعروضة
  const calculatedAvg = useMemo(() => {
    if (!reviewsList || reviewsList.length === 0) return 0
    const sum = reviewsList.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0)
    return Math.round((sum / reviewsList.length) * 10) / 10
  }, [reviewsList])

  const calculatedCount = reviewsList?.length || 0

  // جلب تقييم المستخدم الحالي لهذا المتجر عند فتح النافذة
  useEffect(() => {
    if (showReviewsModal && clientUser) {
      getUserRatingForMerchant(merchant.id).then(res => {
        if (res?.rating) {
          setMyRating(res.rating.rating)
          setMyComment(res.rating.comment || "")
        }
      })
    }
  }, [showReviewsModal, clientUser, merchant.id])

  // إخفاء تنبيه النجاح وإغلاق النافذة العائمة تلقائياً بعد 1.5 ثانية
  useEffect(() => {
    if (!ratingSuccess) return
    const timer = setTimeout(() => {
      setRatingSuccess(false)
      setShowReviewsModal(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [ratingSuccess])

  const handleSaveStoreRating = async () => {
    if (myRating === 0) {
      setRatingError("الرجاء تحديد عدد النجوم للتقييم")
      return
    }
    setRatingError(null)
    setIsSubmittingRating(true)
    try {
      const res = await upsertRating({
        orderId: userCompletedOrderId,
        ratedId: merchant.id,
        ratedRole: 'merchant',
        rating: myRating,
        comment: myComment
      })
      if (res.error) {
        setRatingError(res.error)
      } else {
        setRatingSuccess(true)
        // تحديث القائمة محلياً فوراً لتنعكس النجوم والمتوسط بدون انتظار
        const newReview = {
          id: 'temp-' + Date.now(),
          rating: myRating,
          comment: myComment,
          created_at: new Date().toISOString(),
          reviewerName: clientUser?.user_metadata?.store_name || clientUser?.user_metadata?.full_name || 'أنت (تقييمك)'
        }
        setReviewsList(prev => [newReview, ...prev.filter(r => r.reviewerName !== 'أنت (تقييمك)')])
        startTransition(() => {
          router.refresh()
        })
      }
    } catch {
      setRatingError("حدث خطأ في حفظ التقييم")
    } finally {
      setIsSubmittingRating(false)
    }
  }

  const categoryFilters = [
    { id: null, name: salesRankingAvailable ? "الأكثر مبيعاً" : "المواد" },
    ...categories.map((category) => ({ id: category.id, name: category.name })),
  ]

  const filteredProducts = useMemo(() => {
    const categoryProducts = filterStoreProductsByCategory(products, selectedCategory)
    const query = debouncedSearchQuery.trim().toLocaleLowerCase()
    if (!query) return categoryProducts

    return categoryProducts.filter((product) =>
      (product.name && product.name.toLocaleLowerCase().includes(query)) ||
      (product.description && product.description.toLocaleLowerCase().includes(query)),
    )
  }, [products, selectedCategory, debouncedSearchQuery])

  const updateCategoriesScrollState = useCallback(() => {
    const container = categoriesContainerRef.current
    if (!container) return

    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth)
    const currentScroll = Math.abs(container.scrollLeft)
    const hasOverflow = maxScroll > 6

    setCanScrollCategoriesRight(hasOverflow && currentScroll > 6)
    setCanScrollCategoriesLeft(hasOverflow && currentScroll < maxScroll - 6)
  }, [])

  const scrollCategories = (direction: "left" | "right") => {
    categoriesContainerRef.current?.scrollBy({
      left: direction === "left" ? -240 : 240,
      behavior: "smooth",
    })
  }

  useEffect(() => {
    const container = categoriesContainerRef.current
    updateCategoriesScrollState()
    if (!container) return

    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateCategoriesScrollState)
    observer?.observe(container)
    window.addEventListener("resize", updateCategoriesScrollState)

    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", updateCategoriesScrollState)
    }
  }, [categories, updateCategoriesScrollState])

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
      {/* Sticky Header Group: Store Info + Tabs */}
      <div className="sticky top-0 z-50 bg-background shadow-sm border-b border-border/50 flex flex-col">
        {/* Artistic Merchant Header */}
        <div className="px-4 pt-[48px] pb-2 sm:pt-[52px] sm:pb-3 bg-background/95 backdrop-blur-md border-b border-border/40">
          <div className="flex flex-col items-center justify-center gap-2 max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-l from-brand-orange to-brand-blue drop-shadow-sm">
              {merchant.full_name}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground font-medium">
              <button
                type="button"
                onClick={() => setShowReviewsModal(true)}
                className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full font-bold shadow-sm transition-all border border-amber-500/30 cursor-pointer active:scale-95"
                title="اضغط لعرض التقييمات وآراء العملاء"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{calculatedCount > 0 ? `${calculatedAvg.toFixed(1)} (${calculatedCount} تقييم)` : "متجر جديد (0 تقييم)"}</span>
                <span className="text-[10px] underline font-bold mr-0.5 text-amber-600 dark:text-amber-300">الآراء ⭐</span>
              </button>
              <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                <Info className="w-3.5 h-3.5 text-brand-blue" />
                متجر جملة
              </div>
            </div>
          </div>
        </div>

        {/* Categories Navigation */}
        <div className="bg-background/95 backdrop-blur overflow-hidden pb-2">
          <div dir="rtl" className="flex items-center gap-1 max-w-4xl mx-auto px-2 py-1">
            <button
              type="button"
              aria-label="تمرير الأقسام لليمين"
              onClick={() => scrollCategories("right")}
              disabled={!canScrollCategoriesRight}
              className="h-9 w-9 shrink-0 rounded-full border border-border bg-card text-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div
              ref={categoriesContainerRef}
              onScroll={updateCategoriesScrollState}
              className="flex flex-1 min-w-0 overflow-x-auto hide-scrollbar py-1 gap-2"
            >
              {categoryFilters.map((category) => (
                <button
                  key={category.id ?? "all"}
                  type="button"
                  aria-pressed={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0",
                    selectedCategory === category.id
                      ? "bg-brand-blue text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="تمرير الأقسام لليسار"
              onClick={() => scrollCategories("left")}
              disabled={!canScrollCategoriesLeft}
              className="h-9 w-9 shrink-0 rounded-full border border-border bg-card text-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid Sections */}
      <div className="max-w-4xl mx-auto px-4 mt-4 mb-4 flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن منتج..."
            className="pr-10 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex bg-card border rounded-md shrink-0">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "px-3 py-2 flex items-center justify-center transition-colors rounded-r-md",
              viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "px-3 py-2 flex items-center justify-center transition-colors rounded-l-md border-r",
              viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-2 mb-6">
        {filteredProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {debouncedSearchQuery ? "لا توجد مواد تطابق البحث." : "لا توجد مواد في هذا القسم لدى هذا التاجر."}
          </p>
        ) : (
          <div className={cn(
            "gap-3 sm:gap-4",
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
              : "flex flex-col",
          )}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                user={user}
                cartItems={cartItems}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
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

      {/* نافذة تقييمات المتجر والآراء والتقييم المباشر */}
      <Dialog open={showReviewsModal} onOpenChange={setShowReviewsModal}>
        <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto" dir="rtl">
          {ratingSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 gap-3 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in-50 duration-300" />
              </div>
              <h3 className="text-2xl font-black text-foreground">شكراً لتقييمكم!</h3>
              <p className="text-xs text-muted-foreground">تم حفظ تقييمك ورأيك للمتجر بنجاح</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <div className="bg-amber-500/10 p-2 rounded-xl text-amber-600">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                  تقييمات وآراء العملاء عن {merchant.full_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* ملخص التقييم */}
                <div className="bg-muted/40 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border border-border/50 text-center">
                  <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <span>{calculatedCount > 0 ? calculatedAvg.toFixed(1) : "0.0"}</span>
                    <span className="text-base text-muted-foreground font-normal">/ 5.0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-5 h-5 ${
                          s <= Math.round(calculatedAvg)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {calculatedCount > 0 ? `مبني على ${calculatedCount} تقييم من أصحاب الماركت` : "لا توجد تقييمات سابقة حتى الآن"}
                  </p>
                </div>

                {/* قسم التقييم المباشر للمتجر */}
                {clientUser ? (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {myRating > 0 ? "تعديل تقييمك للمتجر:" : "أضف تقييمك ورأيك في المتجر:"}
                      </span>
                      {myRating > 0 && (
                        <span className="text-[10px] text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded-full font-bold">
                          {myRating} من 5 نجوم
                        </span>
                      )}
                    </div>

                    {/* النجوم القابلة للنقر */}
                    <div className="flex items-center justify-center gap-2 py-1 flex-row-reverse">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="p-1.5 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                          onMouseEnter={() => setMyHoverRating(star)}
                          onMouseLeave={() => setMyHoverRating(0)}
                          onClick={() => {
                            setMyRating(star)
                            setRatingError(null)
                          }}
                        >
                          <Star
                            className={`w-8 h-8 sm:w-9 sm:h-9 ${
                              (myHoverRating ? star <= myHoverRating : star <= myRating)
                                ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                : "text-muted-foreground/30"
                            } transition-colors`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* حقل التعليق */}
                    <div className="space-y-1">
                      <textarea
                        placeholder="اكتب تجربتك ورأيك عن تعامل هذا المتجر (اختياري)..."
                        value={myComment}
                        onChange={(e) => setMyComment(e.target.value)}
                        className="flex min-h-[70px] w-full rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 resize-none"
                      />
                    </div>

                    {ratingError && (
                      <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 text-center font-bold">
                        {ratingError}
                      </p>
                    )}

                    <Button
                      className="w-full font-bold text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-1.5 shadow-sm"
                      onClick={handleSaveStoreRating}
                      disabled={isSubmittingRating || myRating === 0}
                    >
                      {isSubmittingRating ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        <>
                          <Star className="w-3.5 h-3.5 fill-white text-white" />
                          {myRating > 0 ? "حفظ التقييم ⭐" : "حدد النجوم أولاً لحفظ التقييم"}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/40 border rounded-xl text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      سجّل الدخول لتتمكن من تقييم هذا المتجر وإبداء رأيك
                    </p>
                    <Link href="/login">
                      <Button size="sm" variant="outline" className="text-xs font-bold">
                        تسجيل الدخول
                      </Button>
                    </Link>
                  </div>
                )}

                {/* قائمة التعليقات والآراء */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    آراء أصحاب الماركت ({reviewsList.length})
                  </h4>

                  {reviewsList.length === 0 ? (
                    <div className="text-center py-6 bg-muted/10 rounded-xl border border-dashed border-border/60">
                      <Star className="w-7 h-7 mx-auto mb-1.5 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">لا توجد آراء مسجلة بعد. كن أول من يقيّم هذا المتجر!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pl-1 pr-1 custom-scrollbar">
                      {reviewsList.map((rev: any) => (
                        <div key={rev.id} className="p-3 rounded-xl bg-card border border-border/60 space-y-1.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">{rev.reviewerName}</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {rev.comment ? (
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{rev.comment}</p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/60 italic">بدون تعليق كتابي</p>
                          )}
                          <div className="text-[9px] text-muted-foreground/50 text-left" dir="ltr">
                            {new Date(rev.created_at).toLocaleDateString('ar-IQ', { dateStyle: 'short' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
