import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { StoreClient } from "./store-client"

export const revalidate = 0

export default async function StorePage({ params }: { params: { merchantId: string } }) {
  const supabase = await createClient()
  const { merchantId } = params

  const [userResponse, profileResponse, productsResponse] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', merchantId)
      .eq('role', 'merchant')
      .single(),
    supabase
      .from('products')
      .select('*')
      .eq('user_id', merchantId)
      .order('created_at', { ascending: false })
  ])

  if (profileResponse.error || !profileResponse.data) {
    notFound()
  }

  const merchantProfile = profileResponse.data
  const products = productsResponse.data || []
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
    <div className="min-h-screen bg-muted/10 pb-32">
      <StoreClient 
        merchant={merchantProfile} 
        products={products} 
        user={user} 
        cartItems={cartItems} 
        userRole={userRole} 
      />
    </div>
  )
}
