import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?message=" + encodeURIComponent("يجب تسجيل الدخول للوصول إلى السلة"))
  }

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h1 className="text-3xl font-bold mb-4">سلة المشتريات</h1>
      <div className="p-8 bg-muted/30 rounded-xl border border-dashed max-w-2xl mx-auto">
        <p className="text-xl text-muted-foreground">السلة فارغة حالياً.</p>
        <p className="text-sm text-muted-foreground mt-2">ستظهر المنتجات التي تقوم بإضافتها هنا.</p>
      </div>
    </div>
  )
}
