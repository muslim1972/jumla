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
  Loader2,
  Printer
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

// دالة طباعة القائمة
function handlePrintOrder(order: OrderData, dateStr: string) {
  const invoiceNum = order.invoice_number ? String(order.invoice_number).padStart(5, '0') : '---';
  const maskedCode = order.verification_code.length > 2 
    ? order.verification_code[0] + 'X'.repeat(order.verification_code.length - 2) + order.verification_code[order.verification_code.length - 1]
    : order.verification_code;
  
  const itemsRows = (order.items || []).map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${item.product_name} <span style="color:#888;font-size:11px;">(${item.unit_type})</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;font-size:13px;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.product_price.toLocaleString()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;font-size:13px;">${(item.product_price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  const statusLabel = order.status === 'pending' ? 'بإنتظار تأكيد التاجر' 
    : order.status === 'delivered' ? 'تم التسليم' 
    : 'ملغي';

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>قائمة #${invoiceNum} - ${order.merchant_name || 'جملة'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Cairo',sans-serif; background:#fff; color:#1a1a1a; padding:20px; direction:rtl; }
    .invoice { max-width:520px; margin:0 auto; }
    .header { text-align:center; padding-bottom:16px; border-bottom:3px solid #e85d26; margin-bottom:20px; }
    .header h1 { font-size:28px; font-weight:800; color:#e85d26; margin-bottom:4px; }
    .header .invoice-num { font-size:14px; color:#666; }
    .header .date { font-size:12px; color:#999; margin-top:2px; }
    .section { margin-bottom:16px; }
    .section-title { font-size:12px; font-weight:700; color:#e85d26; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #f0f0f0; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 16px; }
    .info-item { font-size:12px; }
    .info-label { color:#888; }
    .info-value { font-weight:600; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    thead tr { background:#f8f8f8; }
    thead th { padding:8px 12px; font-size:11px; font-weight:700; color:#666; text-align:right; border-bottom:2px solid #e85d26; }
    thead th:nth-child(2), thead th:nth-child(3) { text-align:center; }
    thead th:last-child { text-align:left; }
    .totals { background:#fafafa; border-radius:8px; padding:12px 16px; }
    .total-row { display:flex; justify-content:space-between; font-size:12px; color:#666; padding:3px 0; }
    .total-row.grand { font-size:16px; font-weight:800; color:#1a1a1a; border-top:2px solid #e85d26; padding-top:8px; margin-top:6px; }
    .total-row.grand .amount { color:#e85d26; }
    .verification { text-align:center; margin:20px 0 16px; padding:16px; border:2px dashed #22c55e; border-radius:12px; background:#f0fdf4; }
    .verification .label { font-size:11px; font-weight:700; color:#15803d; margin-bottom:6px; }
    .verification .code { font-family:monospace; font-size:28px; font-weight:900; letter-spacing:0.3em; color:#15803d; }
    .verification .warning { font-size:10px; color:#dc2626; margin-top:8px; font-weight:600; }
    .status { text-align:center; font-size:11px; font-weight:700; padding:6px; border-radius:6px; margin-bottom:16px; }
    .status.pending { background:#fef3c7; color:#92400e; }
    .status.delivered { background:#d1fae5; color:#065f46; }
    .status.cancelled { background:#fee2e2; color:#991b1b; }
    .footer { text-align:center; font-size:10px; color:#aaa; border-top:1px solid #eee; padding-top:12px; margin-top:20px; }
    @media print {
      body { padding:10px; }
      .no-print { display:none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>جُملة</h1>
      <div class="invoice-num">قائمة رقم #${invoiceNum}</div>
      <div class="date">${dateStr}</div>
    </div>

    <div class="status ${order.status}">${statusLabel}</div>

    <div class="section">
      <div class="section-title">معلومات التاجر</div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">التاجر: </span><span class="info-value">${order.merchant_name || '---'}</span></div>
        ${order.support_phone ? `<div class="info-item"><span class="info-label">هاتف الدعم: </span><span class="info-value" dir="ltr">${order.support_phone}</span></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">معلومات التوصيل</div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">الاسم: </span><span class="info-value">${order.store_name}</span></div>
        <div class="info-item"><span class="info-label">الهاتف: </span><span class="info-value" dir="ltr">${order.phone}</span></div>
        <div class="info-item" style="grid-column:span 2;"><span class="info-label">العنوان: </span><span class="info-value">${order.address}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">تفاصيل المنتجات</div>
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th style="text-align:center;">الكمية</th>
            <th style="text-align:center;">سعر الوحدة</th>
            <th style="text-align:left;">المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="total-row"><span>قيمة المنتجات</span><span>${order.subtotal.toLocaleString()} د.ع</span></div>
      <div class="total-row"><span>أجور التوصيل</span><span>${order.delivery_fee.toLocaleString()} د.ع</span></div>
      <div class="total-row grand"><span>المجموع الكلي</span><span class="amount">${order.total_rounded.toLocaleString()} د.ع</span></div>
    </div>

    <div class="verification">
      <div class="label">كود التحقق السري</div>
      <div class="code">${maskedCode}</div>
      <div class="warning">⚠️ لا تسلم هذا الكود إلا بعد استلام المواد بالكامل والتأكد منها</div>
    </div>

    <div class="footer">
      <p>تم إنشاء هذه القائمة عبر منصة جُملة</p>
    </div>

    <div class="no-print" style="text-align:center;margin-top:20px;">
      <button onclick="window.print()" style="background:#e85d26;color:#fff;border:none;padding:10px 32px;border-radius:8px;font-family:Cairo;font-size:14px;font-weight:700;cursor:pointer;">🖨️ طباعة</button>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
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

          {/* زر طباعة القائمة */}
          <Button
            variant="outline"
            className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/5"
            onClick={(e) => {
              e.stopPropagation();
              handlePrintOrder(order, dateStr);
            }}
          >
            <Printer className="w-4 h-4" />
            طباعة القائمة
          </Button>

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
