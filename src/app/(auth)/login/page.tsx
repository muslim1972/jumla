import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { LoginClient } from "./login-client"

export default async function LoginPage(props: { searchParams: Promise<{ message: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return redirect("/")
  }

  return <LoginClient message={searchParams?.message} />
}
