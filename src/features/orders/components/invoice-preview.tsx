"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  FileText,
  ShieldCheck,
  MapPin,
  Phone,
  Store,
  Package,
  Truck,
  Loader2,
  AlertTriangle,
  X,
  ArrowRight,
} from "lucide-react"
import { roundTo250 } from "@/lib/round-to-250"

export interface InvoiceItem {
  id: string
  product_id: string
  name: string
  price: number
  quantity: number
  unit_type: string
}

interface InvoicePreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: InvoiceItem[]
  merchantName: string
  deliveryFee: number
  verificationCode: string
  deliveryInfo: {
    storeName: string
    address: string
    phone: string
  }
  isTrusted: boolean
  onConfirmOrder: (upfrontPayment: number) => Promise<void>
  onCancelOrder: () => void
}

export function InvoicePreview({
  open,
  onOpenChange,
  items,
  merchantName,
  deliveryFee,
  verificationCode,
  deliveryInfo,
  isTrusted,
  onConfirmOrder,
  onCancelOrder,
}: InvoicePreviewProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [showCancelWarning, setShowCancelWarning] = useState(false)

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const rawTotal = subtotal + deliveryFee
  const totalRounded = roundTo250(rawTotal)
  const roundingDiff = totalRounded - rawTotal

  // حالة المبلغ الواصل (المقدم) للمشترين الثقات
  // يبدأ مبدئياً كأنه سيدفع كامل المبلغ
  const [upfrontPayment, setUpfrontPayment] = useState(totalRounded)

  // تحديث القيمة الابتدائية إذا تغير المجموع
  useEffect(() => {
    setUpfrontPayment(totalRounded)
  }, [totalRounded])

  const now = new Date()
  const dateStr = now.toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const timeStr = now.toLocaleTimeString("ar-IQ", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const handleConfirm = useCallback(async (amount: number) => {
    setIsConfirming(true)
    try {
      await onConfirmOrder(amount)
    } finally {
      setIsConfirming(false)
    }
  }, [onConfirmOrder])

  const handleCancelClick = useCallback(() => {
    setShowCancelWarning(true)
  }, [])

  const handleCancelConfirm = useCallback(() => {
    setShowCancelWarning(false)
    onCancelOrder()
  }, [onCancelOrder])

  const handleCancelBack = useCallback(() => {
    setShowCancelWarning(false)
  }, [])

  // واجهة تأكيد الإلغاء
  if (showCancelWarning) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <div className="text-center py-4">
            <div className="bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">تأكيد إلغاء الشراء</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              هل أنت متأكد من التراجع عن إتمام عملية الشراء؟
              <br />
              <span className="text-xs">سيتم إعادتك إلى سلة المشتريات</span>
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleCancelConfirm}
                variant="destructive"
                className="w-full h-12 text-base font-bold rounded-xl"
              >
                نعم، متأكد
              </Button>
              <Button
                onClick={handleCancelBack}
                variant="outline"
                className="w-full h-12 text-base font-bold rounded-xl"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة للفاتورة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        {/* ترويسة الفاتورة */}
        <div className="text-center border-b border-dashed pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-black">فاتورة شراء</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {dateStr} — {timeStr}
          </p>
        </div>

        {/* كود التحقق */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent)]" />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">كود التحقق</span>
            </div>
            <div className="font-mono text-4xl font-black tracking-[0.3em] text-emerald-700 dark:text-emerald-300 dir-ltr" dir="ltr">
              {verificationCode}
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-2">
              يُقدّم لعامل التوصيل عند استلام المنتجات لتأكيد الاستلام
            </p>
          </div>
        </div>

        {/* بيانات التاجر */}
        <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">التاجر</p>
            <p className="font-bold">{merchantName}</p>
          </div>
        </div>

        {/* بيانات التوصيل */}
        <div className="bg-muted/30 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Truck className="w-3.5 h-3.5" />
            بيانات التوصيل
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Store className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{deliveryInfo.storeName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span>{deliveryInfo.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm" dir="ltr">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-mono">{deliveryInfo.phone}</span>
          </div>
        </div>

        {/* جدول المنتجات */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs">
                <th className="text-right p-2.5 font-semibold">المنتج</th>
                <th className="text-center p-2.5 font-semibold">الكمية</th>
                <th className="text-center p-2.5 font-semibold">السعر</th>
                <th className="text-left p-2.5 font-semibold">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`${idx < items.length - 1 ? "border-b border-dashed" : ""} hover:bg-muted/20 transition-colors`}
                >
                  <td className="p-2.5">
                    <span className="font-medium text-sm leading-tight block">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground">{item.unit_type}</span>
                  </td>
                  <td className="text-center p-2.5 font-bold tabular-nums">{item.quantity}</td>
                  <td className="text-center p-2.5 tabular-nums">{item.price.toLocaleString('en-US')}</td>
                  <td className="text-left p-2.5 font-bold tabular-nums">
                    {(item.price * item.quantity).toLocaleString('en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ملخص المبالغ */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>قيمة المنتجات</span>
            <span className="tabular-nums font-medium">{subtotal.toLocaleString('en-US')} د.ع</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              أجور التوصيل
            </span>
            <span className="tabular-nums font-medium">{deliveryFee.toLocaleString('en-US')} د.ع</span>
          </div>
          {roundingDiff !== 0 && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>تقريب لأقرب 250 د.ع</span>
              <span className="tabular-nums">
                {roundingDiff > 0 ? "+" : ""}
                {roundingDiff.toLocaleString('en-US')} د.ع
              </span>
            </div>
          )}
          <div className="border-t border-dashed pt-3 flex justify-between items-center">
            <span className="text-lg font-black">المبلغ الكلي</span>
            <div className="text-left">
              <span className="text-3xl font-black text-primary block leading-none tabular-nums">
                {totalRounded.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-muted-foreground">دينار عراقي</span>
            </div>
          </div>
        </div>

        {/* ملاحظة الدفع ومربعات الإدخال للمشترين الثقات */}
        {isTrusted ? (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <p className="text-sm font-bold text-primary">أنت ضمن قائمة الثقات للتاجر</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                  المبلغ الواصل (المقدم) للمندوب:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={totalRounded}
                    value={upfrontPayment}
                    onChange={(e) => {
                      let val = parseInt(e.target.value)
                      if (isNaN(val)) val = 0
                      if (val > totalRounded) val = totalRounded
                      if (val < 0) val = 0
                      setUpfrontPayment(val)
                    }}
                    className="w-full h-12 bg-background border rounded-lg px-4 font-bold tabular-nums focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                    د.ع
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-background rounded-lg p-3 border">
                <span className="text-sm font-bold text-muted-foreground">الباقي (دين):</span>
                <span className="font-black text-destructive tabular-nums">
                  {(totalRounded - upfrontPayment).toLocaleString('en-US')} د.ع
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              💰 الدفع نقداً عند الاستلام — يُرجى تجهيز كامل المبلغ
            </p>
          </div>
        )}

        {/* أزرار التحكم */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => handleConfirm(upfrontPayment)}
            disabled={isConfirming}
            className="w-full h-14 text-lg font-black rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform active:scale-95 bg-gradient-to-r from-emerald-600 to-emerald-500"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                جاري إصدار الفاتورة...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 ml-2" />
                إتمام إصدار الفاتورة
              </>
            )}
          </Button>
          <Button
            onClick={handleCancelClick}
            disabled={isConfirming}
            variant="ghost"
            className="w-full h-11 text-sm font-medium rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4 ml-2" />
            إلغاء عملية الشراء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
