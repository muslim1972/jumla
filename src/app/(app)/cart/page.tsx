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

  // Fetch buyer profile for checkout info & role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('store_name, address, phone, role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || "guest"
  
  // منع الحسابات الإدارية والتجار وعمال التوصيل من دخول السلة
  if (userRole === "admin") return redirect("/admin")
  if (userRole === "support") return redirect("/support")
  if (userRole === "merchant") return redirect("/dashboard")
  if (userRole === "delivery") return redirect("/")

  // Fetch cart items
  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (
        *,
        profiles (delivery_fee, full_name, support_phone)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching cart items:", error)
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <CartClient initialItems={cartItems || []} buyerProfile={profile || {}} userId={user.id} />
    </div>
  )
}
