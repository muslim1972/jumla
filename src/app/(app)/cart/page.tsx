import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { CartClient } from "./cart-client"

export const revalidate = 0

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ openOrder?: string | string[]; openInvoice?: string | string[]; openOrders?: string | string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  if (!user) {
    redirect("/login?message=" + encodeURIComponent("يجب تسجيل الدخول للوصول إلى السلة"))
  }

  const openOrderId = typeof params.openOrder === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.openOrder)
    ? params.openOrder
    : undefined
  const openInvoiceNumber = typeof params.openInvoice === "string" && /^\d+$/.test(params.openInvoice)
    ? Number(params.openInvoice)
    : undefined
  const shouldOpenOrders = Boolean(openOrderId || openInvoiceNumber !== undefined || params.openOrders === "1")

  const [profileResponse, cartResponse, notificationsResponse, trustedResponse] = await Promise.all([
    // Fetch buyer profile for checkout info & role check
    supabase
      .from('profiles')
      .select('store_name, address, phone, role')
      .eq('id', user.id)
      .single(),
    // Fetch cart items
    supabase
      .from('cart_items')
      .select(`
        *,
        products (
          *,
          profiles (delivery_fee, full_name, support_phone, free_delivery_threshold)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // Fetch unread notifications count
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    // Use service role to bypass RLS for trusted_buyers since buyer might not have SELECT permission
    import("@/utils/supabase/admin").then(({ supabaseAdmin }) =>
      supabaseAdmin
        .from('trusted_buyers')
        .select('merchant_id')
        .eq('buyer_id', user.id)
    ),
  ])

  const { data: profile } = profileResponse

  const userRole = profile?.role || "guest"
  
  // منع الحسابات الإدارية والتجار وعمال التوصيل من دخول السلة
  if (userRole === "admin") return redirect("/admin")
  if (userRole === "support" || userRole === "call_center") return redirect("/support")
  if (userRole === "merchant") return redirect("/dashboard")
  if (userRole === "delivery") return redirect("/")

  const { data: cartItems, error } = cartResponse

  if (error) {
    console.error("Error fetching cart items:", error)
  }

  const { count: unreadCount } = notificationsResponse

  // Fetch trusted merchants for this buyer
  const { data: trustedData } = trustedResponse

  const trustedMerchantIds = trustedData?.map(t => t.merchant_id) || []

  return (
    <div className="container mx-auto px-2 sm:px-4 pt-0 pb-0">
      <CartClient 
        initialItems={cartItems || []} 
        buyerProfile={profile || {}} 
        userId={user.id} 
        initialUnreadNotificationsCount={unreadCount || 0}
        trustedMerchantIds={trustedMerchantIds}
        requestedOrderId={openOrderId}
        requestedInvoiceNumber={openInvoiceNumber}
        shouldOpenOrders={shouldOpenOrders}
      />
    </div>
  )
}
