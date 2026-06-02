import { createClient } from "@/utils/supabase/server"
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
  
  const [userResponse, productsResponse, topBannersResponse] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('products')
      .select(`
        *,
        profiles(full_name, delivery_fee)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('top_banners')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
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

  const products = productsResponse.data
  const topBanners = topBannersResponse.data || []

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
              <div className="sticky bottom-4 z-50 my-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <Link href="/cart" className="block">
                  <Button className="w-full h-14 sm:h-16 text-lg sm:text-xl font-black bg-brand-orange hover:bg-brand-orange/90 text-white shadow-[0_8px_30px_rgb(249,115,22,0.3)] rounded-2xl flex items-center justify-center gap-3 border-2 border-white/20">
                    <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" />
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
