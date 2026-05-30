import { Navbar } from "@/components/navbar"
import { TopAnnouncementBar } from "@/components/top-announcement-bar"
import { createClient } from "@/utils/supabase/server"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  let role = null
  let fullName = null
  let cartCount = 0
  let topBanners: any[] = []

  // خطوة 1: جلب بيانات الجلسة وقائمة الإعلانات المدفوعة العليا بشكل متوازٍ لتجنب الـ Waterfalls
  const [userResponse, topBannersResponse] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('top_banners')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
  ])

  const user = userResponse.data?.user
  topBanners = topBannersResponse.data || []

  // خطوة 2: جلب الملف الشخصي وعدد عناصر السلة بشكل متوازٍ إذا كان المستخدم مسجلاً
  if (user) {
    const [profileResponse, cartCountResponse] = await Promise.all([
      supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single(),
      supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
    ])

    role = profileResponse.data?.role || null
    fullName = profileResponse.data?.full_name || null
    cartCount = cartCountResponse.count || 0
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopAnnouncementBar initialBanners={topBanners} />
      <Navbar userRole={role} fullName={fullName} cartCount={cartCount} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
