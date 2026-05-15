import { Navbar } from "@/components/navbar"
import { createClient } from "@/utils/supabase/server"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  let role = null
  let fullName = null
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()
    role = profile?.role
    fullName = profile?.full_name
  }

  let cartCount = 0
  if (user) {
    const { count } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    cartCount = count || 0
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar userRole={role} fullName={fullName} cartCount={cartCount} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
