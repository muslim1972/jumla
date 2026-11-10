"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getActorContext, hasPermission, type ActorContext } from "@/features/staff/lib/guard"
import type { AssignedPickingSummary } from "@/features/warehouse/lib/types"

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
    message: `بدأ تجهيز فاتورتك رقم #${order.invoice_number} في مخازن التاجر.\n[order_id:${order.id}]`,
  })

  refresh()
  return { success: true, list_id: listId }
}

/** تعيين عامل التجهيز — يثبّت اسمه على القائمة وفي النظام للمساءلة */
export async function assignPicker(listId: string, pickerStaffId: string) {
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (!hasPermission(ctx, "warehouse")) return { error: "اعتماد القوائم لصاحب المتجر أو موظف المخازن" }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("assign_picking_worker", {
    p_list_id: listId,
    p_picker_staff_id: pickerStaffId,
  })
  if (error) return { error: error.message }

  if (
    typeof data !== "object" ||
    data === null ||
    !("order_id" in data) ||
    typeof data.order_id !== "string" ||
    !("invoice_number" in data) ||
    (data.invoice_number !== null && typeof data.invoice_number !== "number")
  ) {
    return { error: "تم تحديث التعيين، لكن تعذر التحقق من بيانات إشعار العامل." }
  }

  const invoiceNumber = data.invoice_number == null
    ? "—"
    : String(data.invoice_number).padStart(5, "0")
  const { error: notificationError } = await supabase.from("notifications").insert({
    user_id: pickerStaffId,
    title: "تم تعيينك لجمع قائمة تجهيز",
    message: `تم تعيينك لجمع القائمة رقم #${invoiceNumber}. افتح الإشعار لمراجعة المواد وتأكيد الجمع.\n[order_id:${data.order_id}]`,
  })

  refresh()
  if (notificationError) {
    console.error("Picker assignment notification error:", notificationError.message)
    return {
      success: true,
      warning: "تم تعيين العامل، لكن تعذر تسجيل إشعاره داخل التطبيق. أعد محاولة الإشعار أو أبلغه مباشرة.",
    }
  }
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

  const { data, error } = await supabase.rpc("confirm_picking_atomic", {
    p_list_id: listId,
    p_confirmations: confirmations,
  })
  if (error) return { error: error.message }
  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    data.success !== true ||
    !("shortages" in data) ||
    typeof data.shortages !== "number"
  ) {
    return { error: "تعذر التحقق من نتيجة تأكيد الجمع" }
  }

  refresh()
  return { success: true, shortages: data.shortages }
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

export async function getAssignedPickingLists() {
  const ctx = await getActorContext()
  if (!ctx) return { error: "غير مصرح" }
  if (!ctx.isStaff || !hasPermission(ctx, "picking")) {
    return { error: "هذه الصفحة مخصصة لموظف التجهيز" }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_assigned_picking_lists")
  if (error) return { error: error.message }
  if (!Array.isArray(data) || !data.every(isAssignedPickingSummary)) {
    return { error: "تعذر قراءة قوائم التجهيز المعيّنة بصيغة صحيحة" }
  }

  return { lists: data }
}

function isAssignedPickingSummary(value: unknown): value is AssignedPickingSummary {
  if (typeof value !== "object" || value === null) return false
  if (!("order_id" in value) || typeof value.order_id !== "string") return false
  if (
    !("invoice_number" in value) ||
    (value.invoice_number !== null && typeof value.invoice_number !== "number")
  ) return false
  if (!("store_name" in value) || (value.store_name !== null && typeof value.store_name !== "string")) {
    return false
  }
  if (!("issued_at" in value) || (value.issued_at !== null && typeof value.issued_at !== "string")) {
    return false
  }
  return "status" in value && (value.status === "issued" || value.status === "picked")
}

/**
 * تأكيد استلام المندوب للقائمة عند التحميل — يثبّت اسم المندوب ووقت الاستلام،
 * ومن هنا تُحمَّل مسؤولية أي نقص لاحق على عامل التجهيز المثبَّت اسمه.
 */
export async function confirmPickupByRep(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "غير مصرح" }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profileError) return { error: profileError.message }
  if (profile?.role !== "delivery") return { error: "هذا الإجراء للمندوبين فقط" }

  const { data, error } = await supabase.rpc("confirm_picking_handover", {
    p_order_id: orderId,
  })
  if (error) return { error: error.message }
  if (
    typeof data !== "object" ||
    data === null ||
    !("has_picking_list" in data) ||
    typeof data.has_picking_list !== "boolean"
  ) {
    return { error: "تعذر التحقق من نتيجة استلام القائمة" }
  }

  if (data.has_picking_list) {
    if (
      !("order_id" in data) ||
      typeof data.order_id !== "string" ||
      !("merchant_id" in data) ||
      typeof data.merchant_id !== "string" ||
      !("invoice_number" in data) ||
      (data.invoice_number !== null && typeof data.invoice_number !== "number") ||
      !("picker_name" in data) ||
      (data.picker_name !== null && typeof data.picker_name !== "string") ||
      !("already_confirmed" in data) ||
      typeof data.already_confirmed !== "boolean"
    ) {
      return { error: "تم تسجيل الاستلام، لكن تعذر التحقق من بيانات إشعار التاجر." }
    }

    if (!data.already_confirmed) {
      const invoiceNumber = data.invoice_number == null
        ? "—"
        : String(data.invoice_number).padStart(5, "0")
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: data.merchant_id,
        title: "المندوب استلم القائمة",
        message: `استلم المندوب قائمة تجهيز الفاتورة #${invoiceNumber} (عامل التجهيز: ${data.picker_name || "غير معيَّن"}).\n[order_id:${data.order_id}]`,
      })
      if (notificationError) {
        console.error("Picking handover notification error:", notificationError.message)
        refresh()
        revalidatePath("/")
        return {
          success: true,
          warning: "تم تثبيت استلام المندوب، لكن تعذر تسجيل إشعار التاجر. أبلغه مباشرة.",
        }
      }
    }
  }

  revalidatePath("/")
  refresh()
  return { success: true }
}
