"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Minus, Plus, Trash2, ShoppingBag, Loader2, Check,
  ChevronDown, ChevronUp, Package, Truck, Store
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { removeFromCart, updateQuantity, createOrder, getMyOrders } from "./actions"
import { useState, useCallback, useMemo, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { roundTo250 } from "@/lib/round-to-250"
import { generateVerificationCode } from "@/lib/generate-code"
import { CheckoutDialog } from "@/components/checkout-dialog"
import { InvoicePreview, type InvoiceItem } from "@/components/invoice-preview"
import { MyOrders, type OrderData } from "@/components/my-orders"
import { ArchiveDialog } from "@/components/archive-dialog"
import { Archive } from "lucide-react"

// نوع عنصر السلة
interface CartItemType {
  id: string
  quantity: number
  created_at: string
  unit_type?: string
  products: {
    id: string
    merchant_id: string
    name: string
    price: number
    unit_type: string
    units?: any[]
    image_url: string | null
    profiles?: {
      delivery_fee: number | null
      full_name?: string
    } | null
  }
}

// دالة مساعدة للحصول على السعر الصحيح للعنصر
function getItemPrice(item: CartItemType): number {
  const product = item.products;
  const targetUnit = item.unit_type || product.unit_type;
  if (product.units && Array.isArray(product.units)) {
    const unitObj = product.units.find(u => u.type === targetUnit);
    if (unitObj && unitObj.price) {
      return Number(unitObj.price);
    }
  }
  return Number(product.price);
}

// نوع مجموعة التاجر
interface MerchantGroup {
  merchantId: string
  merchantName: string
  deliveryFee: number
  items: CartItemType[]
  lastAddedAt: string
}

export function CartClient({ 
  initialItems, 
  buyerProfile,
  userId
}: { 
  initialItems: CartItemType[],
  buyerProfile?: { store_name?: string, address?: string, phone?: string },
  userId: string
}) {
  const [items, setItems] = useState<CartItemType[]>(initialItems)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  // حالة الأقسام المطوية (مفتوح/مغلق لكل تاجر)
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set())

  // حالة تدفق الشراء
  const [checkoutMerchantId, setCheckoutMerchantId] = useState<string | null>(null)
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [deliveryInfo, setDeliveryInfo] = useState<{
    storeName: string
    address: string
    phone: string
  } | null>(buyerProfile ? {
    storeName: buyerProfile.store_name || "",
    address: buyerProfile.address || "",
    phone: buyerProfile.phone || ""
  } : null)
  const [verificationCode, setVerificationCode] = useState("")

  // حالة تتبع المشتريات
  const [showMyOrders, setShowMyOrders] = useState(false)
  const [myOrders, setMyOrders] = useState<OrderData[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  // حالة الأرشيف
  const [showArchive, setShowArchive] = useState(false)

  const supabase = createClient()

  // Realtime Orders Listener
  useEffect(() => {
    if (!showMyOrders) return

    const channel = supabase
      .channel('my_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          // جلب الطلبات من جديد لتحديث الحالة
          try {
            const result = await getMyOrders()
            setMyOrders(result.orders as OrderData[])
          } catch (e) {
            console.error("Error fetching orders:", e)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showMyOrders, supabase, userId])

  // تجميع العناصر حسب التاجر
  const merchantGroups = useMemo((): MerchantGroup[] => {
    const groupMap = new Map<string, MerchantGroup>()

    for (const item of items) {
      const merchantId = item.products.merchant_id
      const existing = groupMap.get(merchantId)

      if (existing) {
        existing.items.push(item)
        // تحديث تاريخ آخر إضافة
        if (item.created_at > existing.lastAddedAt) {
          existing.lastAddedAt = item.created_at
        }
      } else {
        groupMap.set(merchantId, {
          merchantId,
          merchantName: item.products.profiles?.full_name || "تاجر غير معروف",
          deliveryFee: item.products.profiles?.delivery_fee || 0,
          items: [item],
          lastAddedAt: item.created_at,
        })
      }
    }

    // ترتيب حسب تاريخ آخر إضافة (الأحدث أولاً)
    return Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.lastAddedAt).getTime() - new Date(a.lastAddedAt).getTime()
    )
  }, [items])

  // تبديل فتح/إغلاق مجموعة تاجر
  const toggleMerchant = useCallback((merchantId: string) => {
    setExpandedMerchants(prev => {
      const next = new Set(prev)
      if (next.has(merchantId)) {
        next.delete(merchantId)
      } else {
        next.add(merchantId)
        // تمرير ذكي للأسفل بعد الفتح لعرض زر إتمام الشراء
        setTimeout(() => {
          const element = document.getElementById(`merchant-group-${merchantId}`)
          if (element) {
            const rect = element.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            // ارتفاع الإعلانات السفلية تقريباً 120 بكسل
            const bottomBannerHeight = 130
            if (rect.bottom > viewportHeight - bottomBannerHeight) {
              const scrollAmount = rect.bottom - (viewportHeight - bottomBannerHeight)
              window.scrollBy({ top: scrollAmount + 20, behavior: 'smooth' })
            }
          }
        }, 200)
      }
      return next
    })
  }, [])

  // تحديث الكمية
  const handleUpdateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setIsUpdating(itemId)
    try {
      await updateQuantity(itemId, newQuantity)
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ))
    } catch {
      alert("خطأ في تحديث الكمية")
    } finally {
      setIsUpdating(null)
    }
  }, [])

  // حذف عنصر
  const handleRemove = useCallback(async (itemId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج من السلة؟")) return
    setIsUpdating(itemId)
    try {
      await removeFromCart(itemId)
      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch {
      alert("خطأ في حذف المنتج")
    } finally {
      setIsUpdating(null)
    }
  }, [])

  // بدء عملية الشراء لتاجر معين
  const handleStartCheckout = useCallback((merchantId: string) => {
    setCheckoutMerchantId(merchantId)
    setShowCheckoutDialog(true)
  }, [])

  // بعد إدخال بيانات التوصيل → عرض الفاتورة
  const handleDeliveryInfoConfirm = useCallback((data: { storeName: string; address: string; phone: string }) => {
    setDeliveryInfo(data)
    setVerificationCode(generateVerificationCode())
    setShowCheckoutDialog(false)
    setShowInvoice(true)
  }, [])

  // إتمام إصدار الفاتورة
  const handleConfirmOrder = useCallback(async () => {
    if (!checkoutMerchantId || !deliveryInfo) return

    const group = merchantGroups.find(g => g.merchantId === checkoutMerchantId)
    if (!group) return

    const subtotal = group.items.reduce((acc, item) => acc + getItemPrice(item) * item.quantity, 0)
    const rawTotal = subtotal + group.deliveryFee
    const totalRounded = roundTo250(rawTotal)

    const result = await createOrder({
      merchantId: checkoutMerchantId,
      verificationCode,
      storeName: deliveryInfo.storeName,
      address: deliveryInfo.address,
      phone: deliveryInfo.phone,
      subtotal,
      deliveryFee: group.deliveryFee,
      totalRounded,
      items: group.items.map(item => ({
        cartItemId: item.id,
        productId: item.products.id,
        productName: item.products.name,
        productPrice: getItemPrice(item),
        quantity: item.quantity,
        unitType: item.unit_type || item.products.unit_type,
      })),
    })

    if (result.error) {
      alert("خطأ في إنشاء الطلب: " + result.error)
      return
    }

    // حذف العناصر من السلة المحلية
    const cartItemIds = new Set(group.items.map(item => item.id))
    setItems(prev => prev.filter(item => !cartItemIds.has(item.id)))

    // إغلاق الفاتورة
    setShowInvoice(false)
    setCheckoutMerchantId(null)
    setDeliveryInfo(null)
    setVerificationCode("")

    // فتح تتبع المشتريات تلقائياً
    handleOpenMyOrders()
  }, [checkoutMerchantId, deliveryInfo, merchantGroups, verificationCode])

  // إلغاء عملية الشراء
  const handleCancelOrder = useCallback(() => {
    setShowInvoice(false)
    setCheckoutMerchantId(null)
    setDeliveryInfo(null)
    setVerificationCode("")
  }, [])

  // فتح تتبع المشتريات
  const handleOpenMyOrders = useCallback(async () => {
    setIsLoadingOrders(true)
    setShowMyOrders(true)
    try {
      const result = await getMyOrders()
      setMyOrders(result.orders as OrderData[])
    } catch {
      alert("خطأ في جلب الطلبات")
    } finally {
      setIsLoadingOrders(false)
    }
  }, [])

  // بيانات المجموعة الحالية للفاتورة
  const currentGroup = useMemo(() =>
    merchantGroups.find(g => g.merchantId === checkoutMerchantId),
    [merchantGroups, checkoutMerchantId]
  )

  const invoiceItems: InvoiceItem[] = useMemo(() => {
    if (!currentGroup) return []
    return currentGroup.items.map(item => ({
      id: item.id,
      product_id: item.products.id,
      name: item.products.name,
      price: getItemPrice(item),
      quantity: item.quantity,
      unit_type: item.unit_type || item.products.unit_type,
    }))
  }, [currentGroup])

  // واجهة السلة الفارغة
  if (items.length === 0) {
    return (
      <>
        {/* Sticky Header for Action Buttons even when empty */}
        <div className="sticky top-[224px] sm:top-[256px] z-30 bg-background/95 backdrop-blur-md pt-2 pb-3 mb-6 border-b border-border/40 shadow-sm">
          <div className="flex justify-start gap-2 flex-nowrap overflow-x-auto hide-scrollbar max-w-full pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchive(true)}
              className="gap-1.5 rounded-xl border-violet-500/30 text-violet-600 hover:bg-violet-500/5 hover:text-violet-700 shrink-0 h-9 px-3"
            >
              <Archive className="w-4 h-4" />
              <span className="text-xs font-bold">الأرشيف</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenMyOrders}
              disabled={isLoadingOrders}
              className="gap-1.5 rounded-xl border-primary/30 hover:bg-primary/5 shrink-0 h-9 px-3"
            >
              {isLoadingOrders ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Package className="w-4 h-4 text-primary" />
              )}
              <span className="text-xs font-bold">تتبع مشترياتي</span>
            </Button>
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-3 text-right bg-clip-text text-transparent bg-gradient-to-l from-primary to-blue-600 w-fit">
            سلة المشتريات
          </h1>
        </div>

        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">السلة فارغة حالياً</h2>
          <p className="text-muted-foreground mb-8">ابدأ بالتسوق وأضف بعض المنتجات الرائعة!</p>
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            العودة للصفحة الرئيسية
          </Link>
        </div>

        {/* حوار تتبع المشتريات */}
        <MyOrders
          open={showMyOrders}
          onOpenChange={setShowMyOrders}
          orders={myOrders}
        />

        {/* حوار الأرشيف */}
        <ArchiveDialog
          open={showArchive}
          onOpenChange={setShowArchive}
        />
      </>
    )
  }

  return (
    <>
      {/* Sticky Header Group: Tabs + Title */}
      <div className="sticky top-[224px] sm:top-[256px] z-30 bg-background/95 backdrop-blur-md pt-2 pb-3 mb-6 border-b border-border/40 shadow-sm">
        {/* أزرار تتبع المشتريات والأرشيف في الأعلى */}
        <div className="flex justify-start gap-2 flex-nowrap overflow-x-auto hide-scrollbar max-w-full pb-1">
          {merchantGroups.length > 0 && (
            <Link href={`/store/${merchantGroups[0].merchantId}`} className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 hover:text-emerald-700 h-9 px-3"
              >
                <Store className="w-4 h-4" />
                <span className="text-xs font-bold">العودة للمتجر</span>
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchive(true)}
            className="gap-1.5 rounded-xl border-violet-500/30 text-violet-600 hover:bg-violet-500/5 hover:text-violet-700 shrink-0 h-9 px-3"
          >
            <Archive className="w-4 h-4" />
            <span className="text-xs font-bold">الأرشيف</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenMyOrders}
            disabled={isLoadingOrders}
            className="gap-1.5 rounded-xl border-primary/30 hover:bg-primary/5 shrink-0 h-9 px-3"
          >
            {isLoadingOrders ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4 text-primary" />
            )}
            <span className="text-xs font-bold">تتبع مشترياتي</span>
          </Button>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-black mt-3 text-right bg-clip-text text-transparent bg-gradient-to-l from-primary to-blue-600 w-fit">
          سلة المشتريات
        </h1>
      </div>

      {/* أقسام التجار */}
      <div className="space-y-4 pb-[140px]">
        {merchantGroups.map(group => {
          const isExpanded = expandedMerchants.has(group.merchantId)
          const groupSubtotal = group.items.reduce(
            (acc, item) => acc + getItemPrice(item) * item.quantity, 0
          )
          const groupTotal = roundTo250(groupSubtotal + group.deliveryFee)

          const lastAddedDate = new Date(group.lastAddedAt).toLocaleDateString("ar-IQ", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })

          return (
            <div
              key={group.merchantId}
              id={`merchant-group-${group.merchantId}`}
              className="border rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
            >
              {/* شريط التاجر - قابل للنقر */}
              <button
                onClick={() => toggleMerchant(group.merchantId)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-xl">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-base">{group.merchantName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5" suppressHydrationWarning>
                      {group.items.length} منتج • آخر إضافة: {lastAddedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span className="font-black text-primary text-lg tabular-nums">
                      {groupTotal.toLocaleString('en-US')}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">د.ع</span>
                  </div>
                  <div className="bg-muted/50 p-1.5 rounded-lg">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>

              {/* محتوى القسم */}
              {isExpanded && (
                <div className="border-t animate-in slide-in-from-top-2 duration-200">
                  {/* قائمة المنتجات */}
                  <div className="divide-y">
                    {group.items.map(item => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 group hover:bg-muted/10 transition-colors"
                      >
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.products.image_url ? (
                            <Image
                              src={item.products.image_url}
                              alt={item.products.name}
                              fill
                              className="object-contain group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        <div className="flex-grow flex justify-between items-start">
                          {/* Right Side: Product Info */}
                          <div className="text-right">
                            <h3 className="font-bold text-sm line-clamp-1">{item.products.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                لكل {item.unit_type || item.products.unit_type}
                              </span>
                              <p className="text-xs font-bold text-primary">
                                {getItemPrice(item).toLocaleString('en-US')} د.ع
                              </p>
                            </div>
                          </div>

                          {/* Left Side: Quantity & Total & Actions */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              المجموع: {(getItemPrice(item) * item.quantity).toLocaleString('en-US')} د.ع
                            </div>

                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(item.id)}
                                disabled={isUpdating === item.id}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full w-8 h-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>

                              <div className="flex items-center border rounded-lg overflow-hidden h-8 bg-background">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  disabled={isUpdating === item.id}
                                  className="px-2.5 hover:bg-muted disabled:opacity-30 transition-colors h-full"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <span className="px-3 font-bold min-w-[32px] text-center border-x text-sm">
                                  {item.quantity}
                               </span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                  disabled={isUpdating === item.id || item.quantity <= 1}
                                  className="px-2.5 hover:bg-muted disabled:opacity-30 transition-colors h-full"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ملخص المجموعة */}
                  <div className="border-t bg-muted/20 p-4 space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>قيمة المنتجات</span>
                      <span className="tabular-nums font-medium">{groupSubtotal.toLocaleString('en-US')} د.ع</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        أجور التوصيل
                      </span>
                      <span className="tabular-nums font-medium">{group.deliveryFee.toLocaleString('en-US')} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-dashed pt-3">
                      <span className="font-bold">المجموع الكلي</span>
                      <div className="text-left">
                        <span className="text-2xl font-black text-primary tabular-nums">
                          {groupTotal.toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">دينار عراقي</span>
                      </div>
                    </div>

                    {/* ملاحظات */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-background p-2 rounded-lg">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span>دفع آمن عند الاستلام</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-background p-2 rounded-lg">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span>توصيل من التاجر مباشرة</span>
                      </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        onClick={() => handleStartCheckout(group.merchantId)}
                        className="w-full h-12 text-base font-black rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform active:scale-95 bg-gradient-to-r from-primary to-blue-600"
                      >
                        إتمام الشراء الآن
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* حوار بيانات التوصيل */}
      {currentGroup && (
        <CheckoutDialog
          open={showCheckoutDialog}
          onOpenChange={setShowCheckoutDialog}
          merchantName={currentGroup.merchantName}
          onConfirm={handleDeliveryInfoConfirm}
          initialData={buyerProfile}
        />
      )}

      {/* عرض الفاتورة */}
      {currentGroup && deliveryInfo && (
        <InvoicePreview
          open={showInvoice}
          onOpenChange={setShowInvoice}
          items={invoiceItems}
          merchantName={currentGroup.merchantName}
          deliveryFee={currentGroup.deliveryFee}
          verificationCode={verificationCode}
          deliveryInfo={deliveryInfo}
          onConfirmOrder={handleConfirmOrder}
          onCancelOrder={handleCancelOrder}
        />
      )}

      {/* حوار تتبع المشتريات */}
      <MyOrders
        open={showMyOrders}
        onOpenChange={setShowMyOrders}
        orders={myOrders}
      />

      {/* حوار الأرشيف */}
      <ArchiveDialog
        open={showArchive}
        onOpenChange={setShowArchive}
      />
    </>
  )
}
