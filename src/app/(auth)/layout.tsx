import { Navbar } from "@/components/navbar"
import { createClient } from "@/utils/supabase/server"

export default async function AuthLayout({
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

  return (
    <div className="flex flex-col flex-1 w-full">
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
