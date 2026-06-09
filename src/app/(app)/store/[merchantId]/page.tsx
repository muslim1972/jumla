import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { StoreClient } from "./store-client"

export const revalidate = 0

export default async function StorePage({ params }: { params: Promise<{ merchantId: string }> }) {
  const supabase = await createClient()
  const { merchantId } = await params

  // Start independent queries immediately
  const userPromise = supabase.auth.getUser()
  const merchantProfilePromise = supabase
    .from('profiles')
    .select('*')
    .eq('id', merchantId)
    .eq('role', 'merchant')
    .single()
  const merchantProductsPromise = supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })

  // Wait for the first batch
  const [userResponse, profileResponse, productsResponse] = await Promise.all([
    userPromise,
    merchantProfilePromise,
    merchantProductsPromise
  ])

  if (profileResponse.error || !profileResponse.data) {
    notFound()
  }

  const merchantProfile = profileResponse.data
  const products = productsResponse.data || []
  const user = userResponse.data.user

  let userRole = "guest"
  let cartItems: { id: string; product_id: string; quantity: number }[] = []

  // If user exists, fetch their dependent data in parallel!
  if (user) {
    const [profileRes, cartRes] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('cart_items').select('id, product_id, quantity, unit_type').eq('user_id', user.id)
    ])
    
    if (profileRes.data) userRole = profileRes.data.role
    if (cartRes.data) cartItems = cartRes.data
  }

  return (
    <div className="w-full bg-muted/10">
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
