"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Minus, Plus, Trash2, ShoppingBag, Loader2, Check,
  ChevronDown, ChevronUp, Package, Truck
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { removeFromCart, updateQuantity, createOrder, getMyOrders } from "./actions"
import { useState, useCallback, useMemo } from "react"
import { roundTo250 } from "@/lib/round-to-250"
import { generateVerificationCode } from "@/lib/generate-code"
import { CheckoutDialog } from "@/components/checkout-dialog"
import { InvoicePreview, type InvoiceItem } from "@/components/invoice-preview"
import { MyOrders, type OrderData } from "@/components/my-orders"

// نوع عنصر السلة
interface CartItemType {
  id: string
  quantity: number
  created_at: string
  products: {
    id: string
    merchant_id: string
    name: string
    price: number
    unit_type: string
    image_url: string | null
    profiles?: {
      delivery_fee: number | null
      full_name?: string
    } | null
  }
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
  buyerProfile 
}: { 
  initialItems: CartItemType[],
  buyerProfile?: { store_name?: string, address?: string, phone?: string }
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

    const subtotal = group.items.reduce((acc, item) => acc + item.products.price * item.quantity, 0)
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
        productPrice: item.products.price,
        quantity: item.quantity,
        unitType: item.products.unit_type,
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
      price: item.products.price,
      quantity: item.quantity,
      unit_type: item.products.unit_type,
    }))
  }, [currentGroup])

  // واجهة السلة الفارغة
  if (items.length === 0) {
    return (
      <>
        {/* زر تتبع المشتريات حتى لو السلة فارغة */}
        <div className="mb-6 flex justify-end">
          <Button
            variant="outline"
            onClick={handleOpenMyOrders}
            disabled={isLoadingOrders}
            className="gap-2 rounded-xl border-primary/30 hover:bg-primary/5"
          >
            {isLoadingOrders ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4 text-primary" />
            )}
            تتبع مشترياتي
          </Button>
        </div>

        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">السلة فارغة حالياً</h2>
          <p className="text-muted-foreground mb-8">ابدأ بالتسوق وأضف بعض المنتجات الرائعة!</p>
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            الذهاب للتسوق
          </Link>
        </div>

        {/* حوار تتبع المشتريات */}
        <MyOrders
          open={showMyOrders}
          onOpenChange={setShowMyOrders}
          orders={myOrders}
        />
      </>
    )
  }

  return (
    <>
      {/* زر تتبع المشتريات في الأعلى */}
      <div className="mb-6 flex justify-end">
        <Button
          variant="outline"
          onClick={handleOpenMyOrders}
          disabled={isLoadingOrders}
          className="gap-2 rounded-xl border-primary/30 hover:bg-primary/5"
        >
          {isLoadingOrders ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Package className="w-4 h-4 text-primary" />
          )}
          تتبع مشترياتي
        </Button>
      </div>

      {/* أقسام التجار */}
      <div className="space-y-4">
        {merchantGroups.map(group => {
          const isExpanded = expandedMerchants.has(group.merchantId)
          const groupSubtotal = group.items.reduce(
            (acc, item) => acc + item.products.price * item.quantity, 0
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
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {group.items.length} منتج • آخر إضافة: {lastAddedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span className="font-black text-primary text-lg tabular-nums">
                      {groupTotal.toLocaleString()}
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
                              sizes="80px"
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        <div className="flex-grow flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-sm line-clamp-1">{item.products.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs font-bold text-primary">
                                {item.products.price.toLocaleString()} د.ع
                              </p>
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                لكل {item.products.unit_type}
                              </span>
                            </div>
                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                              المجموع: {(item.products.price * item.quantity).toLocaleString()} د.ع
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border rounded-lg overflow-hidden h-8 bg-background">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={isUpdating === item.id || item.quantity <= 1}
                                className="px-2.5 hover:bg-muted disabled:opacity-30 transition-colors h-full"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 font-bold min-w-[32px] text-center border-x text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={isUpdating === item.id}
                                className="px-2.5 hover:bg-muted disabled:opacity-30 transition-colors h-full"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(item.id)}
                              disabled={isUpdating === item.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full w-8 h-8"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ملخص المجموعة */}
                  <div className="border-t bg-muted/20 p-4 space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>قيمة المنتجات</span>
                      <span className="tabular-nums font-medium">{groupSubtotal.toLocaleString()} د.ع</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        أجور التوصيل
                      </span>
                      <span className="tabular-nums font-medium">{group.deliveryFee.toLocaleString()} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-dashed pt-3">
                      <span className="font-bold">المجموع الكلي</span>
                      <div className="text-left">
                        <span className="text-2xl font-black text-primary tabular-nums">
                          {groupTotal.toLocaleString()}
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

                    {/* زر إتمام الشراء */}
                    <Button
                      onClick={() => handleStartCheckout(group.merchantId)}
                      className="w-full h-12 text-base font-black rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform active:scale-95 bg-gradient-to-r from-primary to-blue-600"
                    >
                      إتمام الشراء الآن
                    </Button>
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
    </>
  )
}
