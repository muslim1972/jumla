"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

function sanitizeCartError(error: any): string {
  if (!error) return "حدث خطأ غير متوقع أثناء إضافة المادة للسلة."
  const msg = typeof error === "string" ? error : (error.message || String(error))
  
  // حجب أي مخرجات HTML خام قادمة من تعثر شبكي لخوادم Cloudflare أو استيقاظ قاعدة البيانات
  if (
    msg.includes("<!DOCTYPE") || 
    msg.includes("<html") || 
    msg.includes("Cloudflare") ||
    msg.includes("502") || 
    msg.includes("520") || 
    msg.includes("524") ||
    msg.includes("Bad Gateway") ||
    msg.includes("Gateway Timeout")
  ) {
    return "تعذر الاتصال المؤقت بقاعدة البيانات (جاري الاستئناف التلقائي). يرجى الضغط مجدداً لإضافة المادة."
  }

  return msg || "حدث خطأ غير متوقع أثناء إضافة المادة للسلة."
}

export async function addToCart(productId: string, quantity: number = 1, unitType?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "يجب تسجيل الدخول لإضافة منتجات للسلة." }
  }

  // محاولة الإضافة مع إعادة المحاولة التلقائية عند أي انقطاع شبكي عابر
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      let query = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        
      if (unitType) {
        query = query.eq('unit_type', unitType)
      } else {
        query = query.is('unit_type', null)
      }

      const { data: existingItem, error: fetchError } = await query.maybeSingle()

      if (fetchError) throw fetchError

      if (existingItem) {
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: quantity,
            unit_type: unitType || null
          })

        if (insertError) throw insertError
      }

      revalidatePath('/cart')
      revalidatePath('/')
      return { success: true }
    } catch (error: any) {
      console.error(`[Cart Action] Attempt ${attempt} failed:`, error)
      if (attempt === 1) {
        // إعادة المحاولة فورياً لإنشاء اتصال جديد مع خادم البيانات
        continue
      }
      return { error: sanitizeCartError(error) }
    }
  }

  return { error: "تعذر إتمام العملية، يرجى إعادة المحاولة." }
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
