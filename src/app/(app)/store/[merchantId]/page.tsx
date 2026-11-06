import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { StoreClient } from "./store-client"
import { prioritizeSelectedProduct } from "./prioritize-selected-product"

export const revalidate = 0

export default async function StorePage({ params, searchParams }: {
  params: Promise<{ merchantId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const [{ merchantId }, query] = await Promise.all([params, searchParams])
  const selectedProductId = typeof query.product === "string" ? query.product : undefined

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
  const productInvoiceCountsPromise = supabase.rpc('get_merchant_product_invoice_counts', {
    p_merchant_id: merchantId,
  })

  // Wait for the first batch
  const [userResponse, profileResponse, productsResponse, productInvoiceCountsResponse] = await Promise.all([
    userPromise,
    merchantProfilePromise,
    merchantProductsPromise,
    productInvoiceCountsPromise,
  ])

  if (profileResponse.error || !profileResponse.data) {
    notFound()
  }

  const merchantProfile = profileResponse.data
  const invoiceCounts = new Map<string, number>(
    (productInvoiceCountsResponse.data || []).map((row: { product_id: string; invoice_count: number | string }) => [
      row.product_id,
      Number(row.invoice_count),
    ]),
  )
  const products = prioritizeSelectedProduct(productsResponse.data || [], selectedProductId, invoiceCounts)
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

  // Fetch average rating for the merchant
  let averageRating = 0;
  let ratingCount = 0;
  const { data: ratingsData } = await supabase
    .from('user_ratings')
    .select('rating')
    .eq('rated_id', merchantId)
    .eq('rated_role', 'merchant')

  if (ratingsData && ratingsData.length > 0) {
    const sum = ratingsData.reduce((acc, curr) => acc + curr.rating, 0);
    averageRating = sum / ratingsData.length;
    ratingCount = ratingsData.length;
  }

  // Fetch detailed reviews for the merchant
  let reviews: any[] = [];
  const { data: reviewsData } = await supabase
    .from('user_ratings')
    .select('id, rating, comment, created_at, rater_id')
    .eq('rated_id', merchantId)
    .eq('rated_role', 'merchant')
    .order('created_at', { ascending: false })

  if (reviewsData && reviewsData.length > 0) {
    const raterIds = Array.from(new Set(reviewsData.map(r => r.rater_id)));
    const { data: ratersProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, store_name')
      .in('id', raterIds);

    const raterMap = new Map((ratersProfiles || []).map(p => [p.id, p.store_name || p.full_name || 'صاحب ماركت']));

    reviews = reviewsData.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewerName: raterMap.get(r.rater_id) || 'صاحب ماركت'
    }));
  }

  // Check if current logged-in buyer has any completed order with this merchant to allow direct rating
  let userCompletedOrderId: string | null = null;
  if (user) {
    const { data: userOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('merchant_id', merchantId)
      .in('status', ['delivered', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userOrder) {
      userCompletedOrderId = userOrder.id;
    }
  }

  return (
    <div className="w-full bg-muted/10">
      <StoreClient 
        merchant={merchantProfile} 
        products={products} 
        user={user} 
        cartItems={cartItems} 
        userRole={userRole}
        salesRankingAvailable={!productInvoiceCountsResponse.error}
        averageRating={averageRating}
        ratingCount={ratingCount}
        reviews={reviews}
        userCompletedOrderId={userCompletedOrderId}
      />
    </div>
  )
}
