import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { MerchantTabs } from "@/features/merchant/components/merchant-tabs"
import Link from "next/link"
import { Award, ArrowLeft } from "lucide-react"
import { getCurrentUser } from "@/lib/app-context"
import { getActorContext } from "@/features/staff/lib/guard"
import { InstallAppButton } from "@/components/global/install-app-button"

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // سياق الفاعل: التاجر نفسه أو موظفه الداخلي — أي حساب آخر لا يدخل هنا
  const ctx = await getActorContext()
  if (!ctx || (ctx.role !== "merchant" && ctx.role !== "merchant_staff")) {
    redirect("/")
  }

  // الموظف بلا أي صلاحية: لا معنى لوجوده هنا
  if (ctx.role === "merchant_staff" && ctx.permissions.length === 0) {
    redirect("/no-permission")
  }

  const supabase = await createClient()

  const [pendingOrdersResponse, unpaidBillsResponse] = await Promise.all([
    // جلب عدد الطلبات قيد الانتظار الأولية (والتي تشمل قيد الانتظار والمسلمة بانتظار استلام المبلغ)
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', ctx.merchantId)
      .in('status', ['pending', 'delivered']),
    // جلب عدد فواتير التطبيق غير المسددة
    supabase
      .from('merchant_billings')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', ctx.merchantId)
      .neq('status', 'paid'),
  ])

  const { count: initialPendingCount } = pendingOrdersResponse
  const { count: initialUnpaidBillsCount } = unpaidBillsResponse

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-14 pb-1.5 border-b">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          {/* شريط الإجراءات العلوي للتاجر: زر التثبيت وبانر المكافآت الرشيق */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 mb-1.5">
            <InstallAppButton />
            {ctx.role === "merchant" && (
              <Link 
                href="/rewards" 
                className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-brand-blue via-cyan-700 to-brand-blue px-3 py-1.5 text-white shadow-2xs hover:opacity-95 transition-all text-xs flex-1 max-w-xl"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Award className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span className="font-black truncate">برنامج مكافآت جملتي:</span>
                  <span className="text-white/90 text-[11px] truncate hidden sm:inline">ارتقِ بمستواك واحصل على إعلانات وتخفيضات أسبوعية</span>
                  <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold shrink-0">جديد</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-300 shrink-0">
                  <span>تفاصيل</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
              </Link>
            )}
          </div>

          <MerchantTabs
            merchantId={ctx.merchantId}
            initialPendingCount={initialPendingCount || 0}
            initialUnpaidBillsCount={initialUnpaidBillsCount || 0}
            staffPermissions={
              ctx.role === "merchant_staff"
                ? { sales: ctx.permissions.includes("sales"), warehouse: ctx.permissions.includes("warehouse") || ctx.permissions.includes("picking") }
                : null
            }
          />
        </div>
      </div>
      <main className="flex-1 bg-muted/20 pt-1 sm:pt-2 pb-6">
        {children}
      </main>
    </div>
  )
}
