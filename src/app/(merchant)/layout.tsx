import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { MerchantTabs } from "@/features/merchant/components/merchant-tabs"
import Link from "next/link"
import { Award, ArrowLeft } from "lucide-react"

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

  const [pendingOrdersResponse, unpaidBillsResponse] = await Promise.all([
    // جلب عدد الطلبات قيد الانتظار الأولية (والتي تشمل قيد الانتظار والمسلمة بانتظار استلام المبلغ)
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', user.id)
      .in('status', ['pending', 'delivered']),
    // جلب عدد فواتير التطبيق غير المسددة
    supabase
      .from('merchant_billings')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', user.id)
      .neq('status', 'paid'),
  ])

  const { count: initialPendingCount } = pendingOrdersResponse
  const { count: initialUnpaidBillsCount } = unpaidBillsResponse

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-16 pb-2 border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Rewards Banner */}
          <Link href="/rewards" className="block w-full rounded-2xl bg-gradient-to-r from-brand-blue to-cyan-600 p-3 sm:p-4 text-white shadow-md relative overflow-hidden group mb-4">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-10 -mt-10 group-hover:scale-125 transition-transform duration-700"></div>
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
                  <Award className="w-6 h-6 text-yellow-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    برنامج مكافآت جملتي
                    <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-bounce">جديد</span>
                  </h3>
                  <p className="text-white/80 text-xs mt-0.5">ارتقِ بمستواك واحصل على إعلانات وتخفيضات!</p>
                </div>
              </div>
              <div className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-all sm:group-hover:-translate-x-1">
                <ArrowLeft className="w-4 h-4" />
              </div>
            </div>
          </Link>
          
          <MerchantTabs 
            merchantId={user.id} 
            initialPendingCount={initialPendingCount || 0} 
            initialUnpaidBillsCount={initialUnpaidBillsCount || 0}
          />
        </div>
      </div>
      <main className="flex-1 bg-muted/20 pt-4">
        {children}
      </main>
    </div>
  )
}
