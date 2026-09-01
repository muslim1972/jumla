import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ProductExplorer } from "@/features/products/components/product-explorer"
import { PromoBanners } from "@/components/global/promo-banners"
import { DeliveryDashboard } from "@/features/delivery/components/delivery-dashboard"
import Link from "next/link"
import { ShoppingCart, Award, ArrowLeft } from "lucide-react"
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
          .select('role')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    // select('*') مثل الصفحات العاملة (المتجر ولوحة التاجر):
    // تحديد عمود غير موجود بالاسم يُسقط الاستعلام كله ويرجع null بصمت
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

  // توجيه المستخدمين إلى لوحات التحكم الخاصة بهم ومنعهم من رؤية واجهة المشتري
  if (userRole === "admin") {
    return redirect("/admin")
  }
  if (userRole === "support") {
    return redirect("/support")
  }
  if (userRole === "merchant") {
    return redirect("/dashboard")
  }

  const rawProducts = (productsResponse.data as any) || []
  // لا نبتلع الأخطاء بصمت بعد الآن — تظهر في سجلات Vercel للتشخيص
  if (productsResponse.error) {
    console.error("[الرئيسية] فشل جلب المنتجات:", productsResponse.error)
  }

  // merchant_id هو عمود التاجر الوحيد في جدول products
  // (تم التحقق: user_id غير موجود إطلاقاً — خطأ 42703 من قاعدة البيانات)
  const merchantIds = [...new Set(rawProducts.map((p: any) => p.merchant_id).filter(Boolean))]

  let products: any[] = []
  if (merchantIds.length > 0) {
    const { data: merchants, error: merchantsError } = await supabase
      .from('profiles')
      .select('id, full_name, delivery_fee, role')
      .in('id', merchantIds)
      .eq('role', 'merchant')

    if (merchantsError) {
      console.error("[الرئيسية] فشل جلب التجار:", merchantsError)
    }

    const merchantsMap = new Map((merchants || []).map((m) => [m.id, m]))
    products = rawProducts.filter((p: any) => merchantsMap.has(p.merchant_id))
      .map((p: any) => ({ ...p, profiles: merchantsMap.get(p.merchant_id) }))
  }

  // Fetch cart items for the user if logged in
  let cartItems: { id: string; product_id: string; quantity: number }[] = []
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
    <div className="flex-1 w-full mesh-gradient pb-32 sm:pb-44">


      <div className="container mx-auto px-3 sm:px-4">
        {userRole === "delivery" ? (
          <div className="pt-4">
            <DeliveryDashboard />
          </div>
        ) : (
          <>
            {/* Rewards Banner */}
            <div className="mb-6 pt-4">
              <Link href="/rewards" className="block w-full rounded-2xl bg-gradient-to-l from-brand-orange to-yellow-500 p-4 sm:p-5 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Award className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg sm:text-xl flex items-center gap-2">
                        مكافآت جملتي
                        <span className="text-[10px] sm:text-xs bg-white text-brand-orange px-2 py-0.5 rounded-full font-bold">جديد</span>
                      </h3>
                      <p className="text-white/90 text-xs sm:text-sm mt-0.5">اجمع النقاط واستبدلها بخصومات ورصيد مجاني!</p>
                    </div>
                  </div>
                  <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm hidden sm:block group-hover:-translate-x-1 transition-transform">
                    <ArrowLeft className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            </div>

            <ProductExplorer products={products} user={user} cartItems={cartItems} dbCategories={dbCategories} />
            
            {cartItems.length > 0 && (
              <div className="fixed bottom-32 sm:bottom-40 left-4 right-4 z-50 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
                <Link href="/cart" className="block">
                  <Button className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg rounded-xl flex items-center justify-center gap-3 border border-white/20">
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                    الذهاب إلى السلة ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
                  </Button>
                </Link>
              </div>
            )}
            


            <PromoBanners />
          </>
        )}
      </div>
    </div>
  )
}
