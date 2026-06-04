import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import Image from "next/image"
import { MerchantSettings } from "@/components/merchant-settings"
import { AlertCircle } from "lucide-react"
import { AddProductForm } from "@/components/merchant/add-product-form"
import { EditProductModal } from "@/components/merchant/edit-product-modal"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('delivery_fee, support_phone')
    .eq('id', user?.id)
    .single()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', user?.id)
    .order('created_at', { ascending: false })

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

          <AddProductForm disabled={!isProfileComplete} />
        </div>

        {/* Products List */}
        <div className="w-full md:w-2/3">
          <h2 className="text-2xl font-bold mb-6">منتجاتي ({products?.length || 0})</h2>
          
          {!products || products.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
              <p className="text-muted-foreground">لم تقم بإضافة أي منتجات بعد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden flex flex-col rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  {product.image_url && (
                    <div className="h-28 relative bg-muted">
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm font-bold line-clamp-1">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 flex-1">
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                      {product.description || "لا يوجد وصف"}
                    </p>
                    <div className="mt-3 space-y-1">
                      {product.units && product.units.length > 0 ? (
                        product.units.map((unit: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs border-b border-border/50 pb-1 last:border-0 last:pb-0">
                            <span className="font-bold text-brand-blue" dir="ltr">{unit.price.toLocaleString()}</span>
                            <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">{unit.type}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-brand-blue" dir="ltr">{product.price?.toLocaleString()}</span>
                          <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">{product.unit_type}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <div className="p-3 pt-0 mt-auto">
                    <EditProductModal product={product} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
