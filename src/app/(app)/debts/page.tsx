import { BuyerDebtsClient } from "@/features/credit/components/buyer-debts-client"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export const revalidate = 0

export default async function BuyerDebtsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <BuyerDebtsClient userId={user.id} />
}
