"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function addToCart(productId: string, quantity: number = 1) {
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
      // Increment or set quantity (depending on how we use it, if it's already there we'll just add the new quantity)
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)

      if (updateError) throw updateError
    } else {
      // Insert new item
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity: quantity
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
    // 1. تحديث بيانات المشتري
    await supabase.from('profiles').update({
      store_name: data.storeName,
      address: data.address,
      phone: data.phone
    }).eq('id', user.id);

    // 2. جلب هاتف الدعم الخاص بالتاجر
    const { data: merchantProfile } = await supabase
      .from('profiles')
      .select('support_phone')
      .eq('id', data.merchantId)
      .single();

    // Check if there is an 'editing' order for this merchant
    const { data: editingOrder } = await supabase
      .from('orders')
      .select('id, invoice_number, created_at')
      .eq('user_id', user.id)
      .eq('merchant_id', data.merchantId)
      .eq('status', 'editing')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let orderId = "";
    let invoiceNumber = null;

    if (editingOrder) {
      // Update existing editing order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          verification_code: data.verificationCode,
          store_name: data.storeName,
          address: data.address,
          phone: data.phone,
          subtotal: data.subtotal,
          delivery_fee: data.deliveryFee,
          total_rounded: data.totalRounded,
          status: 'pending',
          support_phone: merchantProfile?.support_phone
        })
        .eq('id', editingOrder.id);

      if (updateError) throw updateError;
      
      orderId = editingOrder.id;
      invoiceNumber = editingOrder.invoice_number;

      // Delete old order items
      await supabase.from('order_items').delete().eq('order_id', orderId);

    } else {
      // 3. جلب رقم الفاتورة التسلسلي الجديد
      const { data: nextInvoiceNumber, error: rpcError } = await supabase
        .rpc('get_next_invoice_number', { p_merchant_id: data.merchantId });
      
      if (rpcError) throw rpcError;
      invoiceNumber = nextInvoiceNumber;

      // 4. إنشاء الطلب الجديد
      const { data: newOrder, error: orderError } = await supabase
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
          status: 'pending',
          support_phone: merchantProfile?.support_phone,
          invoice_number: invoiceNumber
        })
        .select('id')
        .single();

      if (orderError) throw orderError;
      orderId = newOrder.id;
    }

    // 5. إضافة عناصر الطلب
    const orderItems = data.items.map(item => ({
      order_id: orderId,
      product_id: item.productId,
      product_name: item.productName,
      product_price: item.productPrice,
      quantity: item.quantity,
      unit_type: item.unitType
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
    return { success: true, orderId: orderId }
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
      .neq('status', 'cancelled')
      .neq('status', 'editing')
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

/**
 * إلغاء وتعديل طلب
 * يغير حالة الطلب إلى ملغي (أو معدل)، يعيد العناصر إلى السلة، ويرسل إشعاراً للتاجر.
 */
export async function editOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "يجب تسجيل الدخول" }

  try {
    // 1. جلب تفاصيل الطلب مع العناصر
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) throw new Error("لم يتم العثور على الطلب")
    
    if (order.status !== 'pending') {
      throw new Error("لا يمكن تعديل طلب تمت الموافقة عليه أو تم توصيله")
    }

    // 2. تغيير حالة الطلب
    // إلغاء أي طلبات قيد التعديل مسبقاً لنفس التاجر
    await supabase.from('orders')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('merchant_id', order.merchant_id)
      .eq('status', 'editing');

    // جعل هذا الطلب قيد التعديل ليحتفظ برقمه
    await supabase.from('orders')
      .update({ status: 'editing' })
      .eq('id', orderId);

    // 3. إعادة العناصر إلى السلة
    const cartItemsToInsert = order.order_items.map((item: any) => ({
      user_id: user.id,
      product_id: item.product_id,
      quantity: item.quantity
    }))

    // نحذف المنتجات من السلة إذا كانت موجودة مسبقاً لكي لا تتكرر
    const productIds = cartItemsToInsert.map((i: any) => i.product_id)
    await supabase.from('cart_items').delete().eq('user_id', user.id).in('product_id', productIds)

    const { error: insertError } = await supabase.from('cart_items').insert(cartItemsToInsert)
    if (insertError) throw insertError

    // 4. إرسال إشعار للتاجر
    // جلب اسم المشتري (نأخذ اسم المتجر الخاص بالطلب أو اسم المشتري)
    const { data: buyerProfile } = await supabase.from('profiles').select('full_name, store_name').eq('id', user.id).single()
    const buyerName = buyerProfile?.store_name || buyerProfile?.full_name || "مشتري"
    
    const orderDate = new Date(order.created_at).toLocaleDateString("ar-IQ", { year: 'numeric', month: 'short', day: 'numeric' })
    const message = `قام المشتري (${buyerName}) بإلغاء/تعديل القائمة رقم #${order.invoice_number} المؤرخة في ${orderDate}. ستصله قائمة جديدة إذا أتم التعديل.`

    await supabase.from('notifications').insert({
      user_id: order.merchant_id,
      title: "تعديل طلب",
      message: message
    })

    revalidatePath('/cart')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error("Edit order error:", error)
    return { error: error.message || "حدث خطأ أثناء تعديل الطلب" }
  }
}
