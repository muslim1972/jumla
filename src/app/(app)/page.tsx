import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AddToCartButton } from "@/components/add-to-cart-button"
import Image from "next/image"

export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      profiles(full_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
          تسوق بالجملة والمفرد
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          أفضل المنتجات بأسعار تنافسية من التجار مباشرة إليك
        </p>
      </div>

      {!products || products.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
          <p className="text-muted-foreground text-lg">لا توجد منتجات معروضة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
              <div className="aspect-square relative bg-muted overflow-hidden">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-secondary/20">
                    <span className="text-muted-foreground">لا توجد صورة</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                  {product.unit_type}
                </div>
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2 h-10">
                  {product.description || "لا يوجد وصف للمنتج"}
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xl font-bold text-primary">
                    {product.price} <span className="text-sm text-muted-foreground font-normal">د.ع</span>
                  </span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                    التاجر: {product.profiles?.full_name || 'غير معروف'}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <AddToCartButton user={user} productId={product.id} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
