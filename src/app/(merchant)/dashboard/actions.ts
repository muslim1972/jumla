"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

function calculateUnitsMultipliers(
  conversions: { from: string, to: string, multiplier: number }[],
  units: { type: string, price: number }[]
) {
  if (!conversions || conversions.length === 0) {
    return units.map(u => ({ ...u, multiplier_to_base: 1 }))
  }

  let baseUnit = "";
  if (conversions.length > 0) {
    baseUnit = conversions[conversions.length - 1].to;
  }

  const getMultiplierToBase = (unit: string): number => {
    if (unit === baseUnit) return 1;
    let multiplier = 1;
    let current = unit;
    
    let loops = 0;
    while (current !== baseUnit && loops < 20) {
      const conv = conversions.find(c => c.from === current);
      if (!conv) {
        break;
      }
      multiplier *= conv.multiplier;
      current = conv.to;
      loops++;
    }
    return multiplier;
  }

  return units.map(u => ({
    ...u,
    multiplier_to_base: getMultiplierToBase(u.type)
  }));
}

function getBaseStockQuantity(
  stockQuantity: number,
  stockUnit: string,
  conversions: { from: string, to: string, multiplier: number }[]
): number {
  if (!conversions || conversions.length === 0) return stockQuantity;
  
  let baseUnit = conversions[conversions.length - 1].to;
  
  if (stockUnit === baseUnit) return stockQuantity;

  let multiplier = 1;
  let current = stockUnit;
  let loops = 0;
  while (current !== baseUnit && loops < 20) {
    const conv = conversions.find(c => c.from === current);
    if (!conv) break;
    multiplier *= conv.multiplier;
    current = conv.to;
    loops++;
  }
  
  return stockQuantity * multiplier;
}

export async function updateMerchantSettings(fee: number, phone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('profiles')
    .update({ delivery_fee: fee, support_phone: phone })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function addProductWithUnits(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const unitsJson = formData.get("units") as string
  const image = formData.get("image") as File | null
  const category_id = formData.get("category_id") as string | null
  
  const stock_quantity = parseInt(formData.get("stock_quantity") as string || "0", 10)
  const stock_unit = formData.get("stock_unit") as string || ""
  const min_stock_alert = parseInt(formData.get("min_stock_alert") as string || "0", 10)
  const conversionsJson = formData.get("unit_conversions") as string || "[]"

  let units = []
  let unit_conversions = []
  try {
    units = JSON.parse(unitsJson)
    unit_conversions = JSON.parse(conversionsJson)
  } catch (e) {
    return { success: false, error: "Invalid json data" }
  }

  if (units.length === 0) {
    return { success: false, error: "يجب إضافة كمية واحدة على الأقل" }
  }

  const enrichedUnits = calculateUnitsMultipliers(unit_conversions, units)
  const baseStockQuantity = getBaseStockQuantity(stock_quantity, stock_unit, unit_conversions)

  let image_url = null
  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError, data } = await supabase.storage
      .from('products')
      .upload(filePath, image)

    if (!uploadError && data) {
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)
      image_url = publicUrl
    }
  }

  const firstUnit = enrichedUnits[0]

  const { error } = await supabase.from('products').insert({
    merchant_id: user.id,
    name,
    description,
    price: firstUnit.price,
    unit_type: firstUnit.type,
    units: enrichedUnits,
    image_url,
    category_id: category_id || null,
    stock_quantity: baseStockQuantity,
    stock_unit: stock_unit,
    min_stock_alert: min_stock_alert,
    unit_conversions: unit_conversions
  })

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/")
  return { success: true }
}

export async function editProductWithUnits(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const unitsJson = formData.get("units") as string
  const image = formData.get("image") as File | null
  const category_id = formData.get("category_id") as string | null
  
  const stock_quantity = parseInt(formData.get("stock_quantity") as string || "0", 10)
  const stock_unit = formData.get("stock_unit") as string || ""
  const min_stock_alert = parseInt(formData.get("min_stock_alert") as string || "0", 10)
  const conversionsJson = formData.get("unit_conversions") as string || "[]"

  let units = []
  let unit_conversions = []
  try {
    units = JSON.parse(unitsJson)
    unit_conversions = JSON.parse(conversionsJson)
  } catch (e) {
    return { success: false, error: "Invalid json data" }
  }

  if (units.length === 0) {
    return { success: false, error: "يجب إضافة كمية واحدة على الأقل" }
  }

  const enrichedUnits = calculateUnitsMultipliers(unit_conversions, units)
  const baseStockQuantity = getBaseStockQuantity(stock_quantity, stock_unit, unit_conversions)

  const updates: any = {
    name,
    description,
    units: enrichedUnits,
    price: enrichedUnits[0].price,
    unit_type: enrichedUnits[0].type,
    category_id: category_id || null,
    stock_quantity: baseStockQuantity,
    stock_unit: stock_unit,
    min_stock_alert: min_stock_alert,
    unit_conversions: unit_conversions
  }

  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError, data } = await supabase.storage
      .from('products')
      .upload(filePath, image)

    if (!uploadError && data) {
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)
      updates.image_url = publicUrl
    }
  }

  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .eq('merchant_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/")
  return { success: true }
}

// ربط التاجر بمادة من الكتالوج المركزي: يحدد أسعاره لكل وحدة ومخزونه فقط
export async function linkMasterProduct(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const master_product_id = formData.get("master_product_id") as string
  const unitsJson = formData.get("units") as string
  const stock_quantity = parseInt(formData.get("stock_quantity") as string || "0", 10)
  const stock_unit = formData.get("stock_unit") as string || ""
  const min_stock_alert = parseInt(formData.get("min_stock_alert") as string || "0", 10)

  if (!master_product_id) {
    return { success: false, error: "لم يتم تحديد المادة" }
  }

  let units: { type: string, price: number }[] = []
  try {
    units = JSON.parse(unitsJson)
  } catch (e) {
    return { success: false, error: "Invalid json data" }
  }

  if (units.length === 0) {
    return { success: false, error: "يجب إدخال سعر وحدة واحدة على الأقل" }
  }

  // جلب المادة المركزية
  const { data: master, error: masterError } = await supabase
    .from('master_products')
    .select('*')
    .eq('id', master_product_id)
    .single()

  if (masterError || !master) {
    return { success: false, error: "المادة غير موجودة في الكتالوج المركزي" }
  }

  // منع الربط المكرر لنفس المادة لدى نفس التاجر
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', user.id)
    .eq('master_product_id', master_product_id)

  if (count && count > 0) {
    return { success: false, error: "هذه المادة مضافة مسبقاً لمتجرك" }
  }

  const masterUnits: { type: string, multiplier_to_base: number }[] = master.units || []
  const masterUnitTypes = masterUnits.map(u => u.type)

  for (const u of units) {
    if (!masterUnitTypes.includes(u.type)) {
      return { success: false, error: `الوحدة «${u.type}» غير متاحة لهذه المادة` }
    }
    if (!u.price || u.price <= 0) {
      return { success: false, error: `أدخل سعراً صحيحاً للوحدة «${u.type}»` }
    }
  }

  // بناء وحدات التاجر بأخذ مضاعفات التحويل من سجل المركز
  const enrichedUnits = units.map(u => ({
    type: u.type,
    price: u.price,
    multiplier_to_base: masterUnits.find(mu => mu.type === u.type)?.multiplier_to_base ?? 1
  }))

  const conversions = master.unit_conversions || []
  const baseStockQuantity = getBaseStockQuantity(stock_quantity, stock_unit, conversions)

  const { error } = await supabase.from('products').insert({
    merchant_id: user.id,
    master_product_id,
    name: master.name,
    description: master.description,
    image_url: master.image_url,
    category_id: master.category_id,
    price: enrichedUnits[0].price,
    unit_type: enrichedUnits[0].type,
    units: enrichedUnits,
    stock_quantity: baseStockQuantity,
    stock_unit: stock_unit,
    min_stock_alert: min_stock_alert,
    unit_conversions: conversions
  })

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/")
  return { success: true }
}

// تعديل أسعار ومخزون منتج مرتبط بالكتالوج المركزي فقط (بدون لمس بيانات المادة الأساسية)
export async function editLinkedProductPricing(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const id = formData.get("id") as string
  const unitsJson = formData.get("units") as string
  const stock_quantity = parseInt(formData.get("stock_quantity") as string || "0", 10)
  const stock_unit = formData.get("stock_unit") as string || ""
  const min_stock_alert = parseInt(formData.get("min_stock_alert") as string || "0", 10)

  if (!id) return { success: false, error: "معرّف المنتج مفقود" }

  let units: { type: string, price: number }[] = []
  try {
    units = JSON.parse(unitsJson)
  } catch (e) {
    return { success: false, error: "Invalid json data" }
  }

  if (units.length === 0) {
    return { success: false, error: "يجب إدخال سعر وحدة واحدة على الأقل" }
  }

  for (const u of units) {
    if (!u.price || u.price <= 0) {
      return { success: false, error: `أدخل سعراً صحيحاً للوحدة «${u.type}»` }
    }
  }

  // جلب وحدات المنتج الحالية لأخذ المضاعفات (المصدر: سجل المركز وقت الربط)
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('units, unit_conversions')
    .eq('id', id)
    .eq('merchant_id', user.id)
    .single()

  if (productError || !product) {
    return { success: false, error: "المنتج غير موجود" }
  }

  const existingUnits: { type: string, multiplier_to_base: number }[] = product.units || []
  const enrichedUnits = units.map(u => ({
    type: u.type,
    price: u.price,
    multiplier_to_base: existingUnits.find(eu => eu.type === u.type)?.multiplier_to_base ?? 1
  }))

  const baseStockQuantity = getBaseStockQuantity(stock_quantity, stock_unit, product.unit_conversions || [])

  const { error } = await supabase
    .from('products')
    .update({
      units: enrichedUnits,
      price: enrichedUnits[0].price,
      unit_type: enrichedUnits[0].type,
      stock_quantity: baseStockQuantity,
      stock_unit: stock_unit,
      min_stock_alert: min_stock_alert
    })
    .eq('id', id)
    .eq('merchant_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/")
  return { success: true }
}

export async function deleteProductAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // 1. Remove from any user's cart to prevent simple FK issues
  await supabase.from('cart_items').delete().eq('product_id', id);

  // 2. Attempt to delete the product
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('merchant_id', user.id)

  if (error) {
    // 23503 is PostgreSQL code for foreign_key_violation
    if (error.code === '23503' || error.message.includes('foreign key')) {
      return { 
        success: false, 
        error: "لا يمكن حذف هذا المنتج لوجود فواتير وطلبات سابقة مرتبطة به. لتجنب تلف السجلات، يرجى (تعديل) المنتج أو تصفير مخزونه بدلاً من حذفه." 
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard")
  revalidatePath("/")
  return { success: true }
}
