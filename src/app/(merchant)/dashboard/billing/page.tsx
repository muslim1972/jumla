import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, Receipt } from "lucide-react"
import { RealtimeBillingListener } from "@/components/realtime-billing-listener"
import { BillingListClient } from "./billing-list-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function MerchantBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch billings for this merchant
  const { data: billings } = await supabase
    .from('merchant_billings')
    .select('*')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <RealtimeBillingListener merchantId={user.id} />
      
      <div>
        <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-brand-orange" />
          التحاسب والفواتير
        </h1>
        <p className="text-muted-foreground mt-1">
          هنا تظهر فواتير مبيعاتك المستحقة للتطبيق والمسددة.
        </p>
      </div>

      {!billings || billings.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">لم يتم إصدار أي فواتير تحاسب لك بعد.</p>
        </div>
      ) : (
        <BillingListClient billings={billings} />
      )}
    </div>
  )
}
