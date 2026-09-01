import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import Image from "next/image"
import { MerchantSettings } from "@/features/merchant/components/merchant-settings"
import { AlertCircle, TrendingUp, PackageX, DollarSign, Target, Award, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { AddProductForm } from "@/features/merchant/components/add-product-form"
import { MerchantProductsList } from "@/features/merchant/components/merchant-products-list"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
      const su = p.units.find((u: any) => u.type === (p.stock_unit || "كارتون"));
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Add Product Form */}
        <div className="w-full md:w-1/3">
          <MerchantSettings 
            initialDeliveryFee={profile?.delivery_fee} 
            initialSupportPhone={profile?.support_phone} 
          />

          {!isProfileComplete && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2 items-start text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm font-medium">يجب تحديد أجور التوصيل ورقم الدعم أولاً لتتمكن من إضافة المنتجات.</p>
            </div>
          )}

          <AddProductForm disabled={!isProfileComplete} categories={categories} />
        </div>

        {/* Dashboard Content */}
        <div className="w-full md:w-2/3 space-y-8">
          
          {/* Analytics Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand-orange" />
              نظرة عامة
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-full text-emerald-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">مبيعات اليوم</p>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                      {todaySales.toLocaleString('en-US')} <span className="text-sm font-bold">د.ع</span>
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 border-brand-blue/20">
                <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                  <div className="bg-brand-blue/20 p-3 rounded-full text-brand-blue">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي المبيعات</p>
                    <h3 className="text-xl sm:text-2xl font-black text-brand-blue dark:text-brand-blue/80">
                      {totalSales.toLocaleString('en-US')} <span className="text-sm font-bold">د.ع</span>
                    </h3>
                  </div>
                </CardContent>
              </Card>
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
                        متبقي: {Math.floor((p.stock_quantity || 0) / (p.units?.find((u:any) => u.type === (p.stock_unit || 'كارتون'))?.multiplier_to_base || 1))} {p.stock_unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Products List */}
          <MerchantProductsList products={products || []} categories={categories} />
        </div>
      </div>
    </div>
  )
}
