"use server"

import { createClient } from "@/utils/supabase/server"

export async function getBuyerDebts(userId: string) {
  const supabase = await createClient()

  // Get all credit orders for this buyer where amount_paid < total_rounded
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      invoice_number,
      total_rounded,
      amount_paid,
      created_at,
      status,
      merchant_id,
      profiles!merchant_id(full_name, phone)
    `)
    .eq("user_id", userId)
    .eq("is_credit", true)
    .in("status", ["approved", "delivered", "completed"])

  if (error) {
    return { error: error.message }
  }

  // Filter orders where debt > 0
  const debtOrders = orders?.filter((o: any) => o.amount_paid < o.total_rounded) || []

  // Group by merchant
  const merchantsMap = new Map<string, any>()

  debtOrders.forEach((o: any) => {
    const debtAmount = o.total_rounded - o.amount_paid
    if (!merchantsMap.has(o.merchant_id)) {
      merchantsMap.set(o.merchant_id, {
        merchantId: o.merchant_id,
        merchantName: o.profiles?.full_name || "تاجر غير معروف",
        phone: o.profiles?.phone,
        totalDebt: 0,
        ordersCount: 0,
        orders: []
      })
    }
    const merchant = merchantsMap.get(o.merchant_id)
    merchant.totalDebt += debtAmount
    merchant.ordersCount += 1
    merchant.orders.push({
      id: o.id,
      invoiceNumber: o.invoice_number,
      total: o.total_rounded,
      paid: o.amount_paid,
      debt: debtAmount,
      date: o.created_at,
      status: o.status
    })
  })

  return { merchants: Array.from(merchantsMap.values()) }
}
