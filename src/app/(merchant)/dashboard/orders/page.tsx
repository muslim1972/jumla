"use client"

import { useState, useEffect } from "react"
import { getMerchantOrders, approveOrder, rejectOrder } from "./actions"
import { Inbox, CheckCircle, XCircle, Clock, Package, MapPin, Phone, Truck, Loader2 } from "lucide-react"
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
        {!isApproved && (
          <div className="pt-2 flex items-center gap-3 border-t border-border/50">
            <Button 
              onClick={onApprove} 
              disabled={isProcessing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-2" />}
              قبول وتجهيز
            </Button>
            <Button 
              onClick={onReject} 
              disabled={isProcessing}
              variant="destructive"
              className="flex-[0.4] bg-red-500 hover:bg-red-600 text-white"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
              رفض
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
