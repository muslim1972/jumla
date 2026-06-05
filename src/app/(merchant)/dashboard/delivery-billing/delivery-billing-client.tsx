"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Package, User, Phone, MapPin, ReceiptText } from "lucide-react"
import { cn } from "@/lib/utils"

export function DeliveryBillingClient({ groupedOrders }: { groupedOrders: Record<string, { workerName: string, orders: any[], totalCollected: number }> }) {
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null)

  const workers = Object.entries(groupedOrders)

  if (workers.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
        <ReceiptText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">لا توجد طلبات تم تسليمها من قبل المندوبين بعد.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {workers.map(([workerId, data]) => {
        const isExpanded = expandedWorker === workerId

        return (
          <Card key={workerId} className="overflow-hidden border-2 shadow-sm transition-all duration-300 hover:shadow-md border-brand-blue/20">
            <button 
              onClick={() => setExpandedWorker(isExpanded ? null : workerId)}
              className="w-full text-right p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors cursor-pointer bg-brand-blue/5 hover:bg-brand-blue/10"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors bg-brand-blue/10 text-brand-blue">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-brand-blue dark:text-brand-blue">
                    {data.workerName}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    إجمالي الطلبات المسلمة: <span className="font-bold">{data.orders.length}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-left">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي المبالغ المحصلة</p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-sm shadow-sm">
                    {data.totalCollected.toLocaleString()} د.ع
                  </div>
                </div>
                <div className="p-1.5 rounded-full bg-brand-blue/10">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-brand-blue" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-brand-blue" />
                  )}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <CardContent className="p-0 border-t border-border/50">
                  <div className="divide-y divide-border/50">
                    {data.orders.map((order) => (
                      <div key={order.id} className="p-5 hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-lg">{order.store_name}</span>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono text-muted-foreground">#{order.invoice_number}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{order.address}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                <span dir="ltr">{order.phone}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:items-end gap-2">
                            <div className="font-black text-brand-orange text-lg">
                              {order.total_rounded.toLocaleString()} د.ع
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                              تاريخ التسليم: {order.delivered_at ? new Date(order.delivered_at).toLocaleString('ar-IQ') : 'غير متوفر'}
                            </div>
                          </div>
                        </div>

                        {/* Items summary */}
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-bold mb-2 flex items-center gap-1.5 text-muted-foreground">
                            <Package className="w-3.5 h-3.5" />
                            محتويات الطلب:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {order.items?.map((item: any) => (
                              <span key={item.id} className="text-xs bg-background border border-border/50 px-2 py-1 rounded text-foreground">
                                {item.product_name} <span className="text-muted-foreground font-mono">x{item.quantity} {item.unit_type}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
