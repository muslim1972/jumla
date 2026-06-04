"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

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

  let units = []
  try {
    units = JSON.parse(unitsJson)
  } catch (e) {
    return { success: false, error: "Invalid units data" }
  }

  if (units.length === 0) {
    return { success: false, error: "يجب إضافة كمية واحدة على الأقل" }
  }

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

  // To preserve backwards compatibility with buyer app until updated
  const firstUnit = units[0]

  const { error } = await supabase.from('products').insert({
    merchant_id: user.id,
    name,
    description,
    price: firstUnit.price,
    unit_type: firstUnit.type,
    units,
    image_url,
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

  let units = []
  try {
    units = JSON.parse(unitsJson)
  } catch (e) {
    return { success: false, error: "Invalid units data" }
  }

  if (units.length === 0) {
    return { success: false, error: "يجب إضافة كمية واحدة على الأقل" }
  }

  const updates: any = {
    name,
    description,
    units,
    price: units[0].price,
    unit_type: units[0].type
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

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('merchant_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/")
  return { success: true }
}
