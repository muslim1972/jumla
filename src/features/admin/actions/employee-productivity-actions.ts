"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"

export interface ProductivityRecord {
  employeeId: string
  employeeName: string
  productsAdded: number
}

export async function getMaterialsProductivity(startDate: string, endDate: string): Promise<ProductivityRecord[]> {
  const supabase = await createClient()

  // Validate admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error("Access denied")

  // Fetch materials employees
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, store_name')
    .eq('role', 'materials')

  if (!employees) return []

  // Create admin client to bypass RLS if needed
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch product counts
  const results: ProductivityRecord[] = []
  
  // Convert endDate to end of day to include all entries on that day
  const endOfDay = new Date(endDate)
  endOfDay.setUTCHours(23, 59, 59, 999)
  const endDateIso = endOfDay.toISOString()

  // Convert startDate to start of day
  const startOfDay = new Date(startDate)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const startDateIso = startOfDay.toISOString()
  
  for (const emp of employees) {
    const { count, error } = await adminSupabase
      .from('master_products')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', emp.id)
      .gte('created_at', startDateIso)
      .lte('created_at', endDateIso)

    results.push({
      employeeId: emp.id,
      employeeName: emp.full_name || emp.store_name || "غير معروف",
      productsAdded: count || 0
    })
  }

  // Sort descending by productivity
  return results.sort((a, b) => b.productsAdded - a.productsAdded)
}
