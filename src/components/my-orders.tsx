"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  ShieldCheck,
  Package,
  Truck,
  MapPin,
  Phone,
  Store,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
  Loader2
} from "lucide-react"
import { editOrder } from "@/app/(app)/cart/actions"

export interface OrderData {
  id: string
  verification_code: string
  store_name: string
  address: string
  phone: string
  subtotal: number
  delivery_fee: number
  total_rounded: number
  status: string
  created_at: string
  merchant_name?: string
  delivery_worker_name?: string
  items?: OrderItemData[]
  invoice_number?: number
  support_phone?: string
}

export interface OrderItemData {
  id: string
  product_name: string
  product_price: number
  quantity: number
  unit_type: string
}

interface MyOrdersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: OrderData[]
}

// مكون بطاقة الطلب الفردي
function OrderCard({ order, onOrderEdited }: { order: OrderData, onOrderEdited?: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = useMemo(() => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: {
        label: "بإنتظار تأكيد التاجر",
        color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
        icon: <Clock className="w-3.5 h-3.5" />,
      },
      delivered: {
        label: "تم التسليم",
        color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      },
      cancelled: {
        label: "ملغي",
        color: "text-red-600 bg-red-500/10 border-red-500/30",
        icon: <X className="w-3.5 h-3.5" />,
      },
    }
    return configs[order.status] || configs.pending
  }, [order.status])

  const dateStr = useMemo(() => {
    return new Date(order.created_at).toLocaleDateString("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [order.created_at])

  const toggleExpand = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  return (
    <div className="border rounded-xl overflow-hidden bg-card hover:border-primary/20 transition-colors">
      {/* رأس البطاقة - قابل للنقر */}
      <button
        onClick={toggleExpand}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">
              {order.merchant_name || "طلب"} 
              {order.invoice_number && <span className="text-muted-foreground ml-1">#{String(order.invoice_number).padStart(5, '0')}</span>}
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {dateStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </div>
          <span className="font-black text-primary tabular-nums text-sm">
            {order.total_rounded.toLocaleString()}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* محتوى الطلب - يظهر عند النقر */}
      {expanded && (
        <div className="border-t p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* كود التحقق */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">كود التحقق السري</span>
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-black tracking-[0.3em] text-emerald-700 dark:text-emerald-300" dir="ltr">
              {order.verification_code}
            </div>
            <p className="text-[10px] text-destructive bg-destructive/10 inline-block px-2 py-1 rounded-md font-bold">
              ⚠️ لا تسلم هذا الكود إلا بعد استلام المواد بالكامل والتأكد منها
            </p>
          </div>

          {/* بيانات التوصيل */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">{order.store_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span>{order.address}</span>
            </div>
            <div className="flex items-center gap-2" dir="ltr">
              <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-mono">{order.phone}</span>
            </div>
            {order.status === 'delivered' && order.delivery_worker_name && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
                <Truck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم التوصيل بواسطة: {order.delivery_worker_name}</span>
              </div>
            )}
          </div>

          {/* عناصر الطلب */}
          {order.items && order.items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-right p-2 font-semibold">المنتج</th>
                    <th className="text-center p-2 font-semibold">الكمية</th>
                    <th className="text-left p-2 font-semibold">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className={idx < order.items!.length - 1 ? "border-b border-dashed" : ""}>
                      <td className="p-2">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-[10px] text-muted-foreground mr-1">({item.unit_type})</span>
                      </td>
                      <td className="text-center p-2 font-bold tabular-nums">{item.quantity}</td>
                      <td className="text-left p-2 font-bold tabular-nums">
                        {(item.product_price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ملخص المبالغ */}
          <div className="text-xs space-y-1 pt-2 border-t border-dashed">
            <div className="flex justify-between text-muted-foreground">
              <span>قيمة المنتجات</span>
              <span className="tabular-nums">{order.subtotal.toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>أجور التوصيل</span>
              <span className="tabular-nums">{order.delivery_fee.toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-1">
              <span>المجموع الكلي</span>
              <span className="text-primary tabular-nums">{order.total_rounded.toLocaleString()} د.ع</span>
            </div>
          </div>

          {/* رقم الدعم وزر التعديل (في حالة الانتظار) */}
          {order.status === 'pending' && (
            <div className="pt-3 border-t space-y-3">
              {order.support_phone && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">
                    لديك استفسار؟ لا تتردد بالاتصال بهاتف الدعم
                  </p>
                  <p className="font-mono text-sm font-bold text-blue-800 dark:text-blue-300" dir="ltr">
                    {order.support_phone}
                  </p>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full text-amber-600 border-amber-600 hover:bg-amber-50"
                disabled={expanded && (globalThis as any).isEditingOrder === order.id}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm("سيتم إرجاع هذه القائمة إلى السلة لتعديلها ثم يجب عليك إرسالها مجدداً. هل أنت متأكد؟")) {
                    try {
                      (globalThis as any).isEditingOrder = order.id;
                      const res = await editOrder(order.id);
                      if (res.error) {
                        alert(res.error);
                      } else {
                        alert("تم إرجاع المنتجات إلى السلة بنجاح. يمكنك التعديل وإرسال القائمة من جديد.");
                        if (onOrderEdited) onOrderEdited();
                        window.location.reload();
                      }
                    } catch (error) {
                      alert("حدث خطأ");
                    } finally {
                      delete (globalThis as any).isEditingOrder;
                    }
                  }
                }}
              >
                تعديل المشتريات
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// المكون الرئيسي
export function MyOrders({ open, onOpenChange, orders }: MyOrdersProps) {
  const pendingOrders = useMemo(() =>
    orders.filter(o => o.status === 'pending'),
    [orders]
  )
  const completedOrders = useMemo(() =>
    orders.filter(o => o.status !== 'pending'),
    [orders]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Package className="w-5 h-5 text-primary" />
            </div>
            تتبع مشترياتي
          </DialogTitle>
        </DialogHeader>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground text-sm">لا توجد طلبات حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* الطلبات قيد التوصيل */}
            {pendingOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  قيد التوصيل ({pendingOrders.length})
                </p>
                {pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} onOrderEdited={() => onOpenChange(false)} />
                ))}
              </div>
            )}

            {/* الطلبات المكتملة */}
            {completedOrders.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  مكتملة ({completedOrders.length})
                </p>
                {completedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
