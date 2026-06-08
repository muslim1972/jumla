import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Archive as ArchiveIcon } from "lucide-react"
import { ArchiveClient } from "./archive-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function MerchantArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const merchantName = profile?.full_name || user.user_metadata?.full_name || "تاجر"

  // Fetch completed orders for this merchant
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
      created_at,
      status,
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
    .eq("status", "completed")
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
          <ArchiveIcon className="w-6 h-6 text-brand-orange" />
          الأرشيف
        </h1>
        <p className="text-muted-foreground mt-1">
          هنا تظهر جميع الطلبات المكتملة التي تم استلام مبالغها.
        </p>
      </div>

      <ArchiveClient initialOrders={orders || []} merchantName={merchantName} />
    </div>
  )
}
