"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { validateBarcode } from "@/features/materials/lib/barcode"
import { calculateUnitMultipliers } from "@/features/materials/lib/units"
import { getActorContext, hasPermission } from "@/features/staff/lib/guard"

async function assertMaterialsRole(allowMerchant: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, error: "Unauthorized" as const, role: "" }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || ""
  const allowed = allowMerchant ? ['materials', 'admin', 'merchant'] : ['materials', 'admin']
  if (!allowed.includes(role)) {
    return { supabase, user: null, error: "غير مصرح لك بإدارة المواد" as const, role }
  }

  return { supabase, user, error: null, role }
}

// رفع صورة مادة الكتالوج داخل مجلد المعرّف الشخصي للمستخدم — نفس نمط رفع منتجات
// التجار المقبول من سياسات storage (المسارات المغايرة مثل master/... تُرفض بالسياسة)
// مع إرجاع خطأ الرفع بدل ابتلاعه حتى لا تُحفظ مادة بلا صورة بصمت
async function uploadMasterImage(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, image: File): Promise<{ url: string | null, error: string | null }> {
  const fileExt = image.name.split('.').pop()
  const fileName = `master-${Math.random()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError, data } = await supabase.storage
    .from('products')
    .upload(filePath, image)

  if (uploadError || !data) {
    return { url: null, error: uploadError?.message || "فشل رفع الصورة" }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(filePath)
  return { url: publicUrl, error: null }
}

function translateMasterError(error: { code?: string; message?: string } | null): string {
  // المطابقة الفريدة تعتمد على الاسم والوصف؛ الباركود ليس مفتاح هوية.
  if (error?.code === '23505') {
    return "توجد مادة بالاسم والوصف نفسيهما في الكتالوج"
  }
  return error?.message || "حدث خطأ غير متوقع"
}

function normalizeCatalogText(value: string | null | undefined) {
  return (value || "").normalize("NFKC").trim().toLocaleLowerCase("ar").replace(/\s+/g, " ")
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&")
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
  const { supabase, error: roleError } = await assertMaterialsRole(true)
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
  const importCandidateId = (formData.get("catalog_import_candidate_id") as string || "").trim()
  const { supabase, user, error: roleError, role } = await assertMaterialsRole(!importCandidateId)
  if (roleError || !user) return { success: false, error: roleError || "Unauthorized" }

  let importCandidate: {
    id: string
    provider: string
    source_url: string
    source_license: string
    image_url: string | null
    status: string
  } | null = null
  if (importCandidateId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return { success: false, error: "اعتماد المرشحين متاح للمدير فقط" }
    const { data, error } = await supabase
      .from("catalog_import_candidates")
      .select("id, provider, source_url, source_license, image_url, status")
      .eq("id", importCandidateId)
      .eq("status", "pending")
      .maybeSingle()
    if (error || !data) return { success: false, error: "المرشح غير موجود أو تمت مراجعته مسبقاً" }
    importCandidate = data
  }

  const name = (formData.get("name") as string || "").trim()
  const description = (formData.get("description") as string || "").trim()
  const categoryRaw = formData.get("category_id") as string | null
  const category_id = categoryRaw && categoryRaw !== "none" ? categoryRaw : null
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
  } catch {
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

  let image_url: string | null = importCandidate?.image_url || null
  if (image && image.size > 0) {
    const upload = await uploadMasterImage(supabase, user.id, image)
    if (upload.error) return { success: false, error: `تعذر رفع الصورة: ${upload.error}` }
    image_url = upload.url
  }

  // الاسم هو مفتاح المطابقة الأول، ثم الوصف؛ الباركود لا يحدد هوية المادة.
  const { data: sameNames, error: duplicateLookupError } = await supabase
    .from('master_products')
    .select('id, name, description')
    .ilike('name', escapeLikePattern(name))
    .limit(100)
  if (duplicateLookupError) return { success: false, error: "تعذر التحقق من تكرار الاسم والوصف. أعد المحاولة." }
  const duplicate = (sameNames || []).find((item) =>
    normalizeCatalogText(item.name) === normalizeCatalogText(name) && normalizeCatalogText(item.description) === normalizeCatalogText(description)
  )
  if (duplicate) return { success: false, error: "توجد مادة بالاسم والوصف نفسيهما في الكتالوج؛ لم يُستخدم الباركود للمطابقة." }

  if (importCandidate) {
    const { error } = await supabase.rpc("catalog_accept_import_candidate", {
      p_candidate_id: importCandidate.id,
      p_name: name,
      p_description: description || null,
      p_category_id: category_id,
      p_barcode: barcodeRaw || null,
      p_base_price: base_price,
      p_units: enrichedUnits,
      p_unit_conversions: unit_conversions,
      p_image_url: image_url,
    })
    if (error) {
      const duplicate = error.message.includes("duplicate name and description")
      return { success: false, error: duplicate ? "توجد مادة بالاسم والوصف نفسيهما في الكتالوج." : "تعذر اعتماد المرشح؛ ربما تمت مراجعته في جلسة أخرى أو لم يُطبق الترحيل." }
    }
  } else {
    const { error } = await supabase.from('master_products').insert({
      name,
      description: description || null,
      category_id,
      barcode: barcodeRaw || null,
      base_price,
      units: enrichedUnits,
      unit_conversions: unit_conversions,
      image_url,
      created_by: user.id,
      origin: role === 'merchant' ? 'merchant' : 'admin'
    })
    if (error) return { success: false, error: translateMasterError(error) }
  }

  revalidatePath("/materials")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function editMasterProduct(formData: FormData) {
  const ctx = await getActorContext()
  if (!ctx || (ctx.role === "merchant_staff" && !hasPermission(ctx, "pricing"))) {
    const { error: roleError } = await assertMaterialsRole()
    if (roleError) return { success: false, error: "غير مصرح لك بتصحيح بيانات الكتالوج" }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const id = formData.get("id") as string
  const expectedUpdatedAt = formData.get("expected_updated_at") as string | null
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
  if (!expectedUpdatedAt) {
    return { success: false, error: "تعذر التحقق من نسخة المادة. أعد تحميل الصفحة ثم حاول التصحيح مجدداً." }
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
  } catch {
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

  // الاسم أولاً والوصف ثانياً؛ الباركود لا يدخل في كشف التكرار.
  const { data: sameNames, error: duplicateLookupError } = await supabase
    .from('master_products')
    .select('id, name, description')
    .ilike('name', escapeLikePattern(name))
    .neq('id', id)
    .limit(100)
  if (duplicateLookupError) return { success: false, error: "تعذر التحقق من تكرار الاسم والوصف. أعد المحاولة." }
  if ((sameNames || []).some((item) =>
    normalizeCatalogText(item.name) === normalizeCatalogText(name) && normalizeCatalogText(item.description) === normalizeCatalogText(description)
  )) {
    return { success: false, error: "توجد مادة بالاسم والوصف نفسيهما في الكتالوج." }
  }

  const updates: {
    name: string
    description: string | null
    category_id: string | null
    barcode: string | null
    base_price: number | null
    units: { type: string; multiplier_to_base: number }[]
    unit_conversions: { from: string; to: string; multiplier: number }[]
    updated_at: string
    image_url?: string
  } = {
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
    const upload = await uploadMasterImage(supabase, user.id, image)
    if (upload.error) return { success: false, error: `تعذر رفع الصورة: ${upload.error}` }
    if (upload.url) updates.image_url = upload.url
  }

  const { data: updated, error } = await supabase
    .from('master_products')
    .update(updates)
    .eq('id', id)
    .eq('updated_at', expectedUpdatedAt)
    .select('id, name, description, category_id, barcode, base_price, units, unit_conversions, image_url, updated_at')
    .maybeSingle()

  if (error) return { success: false, error: translateMasterError(error) }
  if (!updated) return { success: false, error: "لم يُحفظ التصحيح: ربما عدّل مستخدم آخر المادة، أو لم تُطبّق سياسة الكتالوج. حدّث الصفحة وتحقق من إعداد قاعدة البيانات ثم أعد المحاولة." }

  revalidatePath("/materials")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/warehouses")
  return { success: true, product: updated }
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
