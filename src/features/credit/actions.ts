"use server"

import { createClient } from "@/utils/supabase/server"
import { supabaseAdmin } from "@/utils/supabase/admin"

// --- Trusted Buyers Actions ---

export async function getTrustedBuyers(merchantId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== merchantId) {
    return { error: "غير مصرح" }
  }

  // Removed dynamic import of supabase admin

  // First, get the trusted buyers' IDs
  const { data: trusted, error: trustedError } = await supabaseAdmin
    .from("trusted_buyers")
    .select("buyer_id")
    .eq("merchant_id", merchantId)

  if (trustedError) return { error: trustedError.message }

  const buyerIds = trusted?.map(t => t.buyer_id) || []

  if (buyerIds.length === 0) return { buyers: [] }

  // Then get their profiles
  const { data: buyers, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, store_name, phone")
    .in("id", buyerIds)

  if (profilesError) return { error: profilesError.message }

  return { buyers: buyers || [] }
}

export async function searchBuyers(merchantId: string, query: string) {
  const supabase = await createClient()

  if (!query || query.trim().length < 2) return { buyers: [] }

  // التحقق أن الباحث تاجر فعلاً
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== merchantId) return { error: "غير مصرح" }

  // البحث عن المشترين بالاسم، اسم المتجر، أو الهاتف
  // ملاحظة: سياسة profiles_select تمنع التاجر من قراءة بروفايلات المشترين
  // عبر جلسته — لذا القراءة هنا عبر supabaseAdmin (نمط getTrustedBuyers)
  const { data: buyers, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, store_name, phone")
    .eq("role", "guest")
    .or(`full_name.ilike.%${query}%,store_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10)

  if (error) return { error: error.message }

  return { buyers: buyers || [] }
}

export async function addTrustedBuyer(merchantId: string, buyerId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== merchantId) {
    return { error: "غير مصرح لك بإضافة مشترين لهذا التاجر" }
  }

  // Removed dynamic import of supabase admin

  const { error } = await supabaseAdmin
    .from("trusted_buyers")
    .insert({ merchant_id: merchantId, buyer_id: buyerId })

  if (error) {
    if (error.code === '23505') { // Unique violation
      return { error: "هذا المشتري موجود مسبقاً في القائمة" }
    }
    return { error: error.message }
  }

  return { success: true }
}

export async function removeTrustedBuyer(merchantId: string, buyerId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== merchantId) {
    return { error: "غير مصرح" }
  }

  // Removed dynamic import of supabase admin

  const { error } = await supabaseAdmin
    .from("trusted_buyers")
    .delete()
    .eq("merchant_id", merchantId)
    .eq("buyer_id", buyerId)

  if (error) return { error: error.message }

  return { success: true }
}

// --- Debts Actions ---

export async function getMerchantDebts(merchantId: string) {
  const supabase = await createClient()

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

  const debtOrders = orders?.filter((o: any) => o.amount_paid < o.total_rounded) || []
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

export async function getBuyerDebts(userId: string) {
  const supabase = await createClient()

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

  const debtOrders = orders?.filter((o: any) => o.amount_paid < o.total_rounded) || []
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

export async function payDebt(orderId: string, paymentAmount: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "يجب تسجيل الدخول أولاً" }

  if (!paymentAmount || paymentAmount <= 0) {
    return { error: "مبلغ الدفعة غير صالح" }
  }

  // عملية ذرّية داخل قاعدة البيانات (قفل صف الطلب + التحقق من عدم تجاوز الإجمالي)
  const { data, error: rpcError } = await supabase.rpc('pay_order_debt', {
    p_order_id: orderId,
    p_payment_amount: paymentAmount
  })

  if (rpcError) {
    if (rpcError.message.includes('ORDER_NOT_FOUND')) return { error: "الطلب غير موجود" }
    if (rpcError.message.includes('NOT_AUTHORIZED')) return { error: "غير مصرح" }
    if (rpcError.message.includes('OVERPAYMENT')) return { error: "المبلغ المدفوع يتجاوز قيمة الدين المتبقي" }
    if (rpcError.message.includes('ALREADY_SETTLED')) return { error: "تم سداد هذا الدين بالكامل مسبقاً" }
    if (rpcError.message.includes('ORDER_NOT_PAYABLE')) return { error: "لا يمكن السداد في الحالة الحالية للطلب" }
    return { error: "حدث خطأ أثناء تسجيل الدفعة" }
  }

  return { success: true, amountPaid: data?.amountPaid }
}
