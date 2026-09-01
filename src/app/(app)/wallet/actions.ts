"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function getWalletData() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "يجب تسجيل الدخول أولاً" }
  }

  // Get Wallet
  let { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (walletError) {
    return { success: false, error: "حدث خطأ أثناء جلب بيانات المحفظة" }
  }

  // Auto-create wallet if it doesn't exist
  if (!wallet) {
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert([{ user_id: user.id, balance: 0 }])
      .select('*')
      .single()
      
    if (createError) {
      return { success: false, error: "لم نتمكن من إنشاء محفظة لك" }
    }
    wallet = newWallet
  }

  // Get Transactions
  const { data: transactions, error: transError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (transError) {
    return { success: false, error: "حدث خطأ أثناء جلب حركات المحفظة" }
  }

  return { 
    success: true, 
    wallet, 
    transactions: transactions || [] 
  }
}

export async function chargeWallet(amount: number, cardDetails: any) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "يجب تسجيل الدخول أولاً" }
  }

  if (amount < 25000) {
    return { success: false, error: "الحد الأدنى للشحن هو 25,000 دينار" }
  }

  // Simulate Card Validation (16 digits, Expiry, CVV)
  const { cardNumber, expiry, cvv } = cardDetails
  if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
    return { success: false, error: "رقم البطاقة غير صحيح" }
  }
  if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
    return { success: false, error: "تاريخ الانتهاء غير صحيح (يجب أن يكون MM/YY)" }
  }
  if (!cvv || cvv.length < 3) {
    return { success: false, error: "رمز التحقق (CVV) غير صحيح" }
  }

  // Ensure wallet exists + atomic top-up (balance update + transaction record in one DB transaction)
  const { data, error: rpcError } = await supabase.rpc('charge_wallet', {
    p_amount: amount,
    p_description: `شحن رصيد بواسطة ماستر كارد تنتهي بـ ${cardNumber.slice(-4)}`
  })

  if (rpcError) {
    if (rpcError.message.includes('MIN_AMOUNT')) {
      return { success: false, error: "الحد الأدنى للشحن هو 25,000 دينار" }
    }
    return { success: false, error: "حدث خطأ أثناء إضافة الرصيد إلى المحفظة" }
  }

  revalidatePath('/wallet')
  return { success: true, message: "تم شحن المحفظة بنجاح!", newBalance: data?.newBalance }
}
