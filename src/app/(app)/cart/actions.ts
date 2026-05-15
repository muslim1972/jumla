"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function addToCart(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("يجب تسجيل الدخول لإضافة منتجات للسلة")
  }

  // Check if item already exists in cart
  const { data: existingItem } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single()

  if (existingItem) {
    // Increment quantity
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existingItem.quantity + 1 })
      .eq('id', existingItem.id)

    if (error) throw error
  } else {
    // Insert new item
    const { error } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        product_id: productId,
        quantity: 1
      })

    if (error) throw error
  }

  revalidatePath('/cart')
  revalidatePath('/')
  return { success: true }
}

export async function removeFromCart(itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error

  revalidatePath('/cart')
  return { success: true }
}

export async function updateQuantity(itemId: string, quantity: number) {
  if (quantity < 1) return removeFromCart(itemId)

  const supabase = await createClient()
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', itemId)

  if (error) throw error

  revalidatePath('/cart')
  return { success: true }
}
