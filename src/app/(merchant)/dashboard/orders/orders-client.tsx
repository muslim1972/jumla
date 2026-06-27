"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { getMerchantOrders, approveOrder, rejectOrder, receiveOrderAmount, approveOrderDeletion } from "./actions"
import { CheckCircle, XCircle, Clock, Package, MapPin, Phone, Truck, Loader2, Printer } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function OrdersClient({ initialOrders = [] }: { initialOrders?: any[] }) {
  const [orders, setOrders] = useState<any[]>(initialOrders)
  const [isLoading, setIsLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  useEffect(() => {
    // Only load if no initial orders were provided
    if (initialOrders.length === 0) {
      loadOrders()
    }

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
          invoice_number, verification_code, status, cancel_requested, created_at, delivery_worker_name,
          is_credit, amount_paid, delivered_at,
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
      const updatedOrder = { ...orders.find(o => o.id === orderId), status: "approved" };
      setOrders(orders.map(o => o.id === orderId ? updatedOrder : o))
      if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder)
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
      if (selectedOrder?.id === orderId) setSelectedOrder(null)
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
        if (selectedOrder?.id === orderId) setSelectedOrder(null)
        alert("تم استلام المبلغ بنجاح ونقل الطلب للأرشيف!")
      } else if (result && result.error) {
        setErrorMsg(result.error)
        alert("عذراً، حدث خطأ: " + result.error)
      } else {
        alert("عذراً، لم نتمكن من استلام تأكيد من الخادم.")
      }
    } catch (err: any) {
      console.error(err)
      alert("عذراً، حدث خطأ غير متوقع في النظام. يرجى المحاولة مرة أخرى.")
    } finally {
      setProcessingId(null)
    }
  }

  const pendingOrders = orders.filter(o => o.status === "pending" && !o.cancel_requested)
  const approvedOrders = orders.filter(o => o.status === "approved" && !o.cancel_requested)
  const deliveredOrders = orders.filter(o => o.status === "delivered" && !o.cancel_requested)
  const cancellationRequests = orders.filter(o => o.cancel_requested)

  const handleApproveDeletion = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من الموافقة على حذف هذا الطلب؟ سيتم إزالته نهائياً.")) return
    
    setProcessingId(orderId)
    const result = await approveOrderDeletion(orderId)
    if (result.success) {
      setOrders(orders.filter(o => o.id !== orderId))
      if (selectedOrder?.id === orderId) setSelectedOrder(null)
      alert("تم حذف الطلب بنجاح.")
    } else if (result.error) {
      setErrorMsg(result.error)
      alert("عذراً، حدث خطأ: " + result.error)
    }
    setProcessingId(null)
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-5xl space-y-4 sm:space-y-6 pb-20">
      {errorMsg && (
        <div className="bg-red-500/10 text-red-600 p-4 rounded-xl font-bold border border-red-500/20 text-xs sm:text-sm">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-brand-orange" />
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-6 items-start">
            {/* العمود الأيمن: بانتظار الموافقة */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="font-bold text-xs sm:text-lg text-amber-600 flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                بانتظار الموافقة ({pendingOrders.length})
              </h2>
              {pendingOrders.length === 0 ? (
                <p className="text-[10px] sm:text-sm text-muted-foreground p-3 sm:p-6 text-center bg-muted/20 rounded-xl border border-dashed">لا يوجد</p>
              ) : (
                pendingOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                ))
              )}
            </div>

            {/* العمود الأيسر: مجهزة بانتظار المندوب */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="font-bold text-xs sm:text-lg text-emerald-600 flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <Truck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                بانتظار المندوب ({approvedOrders.length})
              </h2>
              {approvedOrders.length === 0 ? (
                <p className="text-[10px] sm:text-sm text-muted-foreground p-3 sm:p-6 text-center bg-muted/20 rounded-xl border border-dashed">لا يوجد</p>
              ) : (
                approvedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} isApproved={true} onClick={() => setSelectedOrder(order)} />
                ))
              )}
            </div>
          </div>

          {/* الطلبات المُسلمة بانتظار استلام المبلغ */}
          {deliveredOrders.length > 0 && (
            <div className="pt-4 sm:pt-8 border-t border-border/50">
              <h2 className="font-bold text-xs sm:text-lg text-red-600 flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                <CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                مُسلمة بانتظار استلام المبلغ من المندوب ({deliveredOrders.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-6 items-start">
                {deliveredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} isDelivered={true} onClick={() => setSelectedOrder(order)} />
                ))}
              </div>
            </div>
          )}

          {/* طلبات الإلغاء (المرفوضة) */}
          {cancellationRequests.length > 0 && (
            <div className="pt-4 sm:pt-8 border-t border-border/50">
              <h2 className="font-bold text-xs sm:text-lg text-purple-600 flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                <XCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                طلبات الإلغاء ({cancellationRequests.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-6 items-start">
                {cancellationRequests.map((order) => (
                  <OrderCard key={order.id} order={order} isCancellation={true} onClick={() => setSelectedOrder(order)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <OrderDialog 
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(isOpen: boolean) => !isOpen && setSelectedOrder(null)}
        isProcessing={processingId === selectedOrder?.id}
        onApprove={() => selectedOrder && handleApprove(selectedOrder.id)}
        onReject={() => selectedOrder && handleReject(selectedOrder.id)}
        onReceiveAmount={() => selectedOrder && handleReceiveAmount(selectedOrder.id)}
        onApproveDeletion={() => selectedOrder && handleApproveDeletion(selectedOrder.id)}
      />
    </div>
  )
}

function OrderCard({ order, isApproved, isDelivered, isCancellation, onClick }: { order: any, isApproved?: boolean, isDelivered?: boolean, isCancellation?: boolean, onClick: () => void }) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "overflow-hidden border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        isCancellation ? "border-purple-500/30 hover:border-purple-500/60" :
        isDelivered ? "border-red-500/30 hover:border-red-500/60" :
        isApproved ? "border-emerald-500/30 hover:border-emerald-500/60" : "border-amber-500/30 hover:border-amber-500/60"
      )}
    >
      <div 
        className={cn(
          "w-full text-right p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-3 transition-colors",
          isCancellation ? "bg-purple-500/5" :
          isDelivered ? "bg-red-500/5" :
          isApproved ? "bg-emerald-500/5" : "bg-amber-500/5"
        )}
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner",
              isCancellation ? "bg-purple-500/10 text-purple-600" :
              isDelivered ? "bg-red-500/10 text-red-600" :
              isApproved ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            )}>
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className={cn(
                "font-bold text-xs sm:text-sm truncate",
                isCancellation ? "text-purple-700 dark:text-purple-500" :
                isDelivered ? "text-red-700 dark:text-red-500" :
                isApproved ? "text-emerald-700 dark:text-emerald-500" : "text-amber-700 dark:text-amber-500"
              )}>
                {order.store_name}
              </h3>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground font-mono mt-0.5 truncate flex items-center gap-1" dir="ltr">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                {new Date(order.created_at).toLocaleTimeString('ar-IQ')}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-row-reverse sm:flex-col justify-between items-center sm:items-end mt-1 sm:mt-0">
             <div className="font-black text-brand-orange text-xs sm:text-sm">
               {(order.is_credit ? order.amount_paid : order.total_rounded).toLocaleString('en-US')} د.ع
             </div>
            {isCancellation ? (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-purple-500/10 text-purple-600 font-bold text-[8px] sm:text-[10px] mt-0 sm:mt-1">
                <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                طلب إلغاء
              </div>
            ) : isDelivered ? (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-red-500/10 text-red-600 font-bold text-[8px] sm:text-[10px] mt-0 sm:mt-1">
                <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                تم التوصيل
              </div>
            ) : isApproved ? (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[8px] sm:text-[10px] mt-0 sm:mt-1">
                <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                مجهز للمندوب
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-amber-500/10 text-amber-600 font-bold text-[8px] sm:text-[10px] shadow-sm mt-0 sm:mt-1">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-pulse" />
                بانتظار المراجعة
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function OrderDialog({ order, open, onOpenChange, isProcessing, onApprove, onReject, onReceiveAmount, onApproveDeletion }: any) {
  if (!order) return null

  const isApproved = order.status === 'approved'
  const isDelivered = order.status === 'delivered'
  const isCancellation = order.cancel_requested

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-0 bg-transparent shadow-none" showCloseButton={false}>
        <div className="bg-card rounded-xl border border-border/40 shadow-premium overflow-hidden mx-2 sm:mx-0">
          <DialogHeader className={cn(
            "p-4 sm:p-6 border-b text-right",
            isCancellation ? "bg-purple-500/5" :
            isDelivered ? "bg-red-500/5" :
            isApproved ? "bg-emerald-500/5" : "bg-amber-500/5"
          )}>
            <DialogTitle className={cn(
              "flex items-center justify-between text-base sm:text-lg font-black",
              isCancellation ? "text-purple-700 dark:text-purple-500" :
              isDelivered ? "text-red-700 dark:text-red-500" :
              isApproved ? "text-emerald-700 dark:text-emerald-500" : "text-amber-700 dark:text-amber-500"
            )}>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 shrink-0" />
                <span className="truncate">{order.store_name}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-right max-h-[75vh] overflow-y-auto custom-scrollbar">
             {/* تفاصيل المشتري */}
             <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground bg-muted/20 p-2 sm:p-2.5 rounded-lg border border-border/50">
                  <MapPin className="w-4 h-4 shrink-0 text-brand-blue" />
                  <span className="truncate">{order.address}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground font-mono bg-muted/20 p-2 sm:p-2.5 rounded-lg border border-border/50" dir="ltr">
                  <Phone className="w-4 h-4 shrink-0 text-brand-blue" />
                  <span className="flex-1 text-right">{order.phone}</span>
                </div>
             </div>

             {/* حالة الطلب الإضافية */}
             {isDelivered && order.delivery_worker_name && (
               <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-red-600 bg-red-100 p-2.5 sm:p-3 rounded-lg border border-red-200">
                 <CheckCircle className="w-4 h-4 shrink-0" />
                 تم التوصيل بواسطة: {order.delivery_worker_name}
               </div>
             )}

             {/* جدول العناصر */}
             {order.items && order.items.length > 0 && (
               <div className="border border-border/50 shadow-sm rounded-lg overflow-hidden bg-card/50">
                 <table className="w-full text-[10px] sm:text-xs">
                   <thead>
                     <tr className="bg-muted/50 text-muted-foreground border-b border-border/50">
                       <th className="text-right p-2 sm:p-2.5 font-semibold">المنتج</th>
                       <th className="text-center p-2 sm:p-2.5 font-semibold">الكمية</th>
                       <th className="text-left p-2 sm:p-2.5 font-semibold">المجموع</th>
                     </tr>
                   </thead>
                   <tbody>
                     {order.items.map((item: any, idx: number) => (
                       <tr key={item.id} className={idx < order.items.length - 1 ? "border-b border-dashed border-border/50" : ""}>
                         <td className="p-2 sm:p-2.5">
                           <span className="font-bold text-brand-blue dark:text-foreground block">{item.product_name}</span>
                           <span className="text-[9px] sm:text-[10px] text-muted-foreground">({item.unit_type})</span>
                         </td>
                         <td className="text-center p-2 sm:p-2.5 font-black tabular-nums text-brand-orange text-xs sm:text-sm">{item.quantity}</td>
                         <td className="text-left p-2 sm:p-2.5 font-bold tabular-nums text-brand-blue dark:text-foreground">
                           {(item.product_price * item.quantity).toLocaleString('en-US')}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}

             {/* المجموع */}
             <div className="flex justify-between items-center p-3 sm:p-4 bg-brand-orange/5 border border-brand-orange/10 rounded-lg">
                <span className="font-bold text-xs sm:text-sm text-brand-blue">المجموع الكلي</span>
                <span className="font-black text-brand-orange text-base sm:text-lg">{order.total_rounded.toLocaleString('en-US')} د.ع</span>
             </div>

             {order.is_credit && (
               <div className="flex flex-col gap-2 mt-2 p-3 sm:p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg text-sm">
                 <div className="flex justify-between">
                   <span className="text-emerald-700 font-bold">المبلغ الواصل للمندوب:</span>
                   <span className="font-black text-emerald-700">{order.amount_paid.toLocaleString('en-US')} د.ع</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-red-600 font-bold">الباقي (يُسجل ديناً):</span>
                   <span className="font-black text-red-600">{(order.total_rounded - order.amount_paid).toLocaleString('en-US')} د.ع</span>
                 </div>
               </div>
             )}

              {/* الإجراءات */}
             <div className="pt-4 border-t border-border/50 space-y-2 sm:space-y-3">
                {isCancellation ? (
                  <div className="flex flex-col gap-2">
                    <div className="bg-purple-500/10 text-purple-700 border border-purple-500/20 p-3 rounded-lg text-xs font-bold text-center">
                      لقد طلب المشتري إلغاء هذا الطلب ليتمكن من حذف حسابه.
                    </div>
                    <Button 
                      onClick={onApproveDeletion} 
                      disabled={isProcessing}
                      variant="destructive"
                      className="w-full font-bold text-xs sm:text-sm h-9 sm:h-10"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
                      موافق على الحذف
                    </Button>
                  </div>
                ) : (
                  <>
                    {!isApproved && !isDelivered && (
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={onApprove} 
                          disabled={isProcessing}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs sm:text-sm h-9 sm:h-10"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                          تجهيز للمندوب
                        </Button>
                        <Button 
                          onClick={onReject} 
                          disabled={isProcessing}
                          variant="destructive"
                          className="flex-[0.4] text-xs sm:text-sm h-9 sm:h-10"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
                          رفض
                        </Button>
                      </div>
                    )}

                    {isDelivered && (
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={onReceiveAmount} 
                          disabled={isProcessing}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm h-9 sm:h-10"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                          استلام المبلغ
                        </Button>
                      </div>
                    )}
                  </>
                )}

                <Button 
                  onClick={() => {
                    const printDate = new Date(order.created_at).toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' });
                    const deliveryDate = order.delivered_at ? new Date(order.delivered_at).toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' }) : undefined;
                    handlePrintOrder(order, printDate, deliveryDate);
                  }} 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2 text-xs sm:text-sm h-9 sm:h-10 border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5"
                >
                  <Printer className="w-4 h-4" />
                  طباعة القائمة
                </Button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function handlePrintOrder(order: any, dateStr: string, deliveryDateStr?: string) {
  const invoiceNum = order.invoice_number ? String(order.invoice_number).padStart(5, '0') : '---';
  const maskedCode = order.verification_code && order.verification_code.length > 2 
    ? order.verification_code[0] + 'X'.repeat(order.verification_code.length - 2) + order.verification_code[order.verification_code.length - 1]
    : order.verification_code || '---';
  
  const itemsRows = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${item.product_name} <span style="color:#888;font-size:11px;">(${item.unit_type})</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;font-size:13px;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.product_price?.toLocaleString('en-US') || 0}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;font-size:13px;">${((item.product_price || 0) * item.quantity).toLocaleString('en-US')}</td>
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة المبيعات #${invoiceNum}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: #f8f9fa; margin: 0; padding: 20px; color: #111; }
    .invoice { width: 100%; max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 2px dashed #eee; padding-bottom: 20px; }
    .header h1 { font-weight: 900; color: #e85d26; margin: 0; font-size: 28px; letter-spacing: -0.5px; }
    .invoice-num { font-size: 14px; color: #666; margin-top: 5px; font-weight: 600; }
    .date { font-size: 12px; color: #999; margin-top: 2px; }
    
    @media screen and (max-width: 600px) {
      body { padding: 10px; }
      .invoice { padding: 15px; box-shadow: none; border: 1px solid #eee; }
      .header h1 { font-size: 24px; }
      th, td { font-size: 11px !important; padding: 6px !important; }
      .info-grid { grid-template-columns: 1fr; }
      .info-item[style*="grid-column"] { grid-column: 1 !important; }
    }
    
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
      <div class="date">تاريخ القائمة: ${dateStr}</div>
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
        ${order.delivery_worker_name && (order.status === 'delivered' || order.status === 'completed') ? `<div class="info-item" style="grid-column:span 2; background:#ecfdf5; border:1px solid #a7f3d0;"><span class="info-label" style="color:#047857">تم التوصيل بواسطة: </span><span class="info-value" style="color:#059669">${order.delivery_worker_name}</span></div>` : ''}
        ${deliveryDateStr ? `<div class="info-item" style="grid-column:span 2;"><span class="info-label">تاريخ التسليم: </span><span class="info-value" dir="ltr">${deliveryDateStr}</span></div>` : ''}
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
      <div class="total-row"><span>قيمة المنتجات</span><span>${(order.subtotal || 0).toLocaleString('en-US')} د.ع</span></div>
      <div class="total-row"><span>أجور التوصيل</span><span>${(order.delivery_fee || 0).toLocaleString('en-US')} د.ع</span></div>
      <div class="total-row grand" ${order.is_credit && order.amount_paid !== undefined && order.amount_paid < order.total_rounded ? 'style="border-bottom:none; margin-bottom: 0; padding-bottom: 5px;"' : ''}><span>المجموع الكلي</span><span class="amount">${(order.total_rounded || 0).toLocaleString('en-US')} د.ع</span></div>
      ${order.is_credit && order.amount_paid !== undefined && order.amount_paid < order.total_rounded ? `
        <div class="total-row" style="color: #059669; font-weight: bold;"><span>المبلغ الواصل</span><span>${order.amount_paid.toLocaleString('en-US')} د.ع</span></div>
        <div class="total-row grand" style="color: #dc2626; border-top: 1px dashed #fca5a5; padding-top: 10px;"><span>الباقي (دين)</span><span class="amount">${((order.total_rounded || 0) - order.amount_paid).toLocaleString('en-US')} د.ع</span></div>
      ` : ''}
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

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      // Optional: URL.revokeObjectURL(url) can be called after a delay
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
  }
}
