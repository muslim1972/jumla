import { getMerchantOrders } from "./actions"
import { OrdersClient } from "./orders-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function MerchantOrdersPage() {
  const result = await getMerchantOrders()
  
  if (result.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 text-red-600 p-4 rounded-xl font-bold border border-red-500/20">
          {result.error}
        </div>
      </div>
    )
  }

  return <OrdersClient initialOrders={result.orders || []} />
}
