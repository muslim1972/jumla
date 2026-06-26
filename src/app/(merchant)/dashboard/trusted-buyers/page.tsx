import { TrustedBuyersClient } from "./trusted-buyers-client"
import { createClient } from "@/utils/supabase/server"

export default async function TrustedBuyersPage() {
  const supabase = await createClient()

  // We only fetch the user to pass the merchantId to the client
  // The actual fetching of users and searching will happen on the client
  // for better reactivity when searching
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <TrustedBuyersClient merchantId={user.id} />
}
