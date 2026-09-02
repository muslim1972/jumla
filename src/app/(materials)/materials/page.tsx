import { createClient } from "@/utils/supabase/server"
import { MaterialsManager } from "@/features/materials/components/materials-manager"

export default async function MaterialsPage() {
  const supabase = await createClient()

  const [masterResponse, categoriesResponse] = await Promise.all([
    supabase
      .from('master_products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('categories').select('id, name'),
  ])

  const { data: masterProducts } = masterResponse

  // جلب الفئات بأمان في حال عدم وجود الجدول
  let categories: { id: string, name: string }[] = []
  const { data: categoriesData, error: catError } = categoriesResponse
  if (!catError && categoriesData) {
    const seenNames = new Set()
    for (const cat of categoriesData) {
      if (!seenNames.has(cat.name)) {
        seenNames.add(cat.name)
        categories.push(cat)
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <MaterialsManager initialProducts={masterProducts || []} categories={categories} />
    </div>
  )
}
