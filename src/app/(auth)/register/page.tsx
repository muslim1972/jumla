import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { RegisterClient } from "./register-client"

export default async function RegisterPage(props: { searchParams: Promise<{ message: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return redirect("/")
  }

  return <RegisterClient message={searchParams?.message} />
}
