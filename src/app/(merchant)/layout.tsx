import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { MerchantTabs } from "@/features/merchant/components/merchant-tabs"

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'merchant') {
    redirect("/")
  }

  // جلب عدد الطلبات قيد الانتظار الأولية (والتي تشمل قيد الانتظار والمسلمة بانتظار استلام المبلغ)
  const { count: initialPendingCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', user.id)
    .in('status', ['pending', 'delivered'])

  // جلب عدد فواتير التطبيق غير المسددة
  const { count: initialUnpaidBillsCount } = await supabase
    .from('merchant_billings')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', user.id)
    .neq('status', 'paid')

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* غطاء خلفية علوي ملتصف لحجب المحتوى المار لأعلى أثناء التمرير */}
      <div className="sticky top-0 h-16 w-full bg-background/95 backdrop-blur-md z-30" />
      <MerchantTabs 
        merchantId={user.id} 
        initialPendingCount={initialPendingCount || 0} 
        initialUnpaidBillsCount={initialUnpaidBillsCount || 0}
      />
      <main className="flex-1 bg-muted/20">
        {children}
      </main>
    </div>
  )
}
