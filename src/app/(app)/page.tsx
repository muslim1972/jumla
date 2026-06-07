import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ProductExplorer } from "@/components/product-explorer"
import { PromoBanners } from "@/components/promo-banners"
import { TopAnnouncementBar } from "@/components/top-announcement-bar"
import { DeliveryDashboard } from "@/components/delivery/delivery-dashboard"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"

export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()
  
  const [userResponse, productsResponse] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('products')
      .select(`
        *,
        profiles!inner(full_name, delivery_fee, role)
      `)
      .eq('profiles.role', 'merchant')
      .order('created_at', { ascending: false })
  ])

  const user = userResponse.data.user
  let userRole = "guest"

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile) {
      userRole = profile.role
    }
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

  const products = productsResponse.data
  const topBanners: any[] = [] // Fetch disabled until table is created

  // Fetch cart items for the user if logged in
  let cartItems: { id: string; product_id: string; quantity: number }[] = []
  if (user) {
    const { data: cartData } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity')
      .eq('user_id', user.id)
    if (cartData) {
      cartItems = cartData
    }
  }

  return (
    <div className="min-h-screen mesh-gradient pb-32 sm:pb-44">
      {/* استبدال البانر الترحيبي القديم باللوحة الإعلانية المدفوعة العليا ذات التصميم الإبداعي */}
      <TopAnnouncementBar initialBanners={topBanners} />

      <div className="container mx-auto px-3 sm:px-4">
        {userRole === "delivery" ? (
          <div className="pt-4">
            <DeliveryDashboard />
          </div>
        ) : (
          <>
            <ProductExplorer products={products} user={user} cartItems={cartItems} />
            
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
