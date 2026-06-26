import { MerchantDebtsClient } from "./debts-client"
import { createClient } from "@/utils/supabase/server"

export default async function MerchantDebtsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <MerchantDebtsClient merchantId={user.id} />
}
