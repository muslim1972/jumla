import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AdminClient } from "./admin-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect("/")
  }

  // Fetch all datasets concurrently on the server
  let profiles: any[] = []
  let productsCount = 0
  let buyersCount = 0
  let merchantsCount = 0
  let banners: any[] = []
  let topBanners: any[] = []
  let adRequests: any[] = []
  let totalPaidRevenue = 0
  let totalUnpaidRevenue = 0

  try {
    const [
      { data: profileList },
      { count: prodCount },
      { count: buyers },
      { count: merchants },
      { data: bannerList },
      { data: topBannerList },
      { data: adRequestList },
      { data: billingList }
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("products").select("*", { count: "exact", head: true }).limit(500),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "guest"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "merchant"),
      supabase.from("banners").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("top_banners").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("ad_requests").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("merchant_billings").select("amount_due, status").limit(500)
    ])

    if (profileList) profiles = profileList
    if (prodCount) productsCount = prodCount
    if (buyers) buyersCount = buyers
    if (merchants) merchantsCount = merchants
    if (bannerList) banners = bannerList
    if (topBannerList) topBanners = topBannerList
    if (adRequestList) adRequests = adRequestList

    if (billingList) {
      billingList.forEach((bill: any) => {
        if (bill.status === 'paid') {
          totalPaidRevenue += (bill.amount_due || 0)
        } else {
          totalUnpaidRevenue += (bill.amount_due || 0)
        }
      })
    }
  } catch (err) {
    console.error("Error fetching admin data on server:", err)
  }

  return (
    <AdminClient
      initialProfiles={profiles}
      initialProductsCount={productsCount}
      initialBuyersCount={buyersCount}
      initialMerchantsCount={merchantsCount}
      initialBanners={banners}
      initialTopBanners={topBanners}
      initialAdRequests={adRequests}
      initialPaidRevenue={totalPaidRevenue}
      initialUnpaidRevenue={totalUnpaidRevenue}
    />
  )
}
