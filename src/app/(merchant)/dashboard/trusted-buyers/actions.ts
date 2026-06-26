"use server"

import { createClient } from "@/utils/supabase/server"

export async function getTrustedBuyers(merchantId: string) {
  const supabase = await createClient()

  // First, get the trusted buyers' IDs
  const { data: trusted, error: trustedError } = await supabase
    .from("trusted_buyers")
    .select("buyer_id")
    .eq("merchant_id", merchantId)

  if (trustedError) return { error: trustedError.message }

  const buyerIds = trusted?.map(t => t.buyer_id) || []

  if (buyerIds.length === 0) return { buyers: [] }

  // Then get their profiles
  const { data: buyers, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, store_name, phone")
    .in("id", buyerIds)

  if (profilesError) return { error: profilesError.message }

  return { buyers: buyers || [] }
}

export async function searchBuyers(merchantId: string, query: string) {
  const supabase = await createClient()

  if (!query || query.trim().length < 2) return { buyers: [] }

  // Search for buyers by name, store name, or phone
  const { data: buyers, error } = await supabase
    .from("profiles")
    .select("id, full_name, store_name, phone")
    .eq("role", "buyer")
    .or(`full_name.ilike.%${query}%,store_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10)

  if (error) return { error: error.message }

  return { buyers: buyers || [] }
}

export async function addTrustedBuyer(merchantId: string, buyerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
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

  const { error } = await supabase
    .from("trusted_buyers")
    .delete()
    .eq("merchant_id", merchantId)
    .eq("buyer_id", buyerId)

  if (error) return { error: error.message }

  return { success: true }
}
