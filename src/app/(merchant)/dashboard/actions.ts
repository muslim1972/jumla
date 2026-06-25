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
