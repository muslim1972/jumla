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

  // Ensure wallet exists
  let { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', user.id)
    .single()

  if (!wallet) {
    const { data: newWallet } = await supabase
      .from('wallets')
      .insert([{ user_id: user.id, balance: 0 }])
      .select('id, balance')
      .single()
    wallet = newWallet
  }

  if (!wallet) {
     return { success: false, error: "لم نتمكن من العثور على محفظتك" }
  }

  // Process top-up (simulated transaction)
  // In a real app, this would be an RPC function to avoid race conditions.
  // For simulation, we update the balance directly and insert a transaction.
  
  const newBalance = parseFloat(wallet.balance) + amount;

  const { error: updateError } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', wallet.id)

  if (updateError) {
    return { success: false, error: "حدث خطأ أثناء إضافة الرصيد إلى المحفظة" }
  }

  // Record the transaction
  const referenceId = `MC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  await supabase
    .from('wallet_transactions')
    .insert([{
      wallet_id: wallet.id,
      amount: amount,
      type: 'deposit_mastercard',
      status: 'completed',
      reference_id: referenceId,
      description: `شحن رصيد بواسطة ماستر كارد تنتهي بـ ${cardNumber.slice(-4)}`
    }])

  revalidatePath('/wallet')
  return { success: true, message: "تم شحن المحفظة بنجاح!" }
}
