import { createClient } from "@/utils/supabase/server"
import { ProductExplorer } from "@/components/product-explorer"
import { PromoBanners } from "@/components/promo-banners"
import { TopAnnouncementBar } from "@/components/top-announcement-bar"
import { DeliveryDashboard } from "@/components/delivery/delivery-dashboard"

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
            <PromoBanners />
          </>
        )}
      </div>
    </div>
  )
}
