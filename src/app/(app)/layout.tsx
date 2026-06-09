import { Navbar } from "@/components/navbar"
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

  const { data: { user } } = await supabase.auth.getUser()

  // جلب الملف الشخصي وعدد عناصر السلة بشكل متوازٍ لتجنب الـ Waterfalls
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

  // Fetch global settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  return (
    <div className="flex flex-col flex-1 w-full">
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
