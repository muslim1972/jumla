"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
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
  Printer,
  Archive,
  Edit3
} from "lucide-react"
import { editOrder, archiveOrder, respondToOrderEdits } from "@/features/orders/actions"
import { roundTo250 } from "@/lib/round-to-250"

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
  is_credit?: boolean
  amount_paid?: number
  delivered_at?: string
  // تعديلات التاجر المقترحة بانتظار موافقة المشتري (تشمل الفقرات المتغيرة فقط)
  pending_edits?: {
    proposed_at?: string
    items: {
      item_id: string
      product_name: string
      product_price: number
      unit_type: string
      old_quantity: number
      new_quantity: number
    }[]
  } | null
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
function handlePrintOrder(order: OrderData, dateStr: string, deliveryDateStr?: string, appSupportPhone?: string) {
  const invoiceNum = order.invoice_number ? String(order.invoice_number).padStart(5, '0') : '---';
  const maskedCode = order.verification_code.length > 2 
    ? order.verification_code[0] + 'X'.repeat(order.verification_code.length - 2) + order.verification_code[order.verification_code.length - 1]
    : order.verification_code;
  
  const itemsRows = (order.items || []).map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${item.product_name} <span style="color:#888;font-size:11px;">(${item.unit_type})</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;font-size:13px;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.product_price.toLocaleString('en-US')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;font-size:13px;">${(item.product_price * item.quantity).toLocaleString('en-US')}</td>
    </tr>
  `).join('');

  const statusLabel = 
    order.status === 'pending' ? 'بإنتظار تأكيد التاجر'
    : order.status === 'approved' ? 'مجهز للمندوب'
    : order.status === 'delivered' ? 'تم التسليم'
    : order.status === 'completed' ? 'مكتمل'
    : order.status === 'rejected' ? 'مرفوض'
    : order.status === 'cancelled' ? 'ملغي'
    : order.status === 'editing' ? 'قيد التعديل'
    : order.status === 'archived' ? 'مؤرشف'
    : 'غير معروف';

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>قائمة #${invoiceNum} - ${order.merchant_name || 'جملتي'}</title>
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
      <h1>جُملتي</h1>
      <div class="invoice-num">قائمة رقم #${invoiceNum}</div>
      <div class="date">تاريخ القائمة: ${dateStr}</div>
    </div>

    <div class="status ${order.status}">${statusLabel}</div>

    <div class="section">
      <div class="section-title">معلومات التاجر</div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">التاجر: </span><span class="info-value">${order.merchant_name || '---'}</span></div>
        ${(appSupportPhone || order.support_phone) ? `<div class="info-item"><span class="info-label">هاتف الدعم: </span><span class="info-value" dir="ltr">${appSupportPhone || order.support_phone}</span></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">معلومات التوصيل</div>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">الاسم: </span><span class="info-value">${order.store_name}</span></div>
        <div class="info-item"><span class="info-label">الهاتف: </span><span class="info-value" dir="ltr">${order.phone}</span></div>
        <div class="info-item" style="grid-column:span 2;"><span class="info-label">العنوان: </span><span class="info-value">${order.address}</span></div>
        ${order.delivery_worker_name && (order.status === 'delivered' || order.status === 'completed') ? `<div class="info-item" style="grid-column:span 2; background:#ecfdf5; border:1px solid #a7f3d0;"><span class="info-label" style="color:#047857">تم التوصيل بواسطة: </span><span class="info-value" style="color:#059669">${order.delivery_worker_name}</span></div>` : ''}
        ${deliveryDateStr ? `<div class="info-item" style="grid-column:span 2;"><span class="info-label">تاريخ التسليم: </span><span class="info-value" dir="ltr">${deliveryDateStr}</span></div>` : ''}
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
      <div class="total-row"><span>قيمة المنتجات</span><span>${order.subtotal.toLocaleString('en-US')} د.ع</span></div>
      <div class="total-row"><span>أجور التوصيل</span><span>${order.delivery_fee.toLocaleString('en-US')} د.ع</span></div>
      <div class="total-row grand" ${order.is_credit && order.amount_paid !== undefined && order.amount_paid < order.total_rounded ? 'style="border-bottom:none; margin-bottom: 0; padding-bottom: 5px;"' : ''}><span>المجموع الكلي</span><span class="amount">${order.total_rounded.toLocaleString('en-US')} د.ع</span></div>
      ${order.is_credit && order.amount_paid !== undefined && order.amount_paid < order.total_rounded ? `
        <div class="total-row" style="color: #059669; font-weight: bold;"><span>المبلغ الواصل</span><span>${order.amount_paid.toLocaleString('en-US')} د.ع</span></div>
        <div class="total-row grand" style="color: #dc2626; border-top: 1px dashed #fca5a5; padding-top: 10px;"><span>الباقي (دين)</span><span class="amount">${(order.total_rounded - order.amount_paid).toLocaleString('en-US')} د.ع</span></div>
      ` : ''}
    </div>

    <div class="verification">
      <div class="label">كود التحقق السري</div>
      <div class="code">${maskedCode}</div>
      <div class="warning">⚠️ لا تسلم هذا الكود إلا بعد استلام المواد بالكامل والتأكد منها</div>
    </div>

    <div class="footer">
      <p>تم إنشاء هذه القائمة عبر منصة جُملتي</p>
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
function OrderCard({ order, onOrderEdited, isArchiveView = false, appSupportPhone }: { order: OrderData, onOrderEdited?: () => void, isArchiveView?: boolean, appSupportPhone?: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isResponding, setIsResponding] = useState(false)

  // رد المشتري على تعديلات التاجر: موافقة أو إلغاء كامل للشراء
  const handleRespond = useCallback(async (decision: "approve" | "cancel") => {
    if (decision === "cancel" && !confirm("هل أنت متأكد من إلغاء الشراء بالكامل؟ ستُعاد جميع الكميات إلى مخزن التاجر.")) return
    setIsResponding(true)
    try {
      const res = await respondToOrderEdits(order.id, decision)
      if (res.error) {
        alert(res.error)
      } else {
        alert(decision === "approve" ? "تمت الموافقة على التعديلات — سيتجهز التاجر بالقائمة المعدلة" : "تم إلغاء الشراء وإبلاغ التاجر")
        if (onOrderEdited) onOrderEdited()
      }
    } catch {
      alert("حدث خطأ")
    } finally {
      setIsResponding(false)
    }
  }, [order.id, onOrderEdited])

  const statusConfig = useMemo(() => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: order.pending_edits ? {
        label: "بانتظار موافقتك على التعديل",
        color: "text-amber-700 bg-amber-500/10 border-amber-500/40",
        icon: <Edit3 className="w-3.5 h-3.5" />,
      } : {
        label: "بإنتظار تأكيد التاجر",
        color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
        icon: <Clock className="w-3.5 h-3.5" />,
      },
      approved: {
        label: "مجهز للمندوب",
        color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
        icon: <Truck className="w-3.5 h-3.5" />,
      },
      delivered: {
        label: "تم التسليم",
        color: "text-brand-blue bg-brand-blue/10 border-brand-blue/30",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      },
      completed: {
        label: "مكتمل",
        color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      },
      rejected: {
        label: "مرفوض من التاجر",
        color: "text-red-600 bg-red-500/10 border-red-500/30",
        icon: <X className="w-3.5 h-3.5" />,
      },
      cancelled: {
        label: "ملغي",
        color: "text-red-600 bg-red-500/10 border-red-500/30",
        icon: <X className="w-3.5 h-3.5" />,
      },
    }
    return configs[order.status] || configs.pending
  }, [order.status, order.pending_edits])

  // المجاميع المعروضة: تعكس تعديلات التاجر المعلقة إن وُجدت حتى لا يرى المشتري مبلغ القائمة الأصلية
  const displayTotals = useMemo(() => {
    if (order.status !== 'pending' || !order.pending_edits) return null
    const editedQtyMap: Record<string, number> = {}
    for (const s of order.pending_edits.items) editedQtyMap[s.item_id] = s.new_quantity
    const subtotal = (order.items || []).reduce((sum, it) => {
      const q = editedQtyMap[it.id] !== undefined ? editedQtyMap[it.id] : it.quantity
      return sum + it.product_price * q
    }, 0)
    return { subtotal, total: roundTo250(subtotal + (order.delivery_fee || 0)) }
  }, [order])

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
    <div className="bg-white dark:bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* رأس البطاقة */}
      <div 
        onClick={toggleExpand}
        className="p-3 sm:p-4 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">
              {order.merchant_name || order.store_name}
              {order.invoice_number && <span className="text-muted-foreground font-normal mr-1">#{String(order.invoice_number).padStart(5, '0')}</span>}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              تاريخ الطلب: {dateStr}
            </p>
            {order.delivered_at && (
              <p className="text-[10px] text-emerald-600 mt-0.5 font-medium flex items-center gap-1">
                تاريخ التسليم: {new Date(order.delivered_at).toLocaleDateString("ar-IQ", { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left flex flex-col items-end">
            {order.is_credit && order.amount_paid !== undefined && order.amount_paid < order.total_rounded ? (
              <>
                <p className="text-[10px] text-muted-foreground line-through">
                  {order.total_rounded.toLocaleString('en-US')}
                </p>
                <p className="font-black text-red-600 text-sm sm:text-base">
                  الباقي {(order.total_rounded - order.amount_paid).toLocaleString('en-US')}
                </p>
              </>
            ) : (
              <p className="font-black text-primary text-sm sm:text-base">
                {order.total_rounded.toLocaleString('en-US')}
              </p>
            )}
            <div className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusConfig.color} mt-1 w-max mr-auto`}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50 rounded-full shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* التفاصيل (تظهر عند التوسيع) */}
      {expanded && (
        <div className="border-t bg-muted/10 p-3 sm:p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          
          {/* معلومات التوصيل */}
          <div className="bg-white dark:bg-card border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Store className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground truncate">{order.store_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{order.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground font-mono" dir="ltr">{order.phone}</span>
            </div>
            {(order.status === 'delivered' || order.status === 'completed') && order.delivery_worker_name && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
                <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">تم التوصيل بواسطة: {order.delivery_worker_name}</span>
              </div>
            )}
          </div>

          {/* المنتجات */}
          <div>
            <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              المواد المطلوبة ({order.items?.length || 0})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pl-1 pr-2 custom-scrollbar">
              {(order.items || []).map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm bg-white dark:bg-card border rounded-lg p-2.5">
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="font-semibold truncate">{item.product_name}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/50 w-max px-1.5 rounded">{item.unit_type}</span>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold">{item.quantity} × {(item.product_price).toLocaleString('en-US')}</p>
                    <p className="text-[10px] text-primary font-bold">{(item.product_price * item.quantity).toLocaleString('en-US')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* تعديلات التاجر بانتظار موافقة المشتري */}
          {order.status === 'pending' && order.pending_edits && displayTotals && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Edit3 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">عدّل التاجر كميات قائمتك — بانتظار موافقتك</p>
                    <p className="text-[10px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">راجع الكميات الجديدة ثم اختر الموافقة على التغيير أو إلغاء الشراء</p>
                  </div>
                </div>

                {/* القائمة المعدلة: القديم مشطوب ← الجديد */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pl-1 pr-2 custom-scrollbar">
                  {order.pending_edits.items.map(s => (
                    <div key={s.item_id} className="flex justify-between items-center text-sm bg-white dark:bg-card border border-amber-500/20 rounded-lg p-2.5">
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        <span className="font-semibold truncate">{s.product_name}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted/50 w-max px-1.5 rounded">{s.unit_type}</span>
                      </div>
                      <div className="text-left shrink-0 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground line-through">{s.old_quantity}</span>
                        <span className="text-muted-foreground">←</span>
                        {s.new_quantity > 0 ? (
                          <span className="font-black text-amber-600">{s.new_quantity}</span>
                        ) : (
                          <span className="font-black text-red-600 text-xs">غير متوفر</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* المجموع الكلي بعد التعديل */}
                <div className="flex justify-between items-center bg-white dark:bg-card border border-amber-500/20 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-muted-foreground">المجموع الكلي بعد التعديل</span>
                  <span className="font-black text-primary text-sm">{displayTotals.total.toLocaleString('en-US')} د.ع</span>
                </div>

                {/* زرا الموافقة والإلغاء */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-9 sm:h-10"
                    disabled={isResponding}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRespond("approve")
                    }}
                  >
                    {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-1" />}
                    موافق على التغيير
                  </Button>
                  <Button
                    variant="destructive"
                    className="font-bold text-xs sm:text-sm h-9 sm:h-10"
                    disabled={isResponding}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRespond("cancel")
                    }}
                  >
                    {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 ml-1" />}
                    إلغاء الشراء
                  </Button>
                </div>
            </div>
          )}

          {/* كود التحقق */}
          {order.verification_code && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">كود التحقق السري</span>
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-black tracking-[0.3em] text-emerald-700 dark:text-emerald-300 select-all" dir="ltr">
                {order.verification_code}
              </div>
              <p className="text-[10px] text-destructive bg-destructive/10 inline-block px-2 py-1 rounded-md font-bold">
                ⚠️ لا تسلم هذا الكود إلا بعد استلام المواد بالكامل والتأكد منها
              </p>
            </div>
          )}

          {/* الخلاصة وزر الطباعة */}
          <div className="border-t border-dashed pt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>قيمة المنتجات</span>
              <span>{(displayTotals ? displayTotals.subtotal : order.subtotal).toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>أجور التوصيل</span>
              <span>{order.delivery_fee.toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="flex justify-between text-base font-black text-primary pt-2 pb-1 px-1">
              <span>المجموع الكلي</span>
              <span>{(displayTotals ? displayTotals.total : order.total_rounded).toLocaleString('en-US')} د.ع</span>
            </div>

            {/* تفاصيل الدين */}
            {order.is_credit && order.amount_paid !== undefined && order.amount_paid < order.total_rounded && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3 mt-2 space-y-1.5">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-emerald-600">المبلغ الواصل</span>
                  <span className="font-bold text-emerald-600">{order.amount_paid.toLocaleString('en-US')} د.ع</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm pt-1.5 border-t border-red-200 dark:border-red-900/50">
                  <span className="text-red-600 font-bold">الباقي (دين)</span>
                  <span className="font-black text-red-600">{(order.total_rounded - order.amount_paid).toLocaleString('en-US')} د.ع</span>
                </div>
              </div>
            )}

            {!isArchiveView && (
              <Button 
                variant="outline" 
                className="w-full mt-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={(e) => {
                  e.stopPropagation();
                  const deliveryDate = order.delivered_at ? new Date(order.delivered_at).toLocaleDateString("ar-IQ", { dateStyle: 'short', timeStyle: 'short' }) : undefined;
                  handlePrintOrder(order, dateStr, deliveryDate, appSupportPhone || undefined);
                }}
              >
                <Printer className="w-4 h-4 ml-2" />
                طباعة
              </Button>
            )}

            {isArchiveView && (
              <Button 
                variant="outline" 
                className="w-full mt-2 border-blue-500/30 text-blue-600 hover:bg-blue-500/5"
                disabled={isArchiving}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm("هل تريد إرسال هذا الطلب إلى الأرشيف؟")) {
                    setIsArchiving(true);
                    try {
                      const res = await archiveOrder(order.id);
                      if (res.error) {
                        alert(res.error);
                      } else {
                        if (onOrderEdited) onOrderEdited();
                        window.location.reload();
                      }
                    } catch {
                      alert("حدث خطأ");
                    } finally {
                      setIsArchiving(false);
                    }
                  }
                }}
              >
                {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4 ml-2" />}
                أرشفة
              </Button>
            )}
          </div>

          {/* رقم الدعم وزر التعديل (في حالة الانتظار — ويُخفى زر التعديل أثناء انتظار موافقة المشتري على تعديلات التاجر) */}
          {order.status === 'pending' && !order.pending_edits && (
            <div className="pt-3 border-t space-y-3">
              {(appSupportPhone || order.support_phone) && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">
                    لديك استفسار؟ لا تتردد بالاتصال بهاتف الدعم
                  </p>
                  <p className="font-mono text-sm font-bold text-blue-800 dark:text-blue-300" dir="ltr">
                    {appSupportPhone || order.support_phone}
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
                        if (onOrderEdited) onOrderEdited();
                        window.location.href = '/cart';
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
  const [appSupportPhone, setAppSupportPhone] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const fetchSettings = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('app_settings').select('support_phone').single()
        if (data?.support_phone) setAppSupportPhone(data.support_phone)
      }
      fetchSettings()
    }
  }, [open])

  const pendingOrders = useMemo(() =>
    orders.filter(o => ['pending', 'approved', 'editing'].includes(o.status)),
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
                  <OrderCard key={order.id} order={order} onOrderEdited={() => onOpenChange(false)} appSupportPhone={appSupportPhone} />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
