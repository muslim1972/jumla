"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getActorContext, hasPermission } from "@/features/staff/lib/guard"
import { displayToBase, multiplierToBase } from "@/features/warehouse/lib/helpers"
import { checkAndNotifyLowStock } from "@/features/warehouse/low-stock"

// ============================================================================
// إجراءات المخازن — ميزة معزولة. كل إجراء يتحقق من سياق الفاعل (تاجر/موظف بصلاحية)
// ============================================================================

function refresh() {
  revalidatePath("/dashboard/warehouses")
  revalidatePath("/dashboard")
  revalidatePath("/")
}

/** تفعيل وحدة المخازن للتاجر: ينشئ «المخزن الرئيسي» ويرحّل أرصدة منتجاته القائمة */
export async function enableWarehouseModule() {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx || ctx.isStaff) return { success: false, error: "لصاحب المتجر فقط تفعيل هذه الوحدة" }

  const { error } = await supabase.rpc("enable_merchant_warehouse")
  if (error) return { success: false, error: error.message }

  refresh()
  return { success: true }
}

/** إنشاء مخزن إضافي (الحد 5 مخازن في هذه المرحلة) */
export async function createWarehouse(name: string, locationNote: string) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx || ctx.isStaff) return { success: false, error: "لصاحب المتجر فقط إنشاء المخازن" }

  const cleanName = (name || "").trim()
  if (cleanName.length < 2 || cleanName.length > 40) return { success: false, error: "اسم المخزن يجب أن يكون بين 2 و40 حرفاً" }

  const { count } = await supabase
    .from("warehouses")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", ctx.merchantId)

  if ((count || 0) >= 5) return { success: false, error: "وصلت الحد الأقصى (5 مخازن) في هذه المرحلة" }

  const { error } = await supabase.from("warehouses").insert({
    merchant_id: ctx.merchantId,
    name: cleanName,
    location_note: (locationNote || "").trim() || null,
  })
  if (error) return { success: false, error: error.message }

  refresh()
  return { success: true }
}

/** إضافة مادة من الـ Pool المركزي إلى المخزن: تُنشئ عرض التاجر + بند المخزن (عبر trigger) */
export async function addPoolItemToWarehouse(formData: FormData) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { success: false, error: "غير مصرح" }
  if (!hasPermission(ctx, "pricing")) return { success: false, error: "لا تملك صلاحية تعديل الأسعار" }
  if (!ctx.warehouseEnabled) return { success: false, error: "وحدة المخازن غير مفعلة" }

  const warehouseId = formData.get("warehouse_id") as string
  const masterProductId = formData.get("master_product_id") as string
  const unitsJson = formData.get("units") as string
  const stockQuantity = parseInt(formData.get("stock_quantity") as string || "0", 10)
  const stockUnit = formData.get("stock_unit") as string || ""
  const minStockAlert = parseInt(formData.get("min_stock_alert") as string || "0", 10)

  if (!masterProductId || !warehouseId) return { success: false, error: "حدد المادة والمخزن" }

  let units: { type: string, price: number }[] = []
  try { units = JSON.parse(unitsJson) } catch { return { success: false, error: "بيانات وحدات غير صالحة" } }
  if (units.length === 0) return { success: false, error: "أدخل سعر وحدة واحدة على الأقل" }

  // المخزن ملك الفاعل؟
  const { data: warehouse } = await supabase
    .from("warehouses").select("id").eq("id", warehouseId).eq("merchant_id", ctx.merchantId).single()
  if (!warehouse) return { success: false, error: "المخزن غير موجود" }

  // المادة المركزية
  const { data: master } = await supabase
    .from("master_products").select("*").eq("id", masterProductId).single()
  if (!master) return { success: false, error: "المادة غير موجودة في الكتالوج المركزي" }

  // منع التكرار لدى نفس التاجر (حماية التكرار القائمة)
  const { count: dupCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", ctx.merchantId)
    .eq("master_product_id", masterProductId)
  if (dupCount && dupCount > 0) return { success: false, error: "هذه المادة مضافة مسبقاً لمتجرك" }

  const masterUnits: { type: string, multiplier_to_base: number }[] = master.units || []
  for (const u of units) {
    if (!masterUnits.some(mu => mu.type === u.type)) return { success: false, error: `الوحدة «${u.type}» غير متاحة لهذه المادة` }
    if (!u.price || u.price <= 0) return { success: false, error: `أدخل سعراً صحيحاً للوحدة «${u.type}»` }
  }

  const conversions = master.unit_conversions || []
  const stockBase = displayToBase(stockQuantity, stockUnit, conversions)
  const minBase = displayToBase(minStockAlert, stockUnit, conversions)

  const enrichedUnits = units.map(u => ({
    type: u.type,
    price: u.price,
    multiplier_to_base: masterUnits.find(mu => mu.type === u.type)?.multiplier_to_base ?? 1,
  }))

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({
      merchant_id: ctx.merchantId,
      master_product_id: masterProductId,
      name: master.name,
      description: master.description,
      image_url: master.image_url,
      category_id: master.category_id,
      price: enrichedUnits[0].price,
      unit_type: enrichedUnits[0].type,
      units: enrichedUnits,
      stock_quantity: stockBase,
      stock_unit: stockUnit,
      min_stock_alert: 0, // حد التنبيه يُدار من بند المخزن ويُعرض مُحوَّلاً — لا ازدواج هنا
      unit_conversions: conversions,
    })
    .select("id")
    .single()

  if (insertError || !product) return { success: false, error: insertError?.message || "فشل إدخال المادة" }

  // بند المخزن: أنشأه trigger الإدخال في المخزن الافتراضي — نعدّل حده إن أُدخل لمخزن آخر
  let itemId: string | null = null
  if (stockUnit || minStockAlert > 0) {
    // استخدم وحدة العرض التي أدخلها التاجر كبديل شفاف: خزّن الحد بوحدة الأساس
    const minBaseAdjusted = minBase
    const { data: item } = await supabase
      .from("warehouse_items")
      .update({ min_stock_alert: minBaseAdjusted })
      .eq("product_id", product.id)
      .eq("warehouse_id", warehouseId)
      .select("id")
      .single()
    itemId = item?.id ?? null
  } else {
    const { data: item } = await supabase
      .from("warehouse_items").select("id").eq("product_id", product.id).eq("warehouse_id", warehouseId).single()
    itemId = item?.id ?? null
  }

  // حركة «وارد» افتتاحية إن وُجد رصيد
  if (itemId && stockBase > 0) {
    await supabase.rpc("warehouse_apply_movement", {
      p_item_id: itemId,
      p_kind: "in",
      p_quantity: stockBase,
      p_note: "رصيد افتتاحي عند الإضافة للمخزن",
      p_reference_type: null,
      p_reference_id: null,
    })
  }

  refresh()
  return { success: true }
}

/** إدخال حر لمادة خاصة (غير موجودة في الـ Pool) إلى المخزن */
export async function addOwnItemToWarehouse(formData: FormData) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { success: false, error: "غير مصرح" }
  if (!hasPermission(ctx, "pricing")) return { success: false, error: "لا تملك صلاحية تعديل الأسعار" }
  if (!ctx.warehouseEnabled) return { success: false, error: "وحدة المخازن غير مفعلة" }

  const warehouseId = formData.get("warehouse_id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const unitsJson = formData.get("units") as string
  const conversionsJson = formData.get("unit_conversions") as string || "[]"
  const stockQuantity = parseInt(formData.get("stock_quantity") as string || "0", 10)
  const stockUnit = formData.get("stock_unit") as string || ""
  const minStockAlert = parseInt(formData.get("min_stock_alert") as string || "0", 10)
  const image = formData.get("image") as File | null
  const categoryId = formData.get("category_id") as string | null
  const barcode = ((formData.get("barcode") as string) || "").trim() || null
  // «الكتالوج يعلم كل شيء»: المشاركة إجبارية — المادة تُربط بالكتالوج المركزي
  // (بمطابقة قائمة أو برفع منسوب للتاجر) وأسعار التاجر ورصيده يبقيان خاصين به


  if (!warehouseId) return { success: false, error: "حدد المخزن" }
  const cleanName = (name || "").trim()
  if (cleanName.length < 2) return { success: false, error: "اسم المادة قصير جداً" }

  let units: { type: string, price: number }[] = []
  let conversions: { from: string, to: string, multiplier: number }[] = []
  try {
    units = JSON.parse(unitsJson)
    conversions = JSON.parse(conversionsJson)
  } catch { return { success: false, error: "بيانات وحدات غير صالحة" } }
  if (units.length === 0) return { success: false, error: "أضف وحدة واحدة على الأقل مع سعرها" }

  const { data: warehouse } = await supabase
    .from("warehouses").select("id").eq("id", warehouseId).eq("merchant_id", ctx.merchantId).single()
  if (!warehouse) return { success: false, error: "المخزن غير موجود" }

  // مضاعفات الوحدات من سلسلة التحويلات (نفس اتفاق لوحة المنتجات)
  const enrichedUnits = units.map(u => ({
    type: u.type,
    price: u.price,
    multiplier_to_base: multiplierToBase(u.type, conversions),
  }))
  const stockBase = displayToBase(stockQuantity, stockUnit, conversions)

  let imageUrl: string | null = null
  if (image && image.size > 0) {
    const fileExt = image.name.split(".").pop()
    const filePath = `${ctx.merchantId}/${Date.now()}-wh.${fileExt}`
    const { error: uploadError, data } = await supabase.storage.from("products").upload(filePath, image)
    if (!uploadError && data) {
      const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(filePath)
      imageUrl = publicUrl
    }
  }

  // خطوة الكتالوج أولاً (مشاركة إجبارية): مطابقة بالباركود ثم الاسم المطابق —
  // وإلا رفع جديد منسوب للتاجر. فشلها يوقف الإضافة كي لا يُنشأ منتج يتيم خارج الكتالوج
  const esc = cleanName.replace(/[\\%_]/g, "\\$&")
  let masterId: string | null = null
  let pool: "created" | "linked" = "created"

  if (barcode) {
    const { data: byBarcode } = await supabase
      .from("master_products").select("id").eq("barcode", barcode).maybeSingle()
    masterId = byBarcode?.id ?? null
  }
  if (!masterId) {
    const { data: byName } = await supabase
      .from("master_products").select("id").ilike("name", esc).maybeSingle()
    masterId = byName?.id ?? null
  }
  if (masterId) {
    pool = "linked"
  } else {
    const { data: created, error: masterError } = await supabase
      .from("master_products")
      .insert({
        name: cleanName,
        description: description || null,
        category_id: categoryId || null,
        image_url: imageUrl,
        barcode,
        base_price: enrichedUnits[0].price,
        // وحدات الكتالوج بلا أسعار — الأسعار ملك التاجر وحده
        units: enrichedUnits.map(u => ({ type: u.type, multiplier_to_base: u.multiplier_to_base })),
        unit_conversions: conversions,
        created_by: ctx.userId,
        origin: "merchant",
      })
      .select("id")
      .single()

    if (masterError || !created) {
      return { success: false, error: "تعذّر تسجيل المادة في الكتالوج المركزي: " + (masterError?.message || "خطأ غير معروف") }
    }
    masterId = created.id
  }

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({
      merchant_id: ctx.merchantId,
      master_product_id: masterId,
      name: cleanName,
      description: description || null,
      price: enrichedUnits[0].price,
      unit_type: enrichedUnits[0].type,
      units: enrichedUnits,
      image_url: imageUrl,
      category_id: categoryId || null,
      stock_quantity: stockBase,
      stock_unit: stockUnit,
      min_stock_alert: 0,
      unit_conversions: conversions,
    })
    .select("id")
    .single()

  if (insertError || !product) return { success: false, error: insertError?.message || "فشل إدخال المادة" }

  if (minStockAlert > 0) {
    const minBase = displayToBase(minStockAlert, stockUnit, conversions)
    await supabase
      .from("warehouse_items")
      .update({ min_stock_alert: minBase })
      .eq("product_id", product.id)
      .eq("warehouse_id", warehouseId)
  }

  if (stockBase > 0) {
    const { data: item } = await supabase
      .from("warehouse_items").select("id").eq("product_id", product.id).eq("warehouse_id", warehouseId).single()
    if (item) {
      await supabase.rpc("warehouse_apply_movement", {
        p_item_id: item.id,
        p_kind: "in",
        p_quantity: stockBase,
        p_note: "رصيد افتتاحي عند الإضافة للمخزن",
        p_reference_type: null,
        p_reference_id: null,
      })
    }
  }

  refresh()
  return { success: true, pool }
}

/** تعديل أسعار الوحدات وحد التنبيه لصنف مخزني */
export async function updateWarehouseItemPricing(formData: FormData) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { success: false, error: "غير مصرح" }
  if (!hasPermission(ctx, "pricing")) return { success: false, error: "لا تملك صلاحية تعديل الأسعار" }

  const itemId = formData.get("item_id") as string
  const unitsJson = formData.get("units") as string
  const minStockAlertDisplay = parseInt(formData.get("min_stock_alert") as string || "0", 10)
  const minUnit = formData.get("min_unit") as string || ""

  if (!itemId) return { success: false, error: "معرّف البند مفقود" }

  let units: { type: string, price: number }[] = []
  try { units = JSON.parse(unitsJson) } catch { return { success: false, error: "بيانات وحدات غير صالحة" } }
  if (units.length === 0) return { success: false, error: "يجب إدخال سعر وحدة واحدة على الأقل" }
  for (const u of units) {
    if (!u.price || u.price <= 0) return { success: false, error: `أدخل سعراً صحيحاً للوحدة «${u.type}»` }
  }

  // بند المخزن + منتجه (ملكية الفاعل تتحقق عبر RLS أيضاً)
  const { data: item } = await supabase
    .from("warehouse_items")
    .select("id, product_id, warehouse_id, warehouses!inner(merchant_id)")
    .eq("id", itemId)
    .eq("warehouses.merchant_id", ctx.merchantId)
    .single()
  if (!item) return { success: false, error: "البند غير موجود" }

  const { data: product } = await supabase
    .from("products")
    .select("units, unit_conversions")
    .eq("id", item.product_id)
    .single()
  if (!product) return { success: false, error: "المنتج غير موجود" }

  const existingUnits: { type: string, multiplier_to_base: number }[] = product.units || []
  for (const u of units) {
    if (!existingUnits.some(eu => eu.type === u.type)) {
      return { success: false, error: `الوحدة «${u.type}» غير معرّفة لهذه المادة` }
    }
  }

  const enrichedUnits = units.map(u => ({
    type: u.type,
    price: u.price,
    multiplier_to_base: existingUnits.find(eu => eu.type === u.type)?.multiplier_to_base ?? 1,
  }))

  const { error: productError } = await supabase
    .from("products")
    .update({
      units: enrichedUnits,
      price: enrichedUnits[0].price,
      unit_type: enrichedUnits[0].type,
    })
    .eq("id", item.product_id)
    .eq("merchant_id", ctx.merchantId)
  if (productError) return { success: false, error: productError.message }

  const conversions = product.unit_conversions || []
  const minBase = displayToBase(minStockAlertDisplay, minUnit, conversions)
  const { error: itemError } = await supabase
    .from("warehouse_items")
    .update({ min_stock_alert: minBase })
    .eq("id", itemId)
  if (itemError) return { success: false, error: itemError.message }

  refresh()
  return { success: true }
}

/** حركة مخزنية: وارد / إخراج / تسوية جرد (الكمية بوحدة عرض يختارها المستخدم) */
export async function recordWarehouseMovement(
  itemId: string,
  kind: "in" | "out" | "adjust",
  displayQuantity: number,
  displayUnit: string,
  note: string
) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { success: false, error: "غير مصرح" }
  if (!hasPermission(ctx, "warehouse")) return { success: false, error: "لا تملك صلاحية العمل على المخازن" }
  if (!Number.isFinite(displayQuantity) || displayQuantity < 0) return { success: false, error: "كمية غير صالحة" }

  const { data: row } = await supabase
    .from("warehouse_items")
    .select("id, quantity, product_id, products(unit_conversions)")
    .eq("id", itemId)
    .single()
  // RLS سيمنع قراءة بند غير مصرح به — والفحص الإضافي:
  if (!row) return { success: false, error: "البند غير موجود أو غير مصرح" }

  const conversions = ((row.products as { unit_conversions?: { from: string; to: string; multiplier: number }[] } | null)?.unit_conversions) || []
  const qtyBase = Math.round(displayQuantity * multiplierToBase(displayUnit, conversions))

  let signedBase = qtyBase
  if (kind === "out") signedBase = -qtyBase
  if (kind === "adjust") signedBase = qtyBase - row.quantity // التسوية: الكمية الجديدة المطلقة

  if (signedBase === 0) return { success: true }

  const { error } = await supabase.rpc("warehouse_apply_movement", {
    p_item_id: itemId,
    p_kind: kind,
    p_quantity: signedBase,
    p_note: (note || "").trim() || null,
    p_reference_type: null,
    p_reference_id: null,
  })
  if (error) return { success: false, error: error.message }

  refresh()
  // إنذار فوري إن عبر البند حدّه بالخروج
  await checkAndNotifyLowStock(ctx.merchantId)
  return { success: true }
}

/** حذف بند من المخزن: تصفير رصيده بحركة موثقة ثم حذف البند (المنتج يبقى لدى التاجر) */
export async function deleteWarehouseItem(itemId: string) {
  const supabase = await createClient()
  const ctx = await getActorContext()
  if (!ctx) return { success: false, error: "غير مصرح" }
  if (!hasPermission(ctx, "warehouse")) return { success: false, error: "لا تملك صلاحية العمل على المخازن" }

  const { data: item } = await supabase
    .from("warehouse_items")
    .select("id, quantity")
    .eq("id", itemId)
    .single()
  if (!item) return { success: false, error: "البند غير موجود أو غير مصرح" }

  if (item.quantity > 0) {
    const { error } = await supabase.rpc("warehouse_apply_movement", {
      p_item_id: itemId,
      p_kind: "adjust",
      p_quantity: -item.quantity,
      p_note: "تصفير الرصيد عند حذف البند من المخزن",
      p_reference_type: null,
      p_reference_id: null,
    })
    if (error) return { success: false, error: error.message }
  }

  const { error: delError } = await supabase.from("warehouse_items").delete().eq("id", itemId)
  if (delError) return { success: false, error: delError.message }

  refresh()
  return { success: true }
}
