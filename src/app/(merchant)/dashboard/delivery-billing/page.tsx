import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Truck } from "lucide-react"
import { DeliveryBillingClient } from "./delivery-billing-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function MerchantDeliveryBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch delivered orders for this merchant
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id,
      store_name,
      address,
      phone,
      total_rounded,
      subtotal,
      delivery_fee,
      invoice_number,
      delivered_at,
      delivery_worker_id,
      delivery_worker_name,
      items:order_items(
        id,
        product_name,
        product_price,
        quantity,
        unit_type
      )
    `)
    .eq("merchant_id", user.id)
    .eq("status", "delivered")
    .order("delivered_at", { ascending: false })

  // Group by delivery worker
  const groupedOrders: Record<string, { workerName: string, orders: any[], totalCollected: number }> = {}

  if (orders) {
    orders.forEach((order: any) => {
      const workerId = order.delivery_worker_id || "unknown"
      const workerName = order.delivery_worker_name || "عامل توصيل غير معروف"
      
      if (!groupedOrders[workerId]) {
        groupedOrders[workerId] = { workerName, orders: [], totalCollected: 0 }
      }
      
      groupedOrders[workerId].orders.push(order)
      groupedOrders[workerId].totalCollected += order.total_rounded
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
          <Truck className="w-6 h-6 text-brand-orange" />
          تحاسب المندوبين
        </h1>
        <p className="text-muted-foreground mt-1">
          هنا تظهر الطلبات التي تم تسليمها بنجاح عن طريق المندوبين والمبالغ المحصلة منهم.
        </p>
      </div>

      <DeliveryBillingClient groupedOrders={groupedOrders} />
    </div>
  )
}
