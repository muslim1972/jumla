import { createClient } from "@/utils/supabase/server"
import { AddToCartButton } from "@/components/add-to-cart-button"
import Image from "next/image"
import { PackageOpen } from "lucide-react"
import { ProductExplorer } from "@/components/product-explorer"
import { PromoBanners } from "@/components/promo-banners"

export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()
  
  // Parallel fetching as per Vercel Best Practices
  const [userResponse, productsResponse] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('products')
      .select(`
        *,
        profiles(full_name, delivery_fee)
      `)
      .order('created_at', { ascending: false })
  ])

  const user = userResponse.data.user
  const products = productsResponse.data

  return (
    <div className="min-h-screen mesh-gradient pb-20">
      {/* Hero Section - Even more compact */}
      <div className="relative overflow-hidden pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-3 leading-tight">
              تسوق <span className="text-gradient">بالجملة</span> <br className="sm:hidden" /> والمفرد
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 leading-relaxed max-w-xl mx-auto">
              أفضل المنتجات بأسعار تنافسية من التجار مباشرة إليك.
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-48 h-48 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-blue-500 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4">
        <ProductExplorer products={products} user={user} />
        <PromoBanners />
      </div>
    </div>
  )
}
