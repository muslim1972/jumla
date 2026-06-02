"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { getMerchantOrders, approveOrder, rejectOrder } from "./actions"
import { Inbox, CheckCircle, XCircle, Clock, Package, MapPin, Phone, Truck, Loader2, Printer } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    loadOrders()

    const supabase = createClient()
    const channel = supabase
      .channel('merchant-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          // عند حدوث أي تغيير في الطلبات، قم بإعادة التحميل
          loadOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadOrders = async () => {
    setIsLoading(true)
    const result = await getMerchantOrders()
    if (result.orders) {
      setOrders(result.orders)
    } else if (result.error) {
      setErrorMsg(result.error)
    }
    setIsLoading(false)
  }

  const handleApprove = async (orderId: string) => {
    setProcessingId(orderId)
    const result = await approveOrder(orderId)
    if (result.success) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: "approved" } : o))
    } else if (result.error) {
      setErrorMsg(result.error)
    }
    setProcessingId(null)
  }

  const handleReject = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من رفض هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.")) return
    
    setProcessingId(orderId)
    const result = await rejectOrder(orderId)
    if (result.success) {
      setOrders(orders.filter(o => o.id !== orderId))
    } else if (result.error) {
      setErrorMsg(result.error)
    }
    setProcessingId(null)
  }

  const pendingOrders = orders.filter(o => o.status === "pending")
  const approvedOrders = orders.filter(o => o.status === "approved")

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
          <Inbox className="w-6 h-6 text-brand-orange" />
          الطلبات الواردة
        </h1>
        <p className="text-muted-foreground mt-1">
          قم بمراجعة طلبات المشترين، تجهيزها، وإعطاء الموافقة لتسليمها لعامل التوصيل.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 text-red-600 p-4 rounded-xl font-bold border border-red-500/20">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand-orange" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* قسم الطلبات المعلقة */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              طلبات بانتظار الموافقة ({pendingOrders.length})
            </h2>
            
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                لا توجد طلبات جديدة بانتظار الموافقة.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onApprove={() => handleApprove(order.id)}
                    onReject={() => handleReject(order.id)}
                    isProcessing={processingId === order.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* قسم الطلبات المجهزة */}
          {approvedOrders.length > 0 && (
            <section className="space-y-4 pt-8 border-t border-border/50">
              <h2 className="text-xl font-bold flex items-center gap-2 text-brand-blue">
                <Truck className="w-5 h-5 text-emerald-500" />
                طلبات مجهزة بانتظار المندوب ({approvedOrders.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    isApproved={true}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// دالة طباعة القائمة
function handlePrintOrder(order: any, dateStr: string) {
  const invoiceNum = order.invoice_number ? String(order.invoice_number).padStart(5, '0') : '---';
  const maskedCode = order.verification_code.length > 2 
    ? order.verification_code[0] + 'X'.repeat(order.verification_code.length - 2) + order.verification_code[order.verification_code.length - 1]
    : order.verification_code;
  
  const itemsRows = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${item.product_name} <span style="color:#888;font-size:11px;">(${item.unit_type})</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;font-size:13px;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.product_price.toLocaleString()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;font-size:13px;">${(item.product_price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  const statusLabel = order.status === 'pending' ? 'بإنتظار تأكيد التاجر' 
    : order.status === 'approved' ? 'مجهز للمندوب'
    : order.status === 'delivered' ? 'تم التسليم'
    : order.status === 'rejected' ? 'مرفوض من التاجر'
    : 'ملغي';

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>قائمة #${invoiceNum} - ${order.store_name}</title>
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
    .status.approved { background:#dbeafe; color:#1e40af; }
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
      <div class="date">${dateStr}</div>
    </div>

    <div class="status ${order.status}">${statusLabel}</div>

    <div class="section">
      <div class="section-title">معلومات التوصيل للمشتري</div>
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
      <div class="label">كود التحقق السري للطلب</div>
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

function OrderCard({ order, onApprove, onReject, isProcessing, isApproved }: { 
  order: any, 
  onApprove?: () => void, 
  onReject?: () => void, 
  isProcessing?: boolean,
  isApproved?: boolean 
}) {
  return (
    <Card className={cn(
      "overflow-hidden border-2 shadow-sm transition-all duration-300",
      isApproved ? "border-emerald-500/30 bg-emerald-50/10" : "border-brand-orange/20 hover:border-brand-orange/40 hover:shadow-md"
    )}>
      <div className={cn(
        "p-4 border-b flex justify-between items-start",
        isApproved ? "bg-emerald-500/10" : "bg-brand-orange/5"
      )}>
        <div className="space-y-1">
          <h3 className="font-black text-lg">{order.store_name}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {new Date(order.created_at).toLocaleString('ar-IQ')}
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="font-black text-brand-orange text-lg tabular-nums">
            {order.total_rounded.toLocaleString()} د.ع
          </div>
          {isApproved ? (
            <div className="text-[10px] mt-1 font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> مجهز للمندوب
            </div>
          ) : (
            <div className="text-[10px] mt-1 font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> بانتظار المراجعة
            </div>
          )}
        </div>
      </div>
      
      <CardContent className="p-4 space-y-4">
        {/* معلومات الزبون */}
        <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm border border-border/50">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{order.address}</span>
          </div>
          <div className="flex items-center gap-2 font-mono" dir="ltr">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{order.phone}</span>
          </div>
        </div>

        {/* قائمة المواد */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <Package className="w-4 h-4" /> المواد المطلوبة ({order.items?.length || 0})
          </div>
          <ul className="space-y-2 max-h-32 overflow-y-auto pr-2 no-scrollbar">
            {order.items?.map((item: any) => (
              <li key={item.id} className="flex justify-between items-center text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-bold">{item.product_name}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{item.quantity} {item.unit_type}</span>
                  <span>×</span>
                  <span className="font-mono">{item.product_price.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* الإجراءات */}
        {!isApproved ? (
          <div className="pt-2 flex items-center gap-2 border-t border-border/50">
            <Button 
              onClick={onApprove} 
              disabled={isProcessing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
              تجهيز
            </Button>
            <Button 
              onClick={onReject} 
              disabled={isProcessing}
              variant="destructive"
              className="flex-[0.3] bg-red-500 hover:bg-red-600 text-white"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
              رفض
            </Button>
            <Button 
              onClick={() => handlePrintOrder(order, new Date(order.created_at).toLocaleString('ar-IQ'))} 
              variant="outline" 
              size="icon"
              title="طباعة القائمة"
              className="shrink-0"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="pt-2 border-t border-border/50">
            <Button 
              onClick={() => handlePrintOrder(order, new Date(order.created_at).toLocaleString('ar-IQ'))} 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              طباعة القائمة
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
