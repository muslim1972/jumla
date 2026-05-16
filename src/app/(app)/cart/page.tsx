import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { CartClient } from "./cart-client"

export const revalidate = 0

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?message=" + encodeURIComponent("يجب تسجيل الدخول للوصول إلى السلة"))
  }

  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (
        *,
        profiles (delivery_fee, full_name)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching cart items:", error)
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold mb-8 text-right bg-clip-text text-transparent bg-gradient-to-l from-primary to-blue-600 w-fit">
        سلة المشتريات
      </h1>
      
      <CartClient initialItems={cartItems || []} />
    </div>
  )
}
