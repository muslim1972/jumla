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

  const addProduct = async (formData: FormData) => {
    "use server"
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const price = parseFloat(formData.get("price") as string)
    const unit_type = formData.get("unit_type") as string
    const image = formData.get("image") as File

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Check if delivery fee and support phone are set
    const { data: profile } = await supabase
      .from('profiles')
      .select('delivery_fee, support_phone')
      .eq('id', user.id)
      .single()

    if (profile?.delivery_fee === null || profile?.delivery_fee === undefined || !profile?.support_phone) {
      return
    }

    let image_url = null
// ...

    // Upload image if provided
    if (image && image.size > 0) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('products')
        .upload(filePath, image)

      if (!uploadError && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)
        
        image_url = publicUrl
      }
    }

    await supabase.from('products').insert({
      merchant_id: user.id,
      name,
      description,
      price,
      unit_type,
      image_url,
    })

    revalidatePath("/dashboard")
    revalidatePath("/")
  }

  const deleteProduct = async (formData: FormData) => {
    "use server"
    const id = formData.get("id") as string
    const supabase = await createClient()
    await supabase.from('products').delete().eq('id', id)
    revalidatePath("/dashboard")
    revalidatePath("/")
  }

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

          <Card className={!isProfileComplete ? "opacity-50 pointer-events-none" : "sticky top-24"}>
            <CardHeader>
              <CardTitle>إضافة منتج جديد</CardTitle>
              <CardDescription>قم بإضافة منتجاتك للبيع بالجملة</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addProduct} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم المادة</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">وصف المادة</Label>
                  <Input id="description" name="description" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">السعر (د.ع)</Label>
                  <Input id="price" name="price" type="number" required dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_type">نوع وحدة البيع</Label>
                  <Select name="unit_type" defaultValue="كارتون" required>
                    <SelectTrigger id="unit_type" dir="rtl">
                      <SelectValue placeholder="اختر الوحدة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="كارتون">كارتون</SelectItem>
                      <SelectItem value="درزن">درزن</SelectItem>
                      <SelectItem value="مفرد">مفرد</SelectItem>
                      <SelectItem value="كيلو">كيلو</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">صورة المنتج (اختياري)</Label>
                  <Input id="image" name="image" type="file" accept="image/*" />
                </div>
                <Button type="submit" className="w-full mt-4">نشر المنتج</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <div className="w-full md:w-2/3">
          <h2 className="text-2xl font-bold mb-6">منتجاتي ({products?.length || 0})</h2>
          
          {!products || products.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
              <p className="text-muted-foreground">لم تقم بإضافة أي منتجات بعد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden flex flex-col">
                  {product.image_url && (
                    <div className="h-40 relative bg-muted">
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description || "لا يوجد وصف"}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-bold text-primary">{product.price} د.ع</span>
                      <span className="text-xs bg-secondary px-2 py-1 rounded-md">{product.unit_type}</span>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0">
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={product.id} />
                      <Button type="submit" variant="destructive" size="sm" className="w-full">
                        حذف المنتج
                      </Button>
                    </form>
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
