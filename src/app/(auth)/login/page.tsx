import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { LoginClient } from "./login-client"

export default async function LoginPage(props: { searchParams: Promise<{ message: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approval_status')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && (profile?.approval_status === 'pending' || profile?.approval_status === 'rejected')) {
      return redirect("/awaiting-approval")
    }

    return redirect("/")
  }

  return <LoginClient message={searchParams?.message} />
}
