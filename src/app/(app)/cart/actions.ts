"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function addToCart(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "يجب تسجيل الدخول لإضافة منتجات للسلة" }
  }

  try {
    // Check if item already exists in cart using maybeSingle
    const { data: existingItem, error: fetchError } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (existingItem) {
      // Increment quantity
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + 1 })
        .eq('id', existingItem.id)

      if (updateError) throw updateError
    } else {
      // Insert new item
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1
        })

      if (insertError) throw insertError
    }

    revalidatePath('/cart')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error("Cart action error:", error)
    return { error: error.message || "حدث خطأ غير متوقع" }
  }
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

/**
 * إنشاء طلب جديد لتاجر معين
 * - ينشئ سجل في جدول orders
 * - ينقل العناصر من cart_items إلى order_items
 * - يحذف عناصر السلة الخاصة بهذا التاجر
 */
export async function createOrder(data: {
  merchantId: string
  verificationCode: string
  storeName: string
  address: string
  phone: string
  subtotal: number
  deliveryFee: number
  totalRounded: number
  items: {
    cartItemId: string
    productId: string
    productName: string
    productPrice: number
    quantity: number
    unitType: string
  }[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  try {
    // 1. إنشاء الطلب
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        merchant_id: data.merchantId,
        verification_code: data.verificationCode,
        store_name: data.storeName,
        address: data.address,
        phone: data.phone,
        subtotal: data.subtotal,
        delivery_fee: data.deliveryFee,
        total_rounded: data.totalRounded,
        status: 'pending'
      })
      .select('id')
      .single()

    if (orderError) throw orderError

    // 2. إنشاء عناصر الطلب
    const orderItems = data.items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      product_price: item.productPrice,
      quantity: item.quantity,
      unit_type: item.unitType,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // 3. حذف عناصر السلة التي تم طلبها
    const cartItemIds = data.items.map(item => item.cartItemId)
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .in('id', cartItemIds)

    if (deleteError) throw deleteError

    revalidatePath('/cart')
    revalidatePath('/')
    return { success: true, orderId: order.id }
  } catch (error: any) {
    console.error("Create order error:", error)
    return { error: error.message || "حدث خطأ في إنشاء الطلب" }
  }
}

/**
 * جلب طلبات المستخدم الحالي مع تفاصيل العناصر
 */
export async function getMyOrders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "يجب تسجيل الدخول", orders: [] }
  }

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // جلب أسماء التجار
    const merchantIds = [...new Set((orders || []).map(o => o.merchant_id))]
    let merchantNames: Record<string, string> = {}

    if (merchantIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', merchantIds)

      if (profiles) {
        merchantNames = Object.fromEntries(
          profiles.map(p => [p.id, p.full_name])
        )
      }
    }

    const enrichedOrders = (orders || []).map(order => ({
      ...order,
      merchant_name: merchantNames[order.merchant_id] || 'تاجر',
      items: order.order_items || [],
    }))

    return { orders: enrichedOrders }
  } catch (error: any) {
    console.error("Get orders error:", error)
    return { error: error.message, orders: [] }
  }
}
