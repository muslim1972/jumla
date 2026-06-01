import { Navbar } from "@/components/navbar"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { MerchantTabs } from "@/components/merchant-tabs"

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'merchant') {
    redirect("/")
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar userRole={profile?.role} fullName={profile?.full_name} />
      <MerchantTabs />
      <main className="flex-1 bg-muted/20">
        {children}
      </main>
    </div>
  )
}
