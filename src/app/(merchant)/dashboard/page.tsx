import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getActorContext, resolveStaffHome } from "@/features/staff/lib/guard"
import { MerchantSettings } from "@/features/merchant/components/merchant-settings"
import { AlertCircle, TrendingUp, PackageX, DollarSign, Target } from "lucide-react"
import { MerchantProductsList } from "@/features/merchant/components/merchant-products-list"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // موظفو المتجر لا يدخلون صفحة منتجات/إعدادات التاجر — يوجَّهون لصفحاتهم المصرح بها
  const actorCtx = await getActorContext()
  if (actorCtx?.role === "merchant_staff") {
    redirect(resolveStaffHome(actorCtx.permissions))
  }

  const [profileResponse, productsResponse, ordersResponse, categoriesResponse] = await Promise.all([
    supabase
      .from('profiles')
      .select('delivery_fee, support_phone')
      .eq('id', user?.id)
      .single(),
    supabase
      .from('products')
      .select('*, categories(name)')
      .eq('merchant_id', user?.id)
      .order('created_at', { ascending: false }),
    // Fetch orders for analytics
    supabase
      .from('orders')
      .select('total_rounded, created_at, status')
      .eq('merchant_id', user?.id)
      .in('status', ['delivered', 'completed']),
    supabase.from('categories').select('id, name'),
  ])

  const { data: profile } = profileResponse
  const { data: products } = productsResponse
  const { data: orders } = ordersResponse

  // Analytics calculation
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  
  const todaySales = orders?.filter(o => o.created_at >= startOfDay).reduce((sum, o) => sum + o.total_rounded, 0) || 0
  const totalSales = orders?.reduce((sum, o) => sum + o.total_rounded, 0) || 0

  // Low Stock Calculation
  const lowStockProducts = products?.filter(p => {
    if (!p.min_stock_alert || p.min_stock_alert <= 0) return false;
    let stockMultiplier = 1;
    if (p.units) {
      const su = (p.units as { type: string; multiplier_to_base: number }[]).find(u => u.type === (p.stock_unit || "كارتون"));
      if (su && su.multiplier_to_base) {
        stockMultiplier = su.multiplier_to_base;
      }
    }
    const currentQty = Math.floor((p.stock_quantity || 0) / stockMultiplier);
    return currentQty <= p.min_stock_alert;
  }) || [];

  // Fetch categories safely in case the table doesn't exist yet
  let categories: {id: string, name: string}[] = []
  const { data: categoriesData, error: catError } = categoriesResponse
  if (!catError && categoriesData) {
    const uniqueCategories = [];
    const seenNames = new Set();
    for (const cat of categoriesData) {
      if (!seenNames.has(cat.name)) {
        seenNames.add(cat.name);
        uniqueCategories.push(cat);
      }
    }
    categories = uniqueCategories;
  }

  const isProfileComplete = profile?.delivery_fee !== null && profile?.delivery_fee !== undefined && profile?.support_phone;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2.5 max-w-6xl space-y-2 sm:space-y-2.5">
      <section className="space-y-1">
        <MerchantSettings
          initialDeliveryFee={profile?.delivery_fee}
          initialSupportPhone={profile?.support_phone}
        />
        {!isProfileComplete && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-xl flex gap-2 items-start text-destructive text-xs">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="font-medium">يجب تحديد أجور التوصيل ورقم الدعم أولاً لتتمكن من إضافة المنتجات.</p>
          </div>
        )}
      </section>

      <div className="space-y-2.5 sm:space-y-3">
          
          {/* Analytics Section - High Density Sleek Financial Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">مبيعات اليوم:</span>
              </div>
              <div className="font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0" dir="ltr">
                {todaySales.toLocaleString('en-US')} <span className="text-[10px] font-bold">د.ع</span>
              </div>
            </div>

            <div className="bg-brand-blue/10 border border-brand-blue/25 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="p-1 rounded-md bg-brand-blue/20 text-brand-blue shrink-0">
                  <Target className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">إجمالي المبيعات:</span>
              </div>
              <div className="font-black text-xs sm:text-sm text-brand-blue dark:text-brand-blue/90 tabular-nums shrink-0" dir="ltr">
                {totalSales.toLocaleString('en-US')} <span className="text-[10px] font-bold">د.ع</span>
              </div>
            </div>
          </div>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-3">
                <h3 className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-2">
                  <PackageX className="w-5 h-5" />
                  تنبيه نفاد المخزون ({lowStockProducts.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="bg-background/80 px-3 py-2 rounded-md border border-rose-500/10 flex justify-between items-center text-sm">
                      <span className="font-semibold truncate">{p.name}</span>
                      <span className="text-rose-600 font-bold shrink-0 bg-rose-500/10 px-2 py-0.5 rounded">
                        متبقي: {Math.floor((p.stock_quantity || 0) / ((p.units as { type: string; multiplier_to_base: number }[] | null)?.find(u => u.type === (p.stock_unit || 'كارتون'))?.multiplier_to_base || 1))} {p.stock_unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Products List */}
          <MerchantProductsList products={products || []} categories={categories} />
      </div>
    </div>
  )
}
