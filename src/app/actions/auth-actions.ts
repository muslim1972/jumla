"use server"

import { createClient } from "@supabase/supabase-js"

export async function deleteUserAccount(userId: string) {
  // We MUST use the service role key to delete a user
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "Missing Supabase configuration" }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error("Error deleting user:", error)
      return { error: error.message }
    }

    return { success: true }
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred" }
  }
}
