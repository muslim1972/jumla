"use server"

import { createClient } from "@/utils/supabase/server"
import { supabaseAdmin } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"
import { sendNotificationToUser, sendNotificationToRole } from "@/utils/onesignal"

// 1. جلب الطلبات الواردة (pending) و (approved) و (delivered) للتاجر
export async function getMerchantOrders() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      store_name,
      address,
      phone,
      total_rounded,
      subtotal,
      delivery_fee,
      invoice_number,
      verification_code,
      status,
      cancel_requested,
      pending_edits,
      created_at,
      delivery_worker_name,
      is_credit,
      amount_paid,
      items:order_items(
        id,
        product_name,
        product_price,
        quantity,
        unit_type
      )
    `)
    .eq("merchant_id", user.id)
    .in("status", ["pending", "approved", "delivered"])
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { orders }
}

// 2. الموافقة على الطلب وتجهيزه
export async function approveOrder(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  // جلب تفاصيل الطلب لمعرفة المشتري ورقم الفاتورة
  const { data: order } = await supabase
    .from("orders")
    .select("user_id, invoice_number, pending_edits")
    .eq("id", orderId)
    .single()

  // منع التجهيز وجود تعديلات مقترحة بانتظار موافقة المشتري
  if (order?.pending_edits) {
    return { error: "لا يمكن التجهيز قبل موافقة المشتري على التعديلات المقترحة أو رفضها." }
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "approved" })
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .eq("status", "pending") // للتأكد من أنه قيد الانتظار فقط

  if (error) {
    return { error: error.message }
  }

  if (order) {
    // إرسال إشعار للمشتري
    await sendNotificationToUser(
      order.user_id,
      "تم تجهيز طلبك!",
      `تم تجهيز فاتورتك رقم #${order.invoice_number} من قبل التاجر وهي بانتظار المندوب.`
    )
    
    // إرسال إشعار للمناديب (لإعلامهم بوجود طلب جاهز للتوصيل)
    await sendNotificationToRole(
      "delivery",
      "طلب جديد جاهز للتوصيل!",
      `هناك طلب جديد برقم #${order.invoice_number} بانتظار التوصيل.`
    )

    // كتابة الإشعار في جرس المشتري
    await supabaseAdmin.from("notifications").insert({
      user_id: order.user_id,
      title: "تم تجهيز طلبك!",
      message: `تم تجهيز فاتورتك رقم #${order.invoice_number} من قبل التاجر وهي بانتظار المندوب.`,
    })
  }

  revalidatePath("/dashboard/orders")
  return { success: true }
}

// 3. رفض الطلب
export async function rejectOrder(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  // جلب تفاصيل الطلب لمعرفة المشتري
  const { data: order } = await supabase
    .from("orders")
    .select("user_id, invoice_number")
    .eq("id", orderId)
    .single()

  const { error } = await supabase
    .from("orders")
    .update({ status: "rejected" })
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .eq("status", "pending") // للتأكد من أنه قيد الانتظار فقط

  if (error) {
    return { error: error.message }
  }

  if (order) {
    // إرسال إشعار للمشتري
    await sendNotificationToUser(
      order.user_id,
      "نعتذر، تم رفض طلبك",
      `تم رفض فاتورتك رقم #${order.invoice_number} من قبل التاجر.`
    )

    // كتابة الإشعار في جرس المشتري
    await supabaseAdmin.from("notifications").insert({
      user_id: order.user_id,
      title: "نعتذر، تم رفض طلبك",
      message: `تم رفض فاتورتك رقم #${order.invoice_number} من قبل التاجر.`,
    })
  }

  revalidatePath("/dashboard/orders")
  return { success: true }
}

// 4. استلام المبلغ للطلب المُسلّم وإكماله
export async function receiveOrderAmount(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "completed" })
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .eq("status", "delivered")
    .select()

  if (error) {
    console.error("Update error:", error)
    return { error: error.message }
  }

  if (!data || data.length === 0) {
    // حاول معرفة ما إذا كان الطلب موجوداً أصلاً لتشخيص سبب الفشل (RLS أو Enum)
    const { data: existing } = await supabase.from("orders").select("id, status, merchant_id").eq("id", orderId).single()
    if (!existing) return { error: "الطلب غير موجود في قاعدة البيانات." }
    if (existing.merchant_id !== user.id) return { error: "ليس لديك صلاحية على هذا الطلب." }
    if (existing.status !== "delivered") return { error: `حالة الطلب الحالية هي ${existing.status} وليست delivered.` }
    
    return { error: "فشل التحديث. الرجاء التأكد من أن حقل status في قاعدة البيانات (Supabase) يقبل القيمة 'completed' (ربما يحتاج لتعديل Enum)." }
  }

  revalidatePath("/dashboard/orders")
  return { success: true }
}

// 5. موافقة التاجر على الحذف (يحذف الطلب من قاعدة البيانات نهائياً)
export async function approveOrderDeletion(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  // نحذف الطلب مباشرة من قاعدة البيانات
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .eq("cancel_requested", true) // تأكيد أن المشتري طلب الحذف

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard/orders")
  return { success: true }
}

// 6. اقتراح تعديلات على كميات القائمة وإعلام المشتري بها
// يخزن التعديلات في pending_edits ولا تُطبق فعلياً إلا بعد موافقة المشتري
export async function proposeOrderEdits(orderId: string, edits: { item_id: string, new_quantity: number }[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "يجب تسجيل الدخول" }
  }

  // جلب الطلب والتأكد من ملكيته وحالته
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, invoice_number, status, pending_edits")
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .single()

  if (orderError || !order) {
    return { error: "لم يتم العثور على الطلب" }
  }
  if (order.status !== "pending") {
    return { error: "لا يمكن تعديل قائمة تم تجهيزها أو تسليمها" }
  }

  // يجب أن تبقى مادة واحدة متوفرة على الأقل — لعدم التوفر الكامل يُستخدم زر الرفض
  const positiveEdits = edits.filter(e => e.new_quantity > 0)
  if (positiveEdits.length === 0) {
    return { error: "جميع المواد غير متوفرة — استخدم زر «رفض» لإلغاء القائمة بالكامل" }
  }

  // جلب عناصر الطلب لبناء لقطة التعديلات
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_name, product_price, quantity, unit_type")
    .eq("order_id", orderId)

  if (itemsError || !items || items.length === 0) {
    return { error: "تعذر جلب عناصر القائمة" }
  }

  const snapshotItems = edits
    .filter(e => items.some(it => it.id === e.item_id))
    .map(e => {
      const item = items.find(it => it.id === e.item_id)!
      return {
        item_id: item.id,
        product_name: item.product_name,
        product_price: item.product_price,
        unit_type: item.unit_type,
        old_quantity: item.quantity,
        new_quantity: Math.max(0, Math.floor(e.new_quantity)),
      }
    })

  // يجب ألا تكون الكميات المقترحة مطابقة للأصل كلها (لا تعديل حقيقي)
  if (snapshotItems.every(s => s.new_quantity === s.old_quantity)) {
    return { error: "لا يوجد أي تغيير فعلي على الكميات" }
  }

  const pendingEdits = {
    proposed_at: new Date().toISOString(),
    items: snapshotItems,
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ pending_edits: pendingEdits })
    .eq("id", orderId)
    .eq("merchant_id", user.id)
    .eq("status", "pending")

  if (updateError) {
    return { error: updateError.message }
  }

  // إشعار فوري للمشتري داخل التطبيق
  const changedList = snapshotItems
    .filter(s => s.new_quantity !== s.old_quantity)
    .map(s => `${s.product_name}: ${s.old_quantity} ← ${s.new_quantity > 0 ? s.new_quantity : "غير متوفر"}`)
    .join("، ")

  await supabase.from("notifications").insert({
    user_id: order.user_id,
    title: "تم تعديل قائمة مشترياتك",
    message: `عدّل التاجر كميات القائمة رقم #${order.invoice_number}: ${changedList}. افتح «تتبع مشترياتي» لمراجعة القائمة المعدلة والموافقة عليها أو إلغاء الشراء.`,
  })

  // إشعار فوري (Push) للمشتري
  await sendNotificationToUser(
    order.user_id,
    "تم تعديل قائمة مشترياتك",
    `عدّل التاجر كميات القائمة رقم #${order.invoice_number}. افتح «تتبع مشترياتي» للموافقة على التغيير أو إلغاء الشراء.`
  )

  revalidatePath("/dashboard/orders")
  return { success: true, pending_edits: pendingEdits }
}

