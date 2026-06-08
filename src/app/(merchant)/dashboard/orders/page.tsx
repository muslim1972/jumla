"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { getMerchantOrders, approveOrder, rejectOrder, receiveOrderAmount } from "./actions"
import { Inbox, CheckCircle, XCircle, Clock, Package, MapPin, Phone, Truck, Loader2, Printer, ChevronDown, ChevronUp } from "lucide-react"
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: fetchedOrders, error } = await supabase
        .from("orders")
        .select(`
          id, store_name, address, phone, total_rounded, subtotal, delivery_fee,
          invoice_number, verification_code, status, created_at,
          items:order_items(id, product_name, product_price, quantity, unit_type)
        `)
        .eq("merchant_id", user.id)
        .in("status", ["pending", "approved", "delivered"])
        .order("created_at", { ascending: false })

      if (fetchedOrders) setOrders(fetchedOrders)
      if (error) setErrorMsg(error.message)
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

  const handleReceiveAmount = async (orderId: string) => {
    try {
      if (!confirm("هل أنت متأكد من استلام مبلغ هذه القائمة من المندوب؟ ستنتقل القائمة إلى الأرشيف.")) return
      
      setProcessingId(orderId)
      const result = await receiveOrderAmount(orderId)
      if (result && result.success) {
        setOrders(orders.filter(o => o.id !== orderId))
        alert("تم استلام المبلغ بنجاح ونقل الطلب للأرشيف!")
      } else if (result && result.error) {
        setErrorMsg(result.error)
        alert("خطأ من الخادم: " + result.error)
      } else {
        alert("حدث خطأ غريب: لم يرجع الخادم أي نتيجة.")
      }
    } catch (err: any) {
      console.error(err)
      alert("خطأ في النظام أثناء محاولة الاتصال بالخادم: " + err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const pendingOrders = orders.filter(o => o.status === "pending")
  const approvedOrders = orders.filter(o => o.status === "approved")
  const deliveredOrders = orders.filter(o => o.status === "delivered")

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

          {/* قسم الطلبات المُسلّمة بانتظار التسديد */}
          {deliveredOrders.length > 0 && (
            <section className="space-y-4 pt-8 border-t border-border/50">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-600">
                <CheckCircle className="w-5 h-5 text-red-500" />
                طلبات مُسلّمة بانتظار استلام المبلغ ({deliveredOrders.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliveredOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    isDelivered={true}
                    onReceiveAmount={() => handleReceiveAmount(order.id)}
                    isProcessing={processingId === order.id}
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
  const maskedCode = order.verification_code && order.verification_code.length > 2 
    ? order.verification_code[0] + 'X'.repeat(order.verification_code.length - 2) + order.verification_code[order.verification_code.length - 1]
    : order.verification_code || '---';
  
  const itemsRows = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${item.product_name} <span style="color:#888;font-size:11px;">(${item.unit_type})</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;font-size:13px;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.product_price?.toLocaleString() || 0}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;font-size:13px;">${((item.product_price || 0) * item.quantity).toLocaleString()}</td>
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
  <title>فاتورة المبيعات #${invoiceNum}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Cairo', sans-serif; background: #f8f9fa; margin: 0; padding: 20px; color: #111; }
    .invoice { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 2px dashed #eee; padding-bottom: 20px; }
    .header h1 { font-weight: 900; color: #e85d26; margin: 0; font-size: 28px; letter-spacing: -0.5px; }
    .invoice-num { font-size: 14px; color: #666; margin-top: 5px; font-weight: 600; }
    .date { font-size: 12px; color: #999; margin-top: 2px; }
    
    .status { text-align: center; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; margin-bottom: 20px; display: inline-block; }
    .status.pending { background: #fff3cd; color: #856404; }
    .status.approved { background: #d4edda; color: #155724; }
    .status.delivered { background: #cce5ff; color: #004085; }

    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: 800; color: #333; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
    
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { background: #f8f9fa; padding: 10px; border-radius: 6px; }
    .info-label { font-size: 11px; color: #666; display: block; margin-bottom: 2px; }
    .info-value { font-size: 13px; font-weight: 700; color: #111; display: block; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f8f9fa; padding: 10px 12px; font-size: 12px; color: #444; border-bottom: 2px solid #eee; }
    
    .totals { border-top: 2px solid #eee; padding-top: 15px; margin-top: 15px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #555; }
    .total-row.grand { font-size: 16px; font-weight: 900; color: #111; margin-top: 5px; padding-top: 10px; border-top: 1px dashed #eee; }
    .total-row.grand .amount { color: #e85d26; }

    .verification { background: #f0fdf4; border: 1px dashed #22c55e; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; }
    .verification .label { font-size: 12px; color: #166534; font-weight: bold; margin-bottom: 5px; }
    .verification .code { font-family: monospace; font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #15803d; }
    .verification .warning { font-size: 10px; color: #dc2626; margin-top: 8px; font-weight: bold; background: #fef2f2; padding: 4px; border-radius: 4px; }

    .footer { text-align: center; font-size: 11px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }

    @media print {
      body { background: #fff; padding: 0; }
      .invoice { box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
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

    <div style="text-align: center;">
      <div class="status ${order.status}">${statusLabel}</div>
    </div>

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
            <th style="text-align:right;">المنتج</th>
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
      <div class="total-row"><span>قيمة المنتجات</span><span>${(order.subtotal || 0).toLocaleString()} د.ع</span></div>
      <div class="total-row"><span>أجور التوصيل</span><span>${(order.delivery_fee || 0).toLocaleString()} د.ع</span></div>
      <div class="total-row grand"><span>المجموع الكلي</span><span class="amount">${(order.total_rounded || 0).toLocaleString()} د.ع</span></div>
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

function OrderCard({ order, onApprove, onReject, isProcessing, isApproved, isDelivered, onReceiveAmount }: { 
  order: any, 
  onApprove?: () => void, 
  onReject?: () => void, 
  isProcessing?: boolean,
  isApproved?: boolean,
  isDelivered?: boolean,
  onReceiveAmount?: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={cn(
      "border rounded-xl bg-card overflow-hidden transition-all duration-300 shadow-sm w-full",
      isDelivered ? "border-red-500/30 bg-red-50/10" :
      isApproved ? "border-emerald-500/30 bg-emerald-50/10" : "hover:border-brand-orange/40"
    )}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between p-4 text-right cursor-pointer"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-brand-blue">{order.store_name}</span>
            {isDelivered && (
              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> تم التوصيل للعميل
              </span>
            )}
            {!isDelivered && isApproved && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> مجهز للمندوب
              </span>
            )}
            {!isDelivered && !isApproved && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> بانتظار المراجعة
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{order.address}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono" dir="ltr">
            <Phone className="w-3.5 h-3.5" />
            <span>{order.phone}</span>
          </div>
        </div>
        <div className="text-left shrink-0 flex flex-col items-end">
          <div className="font-black text-brand-orange tabular-nums">
            {order.total_rounded.toLocaleString()} د.ع
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
            {new Date(order.created_at).toLocaleTimeString('ar-IQ')}
          </div>
          <div className="text-muted-foreground mt-2">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t bg-muted/10 animate-in slide-in-from-top-2">
          {/* قائمة المواد */}
          {order.items && order.items.length > 0 && (
            <div className="border border-border/50 shadow-sm rounded-lg overflow-hidden bg-card mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground">
                    <th className="text-right p-2 font-semibold">المنتج</th>
                    <th className="text-center p-2 font-semibold">الكمية</th>
                    <th className="text-left p-2 font-semibold">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: any, idx: number) => (
                    <tr key={item.id} className={idx < order.items.length - 1 ? "border-b border-dashed border-border/50" : ""}>
                      <td className="p-2">
                        <span className="font-medium text-brand-blue dark:text-foreground">{item.product_name}</span>
                        <span className="text-[10px] text-muted-foreground mr-1">({item.unit_type})</span>
                      </td>
                      <td className="text-center p-2 font-bold tabular-nums text-brand-orange">{item.quantity}</td>
                      <td className="text-left p-2 font-bold tabular-nums text-brand-blue dark:text-foreground">
                        {(item.product_price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* الإجراءات */}
          {!isApproved && !isDelivered ? (
            <div className="pt-2 flex items-center gap-2 border-t border-border/50">
              <Button 
                onClick={(e) => { e.stopPropagation(); onApprove && onApprove(); }} 
                disabled={isProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                تجهيز
              </Button>
              <Button 
                onClick={(e) => { e.stopPropagation(); onReject && onReject(); }} 
                disabled={isProcessing}
                variant="destructive"
                className="flex-[0.3] bg-red-500 hover:bg-red-600 text-white"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
                رفض
              </Button>
              <Button 
                onClick={(e) => { e.stopPropagation(); handlePrintOrder(order, new Date(order.created_at).toLocaleString('ar-IQ')); }} 
                variant="outline" 
                size="icon"
                title="طباعة القائمة"
                className="shrink-0"
              >
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          ) : isDelivered ? (
            <div className="pt-2 border-t border-border/50 flex items-center gap-2">
              <Button 
                onClick={(e) => { e.stopPropagation(); onReceiveAmount && onReceiveAmount(); }} 
                disabled={isProcessing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                استلام المبلغ
              </Button>
              <Button 
                onClick={(e) => { e.stopPropagation(); handlePrintOrder(order, new Date(order.created_at).toLocaleString('ar-IQ')); }} 
                variant="outline" 
                size="icon"
                title="طباعة القائمة"
                className="shrink-0"
              >
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="pt-2 border-t border-border/50 flex items-center gap-2">
              <Button 
                onClick={(e) => { e.stopPropagation(); handlePrintOrder(order, new Date(order.created_at).toLocaleString('ar-IQ')); }} 
                variant="outline" 
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                طباعة القائمة
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
