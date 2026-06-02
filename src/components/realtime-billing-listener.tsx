"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export function RealtimeBillingListener({ merchantId }: { merchantId: string }) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!merchantId) return

    const channel = supabase
      .channel('merchant_billings_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'merchant_billings',
        },
        () => {
          // Whenever the billing data changes (e.g. admin marks it as paid),
          // refresh the page to reflect the new state.
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [merchantId, router, supabase])

  return null // This component doesn't render anything, it just listens
}
