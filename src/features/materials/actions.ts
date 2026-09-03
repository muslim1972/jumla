"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { validateBarcode } from "@/features/materials/lib/barcode"
import { calculateUnitMultipliers } from "@/features/materials/lib/units"

async function assertMaterialsRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, error: "Unauthorized" as const }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || ""
  if (!['materials', 'admin'].includes(role)) {
    return { supabase, user: null, error: "غير مصرح لك بإدارة المواد" as const }
  }

  return { supabase, user, error: null }
}

async function uploadMasterImage(supabase: any, userId: string, image: File): Promise<string | null> {
  const fileExt = image.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `master/${userId}/${fileName}`

  const { error: uploadError, data } = await supabase.storage
    .from('products')
    .upload(filePath, image)

  if (!uploadError && data) {
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filePath)
    return publicUrl
  }
  return null
}

function translateMasterError(error: any): string {
  // 23505: انتهاك الفهرس الفريد للباركود في master_products
  if (error?.code === '23505') {
    return "هذا الباركود مسجل مسبقاً لمادة أخرى"
  }
  return error?.message || "حدث خطأ غير متوقع"
}

/**
 * ينشئ قسماً جديداً في الكتالوج المركزي (جدول categories) لدعم زر
 * "إضافة قسم جديد" في شاشة إدارة المواد لأقسام غير موجودة بالقائمة.
 * - يتطلب دور materials أو admin (فحص دفاعي يوازي سياسة RLS في القاعدة).
 * - يرفض الأسماء الفارغة أو الأطول من 60 حرفاً بعد إزالة الفراغات الطرفية.
 * - يمنع التكرار بفحص مسبق بالاسم، ويرجع رسالة واضحة عند انتهاك قيد الفريد (23505).
 * يرجع { success, error?, category? } حيث category هو القسم المُنشأ { id, name }.
 */
export async function createCategory(name: string) {
  const { supabase, error: roleError } = await assertMaterialsRole()
  if (roleError) return { success: false, error: roleError }

  const trimmed = (name || "").trim()
  if (!trimmed) return { success: false, error: "اسم القسم مطلوب" }
  if (trimmed.length > 60) return { success: false, error: "اسم القسم طويل جداً (الحد الأقصى 60 حرفاً)" }

  // فحص التكرار مسبقاً لرسالة أوضح بدل الاعتماد على قيد فريد غير مضمون الوجود
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('name', trimmed)
    .maybeSingle()
  if (existing) return { success: false, error: "هذا القسم موجود مسبقاً" }

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: trimmed })
    .select('id, name')
    .single()

  if (error) {
    if (error.code === '23505') return { success: false, error: "هذا القسم موجود مسبقاً" }
    return { success: false, error: error.message }
  }

  revalidatePath("/materials")
  return { success: true, category: data }
}

export async function createMasterProduct(formData: FormData) {
  const { supabase, user, error: roleError } = await assertMaterialsRole()
  if (roleError || !user) return { success: false, error: roleError || "Unauthorized" }

  const name = (formData.get("name") as string || "").trim()
  const description = (formData.get("description") as string || "").trim()
  const category_id = formData.get("category_id") as string | null
  const barcodeRaw = (formData.get("barcode") as string || "").trim()
  const basePriceRaw = (formData.get("base_price") as string || "").trim()
  const unitsJson = formData.get("units") as string
  const conversionsJson = formData.get("unit_conversions") as string || "[]"
  const image = formData.get("image") as File | null

  if (!name) {
    return { success: false, error: "اسم المادة مطلوب" }
  }

  const barcodeError = validateBarcode(barcodeRaw)
  if (barcodeError) {
    return { success: false, error: barcodeError }
  }

  let units: { type: string }[] = []
  let unit_conversions: { from: string, to: string, multiplier: number }[] = []
  try {
    units = JSON.parse(unitsJson)
    unit_conversions = JSON.parse(conversionsJson)
  } catch (e) {
    return { success: false, error: "Invalid json data" }
  }

  if (units.length === 0) {
    return { success: false, error: "يجب إضافة وحدة واحدة على الأقل" }
  }

  // إعادة حساب المضاعفات على السيرفر بدل الوثوق بالعميل
  const enrichedUnits = calculateUnitMultipliers(units, unit_conversions)

  const base_price = basePriceRaw ? parseFloat(basePriceRaw) : null
  if (base_price !== null && (isNaN(base_price) || base_price < 0)) {
    return { success: false, error: "السعر الأساسي غير صحيح" }
  }

  let image_url: string | null = null
  if (image && image.size > 0) {
    image_url = await uploadMasterImage(supabase, user.id, image)
  }

  const { error } = await supabase.from('master_products').insert({
    name,
    description: description || null,
    category_id: category_id || null,
    barcode: barcodeRaw || null,
    base_price,
    units: enrichedUnits,
    unit_conversions: unit_conversions,
    image_url,
    created_by: user.id
  })

  if (error) return { success: false, error: translateMasterError(error) }

  revalidatePath("/materials")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function editMasterProduct(formData: FormData) {
  const { supabase, user, error: roleError } = await assertMaterialsRole()
  if (roleError || !user) return { success: false, error: roleError || "Unauthorized" }

  const id = formData.get("id") as string
  const name = (formData.get("name") as string || "").trim()
  const description = (formData.get("description") as string || "").trim()
  const category_id = formData.get("category_id") as string | null
  const barcodeRaw = (formData.get("barcode") as string || "").trim()
  const basePriceRaw = (formData.get("base_price") as string || "").trim()
  const unitsJson = formData.get("units") as string
  const conversionsJson = formData.get("unit_conversions") as string || "[]"
  const image = formData.get("image") as File | null

  if (!id) {
    return { success: false, error: "معرّف المادة مفقود" }
  }
  if (!name) {
    return { success: false, error: "اسم المادة مطلوب" }
  }

  const barcodeError = validateBarcode(barcodeRaw)
  if (barcodeError) {
    return { success: false, error: barcodeError }
  }

  let units: { type: string }[] = []
  let unit_conversions: { from: string, to: string, multiplier: number }[] = []
  try {
    units = JSON.parse(unitsJson)
    unit_conversions = JSON.parse(conversionsJson)
  } catch (e) {
    return { success: false, error: "Invalid json data" }
  }

  if (units.length === 0) {
    return { success: false, error: "يجب إضافة وحدة واحدة على الأقل" }
  }

  const enrichedUnits = calculateUnitMultipliers(units, unit_conversions)

  const base_price = basePriceRaw ? parseFloat(basePriceRaw) : null
  if (base_price !== null && (isNaN(base_price) || base_price < 0)) {
    return { success: false, error: "السعر الأساسي غير صحيح" }
  }

  const updates: any = {
    name,
    description: description || null,
    category_id: category_id || null,
    barcode: barcodeRaw || null,
    base_price,
    units: enrichedUnits,
    unit_conversions: unit_conversions,
    updated_at: new Date().toISOString()
  }

  if (image && image.size > 0) {
    const publicUrl = await uploadMasterImage(supabase, user.id, image)
    if (publicUrl) updates.image_url = publicUrl
  }

  const { error } = await supabase
    .from('master_products')
    .update(updates)
    .eq('id', id)

  if (error) return { success: false, error: translateMasterError(error) }

  revalidatePath("/materials")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function deleteMasterProduct(id: string) {
  const { supabase, user, error: roleError } = await assertMaterialsRole()
  if (roleError || !user) return { success: false, error: roleError || "Unauthorized" }

  // منع الحذف إذا كانت المادة مرتبطة بمنتجات تجار
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('master_product_id', id)

  if (count && count > 0) {
    return {
      success: false,
      error: `لا يمكن حذف هذه المادة لارتباطها بـ ${count} منتج لدى التجار. يمكنك تعديلها وستصل التعديلات تلقائياً لجميع المنتجات المرتبطة.`
    }
  }

  const { error } = await supabase
    .from('master_products')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/materials")
  revalidatePath("/dashboard")
  return { success: true }
}
