"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getActorContext, hasPermission, type ActorContext } from "@/features/staff/lib/guard"
import { multiplierToBase } from "@/features/warehouse/lib/helpers"

// ============================================================================
// قوائم التجهيز: إصدار ← تعيين عامل تجهيز ← تأكيد الجمع (مع تثبيت المسؤولية)
// ← استلام المندوب. كل خطوة تثبّت الاسم والوقت في النظام.
// ============================================================================

function refresh() {
  revalidatePath("/dashboard/orders")
  revalidatePath("/dashboard/warehouses")
}

/** هل يملك الفاعل تصريح إدارة التجهيز؟ (التاجر أو موظف بصلاحية warehouse أو sales) */
function canManagePicking(ctx: ActorContext): boolean {
  return hasPermission(ctx, "warehouse") || hasPermission(ctx, "sales")
}

/** جلب المخزن الافتراضي للتاجر */
async function getDefaultWarehouseId(supabase: Awaited<ReturnType<typeof createClient>>, merchantId: string) {
  const { data } = await supabase
    .from("warehouses")
    .select("id")
    .eq("merchant_id", merchantId)
    .eq("is_default", true)
    .single()
  return data?.id ?? null
}

/**
 * إرسال الطلب إلى المخزن: يُنشئ/يعيد ضبط قائمة التجهيز ويحوّل حالة الطلب إلى «preparing».
 * يُستدعى من زر «إرسال للمخزن» أو تلقائياً من approveOrder عند تفعيل الوحدة.
 */
export async function sendOrderToWarehouse(orderId: string) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (!canManagePicking(ctx)) return { error: "لا تملك صلاحية إدارة التجهيز" }
  if (!ctx.warehouseEnabled) return { error: "وحدة المخازن غير مفعلة لهذا المتجر" }

  const warehouseId = await getDefaultWarehouseId(supabase, ctx.merchantId)
  if (!warehouseId) return { error: "لا يوجد مخزن رئيسي — فعّل وحدة المخازن أولاً" }

  // الطلب ملك التاجر الفاعل وقيد الانتظار وبدون تعديلات معلقة
  const { data: order } = await supabase
    .from("orders")
    .select("id, merchant_id, status, user_id, invoice_number, pending_edits")
    .eq("id", orderId)
    .single()
  if (!order || order.merchant_id !== ctx.merchantId) return { error: "الطلب غير موجود" }
  if (order.status !== "pending") return { error: "الطلب لم يعد قيد الانتظار" }
  if (order.pending_edits) return { error: "لا يمكن التجهيز قبل موافقة المشتري على التعديلات المقترحة." }

  // عناصر الطلب → بنود القائمة
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_id, product_name, quantity, unit_type")
    .eq("order_id", orderId)
  if (itemsError || !orderItems || orderItems.length === 0) return { error: "تعذر جلب عناصر القائمة" }

  // قائمة قائمة؟ أعِد ضبطها
  const { data: existingList } = await supabase
    .from("picking_lists")
    .select("id, status")
    .eq("order_id", orderId)
    .maybeSingle()

  const now = new Date().toISOString()

  let listId: string
  if (existingList) {
    const { error: resetError } = await supabase
      .from("picking_lists")
      .update({
        status: "issued",
        issued_by: ctx.userId,
        issued_by_name: ctx.fullName,
        issued_at: now,
        picker_id: null,
        picker_name: null,
        picked_at: null,
        handed_over_at: null,
        handed_over_by: null,
        handed_over_name: null,
      })
      .eq("id", existingList.id)
    if (resetError) return { error: resetError.message }
    listId = existingList.id

    const { error: delItemsError } = await supabase
      .from("picking_list_items").delete().eq("picking_list_id", listId)
    if (delItemsError) return { error: delItemsError.message }
  } else {
    const { data: list, error: listError } = await supabase
      .from("picking_lists")
      .insert({
        merchant_id: ctx.merchantId,
        order_id: orderId,
        warehouse_id: warehouseId,
        status: "issued",
        issued_by: ctx.userId,
        issued_by_name: ctx.fullName,
        issued_at: now,
      })
      .select("id")
      .single()
    if (listError || !list) return { error: listError?.message || "تعذر إنشاء القائمة" }
    listId = list.id
  }

  const { error: itemsInsertError } = await supabase.from("picking_list_items").insert(
    orderItems.map(it => ({
      picking_list_id: listId,
      order_item_id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      unit_type: it.unit_type,
      ordered_quantity: it.quantity,
      confirmed_quantity: it.quantity,
      shortage_quantity: 0,
    }))
  )
  if (itemsInsertError) return { error: itemsInsertError.message }

  // الطلب يصبح «قيد التجهيز» — لا يظهر للمندوب بعد الآن حتى اكتمال الجمع
  const { error: statusError } = await supabase
    .from("orders")
    .update({ status: "preparing" })
    .eq("id", orderId)
    .eq("status", "pending")
  if (statusError) return { error: statusError.message }

  // إعلام المشتري بأن طلبه قيد التجهيز فعلياً
  await supabase.from("notifications").insert({
    user_id: order.user_id,
    title: "طلبك قيد التجهيز",
    message: `بدأ تجهيز فاتورتك رقم #${order.invoice_number} في مخازن التاجر.`,
  })

  refresh()
  return { success: true, list_id: listId }
}

/** تعيين عامل التجهيز — يثبّت اسمه على القائمة وفي النظام للمساءلة */
export async function assignPicker(listId: string, pickerStaffId: string) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (!hasPermission(ctx, "warehouse")) return { error: "اعتماد القوائم لصاحب المتجر أو موظف المخازن" }

  const { data: picker } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, parent_merchant_id, permissions")
    .eq("id", pickerStaffId)
    .single()
  if (
    !picker ||
    picker.role !== "merchant_staff" ||
    !picker.is_active ||
    picker.parent_merchant_id !== ctx.merchantId ||
    !(picker.permissions as string[] | null)?.includes("picking")
  ) {
    return { error: "عامل التجهيز يجب أن يكون موظفاً نشطاً بصلاحية التجهيز" }
  }

  const { data: list } = await supabase
    .from("picking_lists")
    .select("id, status, merchant_id")
    .eq("id", listId)
    .single()
  if (!list || list.merchant_id !== ctx.merchantId) return { error: "القائمة غير موجودة" }
  if (list.status === "handed_over" || list.status === "cancelled") {
    return { error: "لا يمكن تعيين عامل لقائمة منتهية" }
  }

  const { error } = await supabase
    .from("picking_lists")
    .update({ picker_id: picker.id, picker_name: picker.full_name })
    .eq("id", listId)
  if (error) return { error: error.message }

  refresh()
  return { success: true }
}

export interface PickConfirmation {
  item_id: string           // معرّف picking_list_items
  confirmed_quantity: number
  shortage_reason?: string | null
}

/**
 * تأكيد الجمع: يثبّت الكميات المؤكدة والنقص وأسبابه، ويؤشر القائمة «جُمعت»،
 * ويعيد كميات النقص إلى المخزن (لم تُشحن فعلياً) بحركة موثقة تُحمّل مسؤوليتها
 * على عامل التجهيز المثبَّت اسمه.
 */
export async function confirmPicking(listId: string, confirmations: PickConfirmation[]) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }

  const { data: list } = await supabase
    .from("picking_lists")
    .select("id, status, merchant_id, picker_id, picker_name, order_id")
    .eq("id", listId)
    .single()
  if (!list || list.merchant_id !== ctx.merchantId) return { error: "القائمة غير موجودة" }
  if (list.status !== "issued") return { error: "القائمة ليست في مرحلة الجمع" }

  // من يجمع فعلياً؟ العامل المعيَّن بصلاحية picking — أو موظف المخازن/التاجر نيابةً عنه
  const isAssignedPicker = ctx.isStaff && ctx.userId === list.picker_id && hasPermission(ctx, "picking")
  const isWarehouseManager = !ctx.isStaff || hasPermission(ctx, "warehouse")
  if (!isAssignedPicker && !isWarehouseManager) {
    return { error: "الجمع محصور بعامل التجهيز المعيَّن أو موظف المخازن" }
  }

  const { data: listItems, error: itemsError } = await supabase
    .from("picking_list_items")
    .select("id, product_id, product_name, unit_type, ordered_quantity")
    .eq("picking_list_id", listId)
  if (itemsError || !listItems) return { error: "تعذر جلب بنود القائمة" }

  // الوحدات والمضاعفات لتحويل النقص إلى وحدة الأساس
  const productIds = [...new Set(listItems.map(i => i.product_id).filter(Boolean))] as string[]
  const { data: products } = await supabase
    .from("products")
    .select("id, units, unit_conversions")
    .in("id", productIds.length > 0 ? productIds : ["00000000-0000-0000-0000-000000000000"])
  const productMap = new Map((products || []).map(p => [p.id, p]))

  const shortageRestores: { productId: string, baseQty: number, itemRef: string }[] = []

  for (const li of listItems) {
    const conf = confirmations.find(c => c.item_id === li.id)
    const confirmed = conf ? Math.max(0, Math.min(li.ordered_quantity, Math.floor(conf.confirmed_quantity))) : li.ordered_quantity
    const shortage = li.ordered_quantity - confirmed

    const { error: upError } = await supabase
      .from("picking_list_items")
      .update({
        confirmed_quantity: confirmed,
        shortage_quantity: shortage,
        shortage_reason: shortage > 0 ? (conf?.shortage_reason?.trim() || "غير محدد") : null,
      })
      .eq("id", li.id)
    if (upError) return { error: upError.message }

    if (shortage > 0 && li.product_id) {
      const product = productMap.get(li.product_id)
      const conversions = product?.unit_conversions || []
      const baseQty = Math.round(shortage * multiplierToBase(li.unit_type, conversions))
      if (baseQty > 0) shortageRestores.push({ productId: li.product_id, baseQty, itemRef: li.id })
    }
  }

  const { error: pickError } = await supabase
    .from("picking_lists")
    .update({ status: "picked", picked_at: new Date().toISOString() })
    .eq("id", listId)
  if (pickError) return { error: pickError.message }

  // إرجاع النقص إلى بند المخزن الافتراضي بحركة موثقة
  for (const r of shortageRestores) {
    const { data: item } = await supabase
      .from("warehouse_items")
      .select("id")
      .eq("product_id", r.productId)
      .single() // عبر RLS يرى الفاعل بنود تاجرِه فقط
    if (item) {
      await supabase.rpc("warehouse_apply_movement", {
        p_item_id: item.id,
        p_kind: "shortage_return",
        p_quantity: r.baseQty,
        p_note: `إرجاع نقص قائمة التجهيز — المسؤول: ${list.picker_name || "غير معيَّن"}`,
        p_reference_type: "picking_list_items",
        p_reference_id: r.itemRef,
      })
    }
  }

  refresh()
  return { success: true, shortages: shortageRestores.length }
}

/** إلغاء القائمة وإعادة الطلب إلى «بانتظار الموافقة» (مثلاً لتغيير طريقة المعالجة) */
export async function cancelPickingList(listId: string) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (!canManagePicking(ctx)) return { error: "لا تملك صلاحية إدارة التجهيز" }

  const { data: list } = await supabase
    .from("picking_lists")
    .select("id, status, merchant_id, order_id")
    .eq("id", listId)
    .single()
  if (!list || list.merchant_id !== ctx.merchantId) return { error: "القائمة غير موجودة" }
  if (list.status === "handed_over") return { error: "لا يمكن إلغاء قائمة سُلّمت للمندوب" }

  const { error: cancelError } = await supabase
    .from("picking_lists")
    .update({ status: "cancelled" })
    .eq("id", listId)
  if (cancelError) return { error: cancelError.message }

  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "pending" })
    .eq("id", list.order_id)
    .eq("status", "preparing")
  if (orderError) return { error: orderError.message }

  refresh()
  return { success: true }
}

/** جلب قائمة التجهيز ببنودها لأمر بيع (للوحات التاجر والموظفين) */
export async function getPickingListByOrder(orderId: string) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }

  const { data: list } = await supabase
    .from("picking_lists")
    .select("*")
    .eq("order_id", orderId)
    .eq("merchant_id", ctx.merchantId)
    .maybeSingle()
  if (!list) return { list: null }

  const { data: items } = await supabase
    .from("picking_list_items")
    .select("*")
    .eq("picking_list_id", list.id)

  return { list: { ...list, items: items || [] } }
}

/**
 * تأكيد استلام المندوب للقائمة عند التحميل — يثبّت اسم المندوب ووقت الاستلام،
 * ومن هنا تُحمَّل مسؤولية أي نقص لاحق على عامل التجهيز المثبَّت اسمه.
 */
export async function confirmPickupByRep(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "غير مصرح" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "delivery") return { error: "هذا الإجراء للمندوبين فقط" }

  const { data: order } = await supabase
    .from("orders")
    .select("id, merchant_id, status, invoice_number")
    .eq("id", orderId)
    .single()
  if (!order) return { error: "الطلب غير موجود" }
  if (order.status !== "approved") return { error: "الطلب غير جاهز للاستلام بعد" }

  const { data: list } = await supabase
    .from("picking_lists")
    .select("id, status, picker_name")
    .eq("order_id", orderId)
    .single()
  if (!list) return { success: true } // متاجر بلا وحدة مخازن: لا قائمة ولا شيء مطلوب
  if (list.status !== "picked") return { error: "لم يكتمل جمع القائمة بعد" }

  const { error } = await supabase
    .from("picking_lists")
    .update({
      status: "handed_over",
      handed_over_at: new Date().toISOString(),
      handed_over_by: user.id,
      handed_over_name: profile.full_name || null,
    })
    .eq("id", list.id)
    .eq("status", "picked")
  if (error) return { error: error.message }

  // الطلب يصبح رسمياً «بانتظار المندوب» — ينتقل لسير التوصيل الاعتيادي (رمز المشتري وغيره)
  await supabase
    .from("orders")
    .update({ status: "approved" })
    .eq("id", orderId)
    .eq("status", "preparing")

  // إعلام التاجر باستلام المندوب للقائمة
  await supabase.from("notifications").insert({
    user_id: order.merchant_id,
    title: "المندوب استلم القائمة",
    message: `استلم المندوب قائمة تجهيز الفاتورة #${order.invoice_number} (عامل التجهيز: ${list.picker_name || "غير معيَّن"}).`,
  })

  revalidatePath("/")
  return { success: true }
}
