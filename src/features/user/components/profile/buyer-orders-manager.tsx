"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { deletePendingOrder, requestOrderDeletion } from "@/app/actions/buyer-orders-actions"

interface BuyerOrdersManagerProps {
  activeOrders: any[]
  onOrdersChange: (updater: (prev: any[] | null) => any[] | null) => void
}

export function BuyerOrdersManager({ activeOrders, onOrdersChange }: BuyerOrdersManagerProps) {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const handleOrderAction = async (orderId: string, status: string, cancelRequested: boolean) => {
    setActionLoadingId(orderId)
    if (status === "pending") {
      const res = await deletePendingOrder(orderId)
      if (res.success) {
        onOrdersChange(prev => prev ? prev.filter(o => o.id !== orderId) : null)
      } else {
        alert(res.error)
      }
    } else {
      if (cancelRequested) {
        setActionLoadingId(null)
        return
      }
      const res = await requestOrderDeletion(orderId)
      if (res.success) {
        onOrdersChange(prev => prev ? prev.map(o => o.id === orderId ? { ...o, cancel_requested: true } : o) : null)
        alert("تم إرسال طلب الحذف للتاجر. يرجى الانتظار حتى يوافق عليه.")
      } else {
        alert(res.error)
      }
    }
    setActionLoadingId(null)
  }

  return (
    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
      {activeOrders.map(order => {
        const merchantName = order.profiles?.store_name || order.profiles?.full_name || "تاجر غير معروف"
        const invoiceLabel = order.invoice_number
          ? `#${String(order.invoice_number).padStart(5, '0')}`
          : "بدون رقم"
        const orderDate = order.created_at
          ? new Date(order.created_at).toLocaleDateString("ar-IQ", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"
        return (
          <div key={order.id} className="bg-background border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="text-right w-full space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">التاجر:</span>
                <span className="font-bold text-sm text-foreground">{merchantName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">رقم القائمة:</span>
                <span className="font-mono text-xs font-bold text-foreground">{invoiceLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">التأريخ:</span>
                <span className="text-xs text-muted-foreground">{orderDate}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">المجموع:</span>
                <span className="text-xs font-bold text-foreground">{order.total_rounded?.toLocaleString("en-US")} د.ع</span>
              </div>
              <p className="text-[10px] font-bold mt-1.5">
                {order.status === "pending" ? (
                  <span className="text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">بانتظار الموافقة</span>
                ) : order.status === "approved" ? (
                  <span className="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">تمت الموافقة / بانتظار المندوب</span>
                ) : (
                  <span className="text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">قيد التوصيل</span>
                )}
              </p>
            </div>
            <Button
              variant={order.status === "pending" ? "destructive" : "outline"}
              size="sm"
              disabled={actionLoadingId === order.id || order.cancel_requested}
              onClick={() => handleOrderAction(order.id, order.status, order.cancel_requested)}
              className={`w-full sm:w-auto shrink-0 ${order.status !== "pending" && !order.cancel_requested ? "border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600" : ""}`}
            >
              {actionLoadingId === order.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : order.cancel_requested ? (
                "تم طلب الحذف"
              ) : order.status === "pending" ? (
                "حذف الطلب"
              ) : (
                "طلب حذف"
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
