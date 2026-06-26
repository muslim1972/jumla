"use server"

import { createClient } from "@/utils/supabase/server"

export async function getMerchantDebts(merchantId: string) {
  const supabase = await createClient()

  // Get all credit orders for this merchant where amount_paid < total_rounded
  // We'll consider orders in any non-cancelled status, but mostly delivered/completed ones.
  // Actually, debts apply when the order is "approved" and later. 
  // Let's just fetch all where is_credit = true and amount_paid < total_rounded.
  // But wait, the debt should only exist if the order wasn't cancelled or rejected.
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      invoice_number,
      total_rounded,
      amount_paid,
      created_at,
      status,
      user_id,
      store_name,
      phone,
      profiles!user_id(full_name)
    `)
    .eq("merchant_id", merchantId)
    .eq("is_credit", true)
    .in("status", ["approved", "delivered", "completed"])

  if (error) {
    return { error: error.message }
  }

  // Filter orders where debt > 0
  const debtOrders = orders?.filter((o: any) => o.amount_paid < o.total_rounded) || []

  // Group by buyer
  const buyersMap = new Map<string, any>()

  debtOrders.forEach((o: any) => {
    const debtAmount = o.total_rounded - o.amount_paid
    if (!buyersMap.has(o.user_id)) {
      buyersMap.set(o.user_id, {
        buyerId: o.user_id,
        buyerName: o.profiles?.full_name || o.store_name,
        storeName: o.store_name,
        phone: o.phone,
        totalDebt: 0,
        ordersCount: 0,
        orders: []
      })
    }
    const buyer = buyersMap.get(o.user_id)
    buyer.totalDebt += debtAmount
    buyer.ordersCount += 1
    buyer.orders.push({
      id: o.id,
      invoiceNumber: o.invoice_number,
      total: o.total_rounded,
      paid: o.amount_paid,
      debt: debtAmount,
      date: o.created_at,
      status: o.status
    })
  })

  return { buyers: Array.from(buyersMap.values()) }
}

export async function payDebt(orderId: string, paymentAmount: number) {
  const supabase = await createClient()

  // Fetch current order to ensure we don't overpay
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("total_rounded, amount_paid")
    .eq("id", orderId)
    .single()

  if (fetchError) return { error: fetchError.message }

  const newPaidAmount = order.amount_paid + paymentAmount

  if (newPaidAmount > order.total_rounded) {
    return { error: "المبلغ المدفوع يتجاوز قيمة الدين المتبقي" }
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ amount_paid: newPaidAmount })
    .eq("id", orderId)

  if (updateError) return { error: updateError.message }

  return { success: true }
}
