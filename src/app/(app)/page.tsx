import { createClient } from "@/utils/supabase/server"
import { AddToCartButton } from "@/components/add-to-cart-button"
import Image from "next/image"
import { PackageOpen } from "lucide-react"
import { ProductExplorer } from "@/components/product-explorer"
import { PromoBanners } from "@/components/promo-banners"
import { TopAnnouncementBar } from "@/components/top-announcement-bar"

export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()
  
  // جلب الجلسة والمنتجات والإعلانات العليا بالتوازي لمنع الـ Waterfall
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
  const products = productsResponse.data
  const topBanners = topBannersResponse.data || []

  return (
    <div className="min-h-screen mesh-gradient pb-32 sm:pb-44">
      {/* استبدال البانر الترحيبي القديم باللوحة الإعلانية المدفوعة العليا ذات التصميم الإبداعي */}
      <TopAnnouncementBar initialBanners={topBanners} />

      <div className="container mx-auto px-3 sm:px-4">
        <ProductExplorer products={products} user={user} />
        <PromoBanners />
      </div>
    </div>
  )
}
