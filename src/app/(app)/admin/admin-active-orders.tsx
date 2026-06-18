"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Store, Package, MapPin, Phone, Clock, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminActiveOrders() {
  const [groupedOrders, setGroupedOrders] = useState<Record<string, { merchantName: string, orders: any[] }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true)
      const supabase = createClient()
      
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          id,
          merchant_id,
          store_name,
          address,
          phone,
          total_rounded,
          status,
          created_at,
          invoice_number,
          items:order_items(
            id,
            product_name,
            product_price,
            quantity,
            unit_type
          )
        `)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })

      if (orders && orders.length > 0) {
        // Fetch merchant names
        const merchantIds = [...new Set(orders.map((o: any) => o.merchant_id).filter(Boolean))]
        let merchantMap: Record<string, string> = {}
        
        if (merchantIds.length > 0) {
          const { data: merchants } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", merchantIds)
          
          if (merchants) {
            merchantMap = merchants.reduce((acc: any, m: any) => {
              acc[m.id] = m.full_name
              return acc
            }, {})
          }
        }

        // Group by merchant
        const grouped: Record<string, { merchantName: string, orders: any[] }> = {}
        orders.forEach((order: any) => {
          const mId = order.merchant_id || "unknown"
          const mName = merchantMap[mId] || "تاجر غير معروف"
          
          if (!grouped[mId]) {
            grouped[mId] = { merchantName: mName, orders: [] }
          }
          grouped[mId].orders.push(order)
        })
        
        setGroupedOrders(grouped)
      }
      setIsLoading(false)
    }

    fetchOrders()
  }, [])

  const merchantsList = Object.entries(groupedOrders)

  if (isLoading) {
    return (
      <Card className="border border-border/40 shadow-premium">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground">أحدث الطلبات (جارية)</CardTitle>
          <CardDescription className="text-xs">جاري تحميل المعاملات...</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/40 shadow-premium">
      <CardHeader className="p-4 sm:p-6 pb-2">
        <CardTitle className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground">أحدث الطلبات (جارية)</CardTitle>
        <CardDescription className="text-xs">
          إجمالي المتاجر التي لديها طلبات نشطة: {merchantsList.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4 space-y-4">
        {merchantsList.length === 0 ? (
          <div className="text-center p-6 bg-muted/20 rounded-xl border border-dashed text-muted-foreground">
            لا توجد طلبات جارية حالياً في المنصة.
          </div>
        ) : (
          <div className="space-y-3">
            {merchantsList.map(([merchantId, data]) => {
              const isMerchantExpanded = expandedMerchant === merchantId

              return (
                <div key={merchantId} className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => {
                      setExpandedMerchant(isMerchantExpanded ? null : merchantId)
                      setExpandedOrder(null)
                    }}
                    className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{data.merchantName}</h4>
                        <p className="text-xs text-brand-orange font-bold mt-0.5">
                          {data.orders.length} طلبات قيد الانتظار أو التجهيز
                        </p>
                      </div>
                    </div>
                    <div className="text-muted-foreground bg-background p-1.5 rounded-full shadow-sm">
                      {isMerchantExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {isMerchantExpanded && (
                    <div className="p-3 sm:p-4 bg-background border-t border-border/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      {data.orders.map((order) => {
                        const isOrderExpanded = expandedOrder === order.id

                        return (
                          <div key={order.id} className="border border-border/60 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedOrder(isOrderExpanded ? null : order.id)}
                              className="w-full flex justify-between items-center p-3 bg-muted/10 hover:bg-muted/30 transition-colors text-right"
                            >
                              <div>
                                <p className="font-bold text-sm text-foreground">{order.store_name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">#{order.invoice_number}</p>
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <div className="text-left">
                                  <p className="font-bold text-xs text-brand-blue dark:text-foreground">{order.total_rounded.toLocaleString('en-US')} د.ع</p>
                                  {order.status === 'pending' ? (
                                    <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-500 font-bold px-1.5 py-0.5 rounded inline-block mt-1">قيد الانتظار</span>
                                  ) : (
                                    <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-500 font-bold px-1.5 py-0.5 rounded inline-block mt-1">تمت الموافقة (جاهز)</span>
                                  )}
                                </div>
                                {isOrderExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            </button>

                            {isOrderExpanded && (
                              <div className="p-3 sm:p-4 border-t border-border/50 bg-card text-right animate-in fade-in slide-in-from-top-1">
                                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 text-xs">
                                  <div className="space-y-1.5 text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span>{order.address}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="w-3.5 h-3.5" />
                                      <span dir="ltr">{order.phone}</span>
                                    </div>
                                  </div>
                                  <div className="text-muted-foreground flex items-center gap-1.5 sm:items-start sm:justify-end">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{new Date(order.created_at).toLocaleString('ar-IQ')}</span>
                                  </div>
                                </div>

                                <div className="bg-muted/30 rounded-lg p-3">
                                  <p className="text-xs font-bold mb-2 flex items-center gap-1.5 text-foreground">
                                    <Package className="w-3.5 h-3.5 text-brand-orange" />
                                    محتويات القائمة:
                                  </p>
                                  <ul className="space-y-2">
                                    {order.items?.map((item: any) => (
                                      <li key={item.id} className="flex justify-between items-center text-xs border-b border-dashed border-border/50 pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-brand-blue dark:text-foreground">{item.product_name}</span>
                                          <span className="text-[10px] text-muted-foreground">({item.unit_type})</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="font-bold tabular-nums text-brand-orange text-center w-8">x{item.quantity}</span>
                                          <span className="font-bold tabular-nums w-16 text-left">{(item.product_price * item.quantity).toLocaleString('en-US')}</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
