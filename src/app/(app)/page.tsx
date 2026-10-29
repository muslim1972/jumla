import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ProductExplorer } from "@/features/products/components/product-explorer"
import { DeliveryDashboard } from "@/features/delivery/components/delivery-dashboard"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"

export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  let userRole = "guest"

  const [profileResponse, productsResponse, cartResponse, categoriesResponse] = await Promise.all([
    user
      ? supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    // select('*') مثل الصفحات العاملة (المتجر ولوحة التاجر)
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    user
      ? supabase
          .from('cart_items')
          .select('id, product_id, quantity, unit_type')
          .eq('user_id', user.id)
      : Promise.resolve({ data: null, error: null }),
    supabase.from('categories').select('id, name, icon_url')
  ])

  const profile = profileResponse.data
  if (profile) {
    userRole = profile.role
  }

  // توجيه المستخدمين إلى لوحات التحكم الخاصة بهم ومنعهم من رؤية واجهة المتجر
  if (userRole === "admin") {
    return redirect("/admin")
  }
  if (userRole === "support" || userRole === "call_center") {
    return redirect("/support")
  }
  if (userRole === "merchant") {
    return redirect("/dashboard")
  }
  if (userRole === "materials") {
    return redirect("/materials")
  }
  if (userRole === "merchant_staff") {
    return redirect("/dashboard")
  }

  const rawProducts = (productsResponse.data as any) || []
  if (productsResponse.error) {
    console.error("[الرئيسية] فشل جلب المنتجات:", productsResponse.error)
  }

  const merchantIds = [...new Set(rawProducts.map((p: any) => p.merchant_id).filter(Boolean))]

  let products: any[] = []
  if (merchantIds.length > 0) {
    const { data: merchants, error: merchantsError } = await supabase
      .from('profiles')
      .select('id, full_name, delivery_fee, role')
      .in('id', merchantIds)
      .eq('role', 'merchant')

    if (merchantsError) {
      console.error("[الرئيسية] فشل جلب التجار المجهّزين:", merchantsError)
    }

    const merchantsMap = new Map((merchants || []).map((m) => [m.id, m]))
    products = rawProducts.filter((p: any) => merchantsMap.has(p.merchant_id))
      .map((p: any) => ({ ...p, profiles: merchantsMap.get(p.merchant_id) }))
  }

  // Fetch cart items for the user if logged in
  let cartItems: { id: string; product_id: string; quantity: number; unit_type?: string }[] = []
  if (cartResponse.data) {
    cartItems = cartResponse.data
  }

  // Fetch categories safely in case the table doesn't exist yet
  let dbCategories: {id: string, name: string, icon_url: string | null}[] = []
  const { data: categoriesData, error: catError } = categoriesResponse
  if (!catError && categoriesData) {
    dbCategories = categoriesData
  }

  return (
    <div className="flex-1 w-full bg-slate-50/50 pb-28 sm:pb-36">
      <div className="w-full">
        {userRole === "delivery" ? (
          <div className="container mx-auto px-3 sm:px-4 pt-4">
            <DeliveryDashboard />
          </div>
        ) : (
          <>
            <ProductExplorer 
              products={products} 
              user={user} 
              profile={profile}
              cartItems={cartItems} 
              dbCategories={dbCategories} 
            />
            
            {cartItems.length > 0 && (
              <div className="fixed bottom-6 left-4 right-4 z-50 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-6 duration-300">
                <Link href="/cart" className="block shadow-2xl rounded-2xl overflow-hidden group">
                  <div className="bg-[#0c1c2e] hover:bg-[#13273e] text-white p-3.5 sm:p-4 rounded-2xl flex items-center justify-between border-2 border-[#d97706]/40 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#d97706] text-white flex items-center justify-center font-bold">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-300 font-bold">سلة مشتريات الجملة</div>
                        <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                          <span>{cartItems.reduce((acc, item) => acc + item.quantity, 0)} وحدات جملة</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">توصيل 0 د.ع</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-[#d97706] group-hover:bg-[#b45309] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-colors">
                      <span>إتمام الطلب</span>
                      <span>←</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
