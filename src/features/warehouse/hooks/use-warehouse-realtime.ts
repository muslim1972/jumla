"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

/**
 * تحديث لحظي لبيانات المخازن: أي تغيير على بنود المخازن أو حركاتها أو
 * قوائم التجهيز يعيد تحميل بيانات الصفحة (مجمّع: مرة كل ثانيتين كحد أقصى).
 */
export function useWarehouseRealtime(merchantId: string | undefined) {
  const router = useRouter()
  const lastRefresh = useRef(0)

  useEffect(() => {
    if (!merchantId) return
    const supabase = createClient()

    const scheduleRefresh = () => {
      const now = Date.now()
      if (now - lastRefresh.current < 2000) return
      lastRefresh.current = now
      router.refresh()
    }

    const channel = supabase
      .channel("warehouse_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "warehouse_items", filter: `merchant_id=eq.${merchantId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "warehouse_movements", filter: `merchant_id=eq.${merchantId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "picking_lists", filter: `merchant_id=eq.${merchantId}` }, scheduleRefresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [merchantId, router])
}
