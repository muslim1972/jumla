import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AddToCartButton } from "@/components/add-to-cart-button"
import Image from "next/image"
import { PackageOpen } from "lucide-react"

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
        profiles(full_name)
      `)
      .order('created_at', { ascending: false })
  ])

  const user = userResponse.data.user
  const products = productsResponse.data

  return (
    <div className="min-h-screen mesh-gradient pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-12 sm:pt-24 sm:pb-20">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-6 leading-tight">
              تسوق <span className="text-gradient">بالجملة</span> <br className="sm:hidden" /> والمفرد
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
              أفضل المنتجات بأسعار تنافسية من التجار مباشرة إليك. تجربة تسوق سهلة، سريعة، وموثوقة.
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4">
        {!products || products.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl border-dashed border-2">
            <PackageOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground text-lg">لا توجد منتجات معروضة حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="overflow-hidden border-none shadow-premium hover:shadow-premium-hover transition-all duration-500 group bg-card/80 backdrop-blur-sm flex flex-col h-full rounded-2xl"
              >
                {/* Image Container */}
                <div className="aspect-[4/5] relative bg-muted overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-secondary/20">
                      <PackageOpen className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Glass Badge */}
                  <div className="absolute top-2 right-2 glass px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm z-10">
                    {product.unit_type}
                  </div>
                </div>

                <CardHeader className="p-3 sm:p-4 pb-1 space-y-1">
                  <CardTitle className="text-sm sm:text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </CardTitle>
                  <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                    التاجر: {product.profiles?.full_name || 'غير معروف'}
                  </p>
                </CardHeader>

                <CardContent className="p-3 sm:p-4 pt-0 flex-grow">
                  <div className="flex flex-col mt-1">
                    <span className="text-base sm:text-xl font-black text-primary">
                      {Number(product.price).toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">د.ع</span>
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-3 sm:p-4 pt-0">
                  <AddToCartButton 
                    user={user} 
                    productId={product.id} 
                    variant="compact"
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
