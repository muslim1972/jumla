import { createClient } from "@/utils/supabase/server"
import { MaterialsManager } from "@/features/materials/components/materials-manager"

export default async function MaterialsPage() {
  const supabase = await createClient()

  const [masterResponse, categoriesResponse] = await Promise.all([
    supabase
      .from('master_products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('categories').select('id, name'),
  ])

  const { data: masterData, error: masterError } = masterResponse
  const { data: categoriesData, error: categoriesError } = categoriesResponse

  // إظهار الخطأ بدل ابتلاعه حتى لا تظهر قائمة فارغة زائفة
  if (masterError) console.error("[materials] فشل جلب المواد:", masterError.message)
  if (categoriesError) console.error("[materials] فشل جلب الأقسام:", categoriesError.message)

  // حل أسماء الأقسام محلياً عبر Map بدل embedded join (يعتمد نفس نمط لوحة التاجر المجرَّب)
  const categoryNameById = new Map((categoriesData || []).map(c => [c.id, c.name]))
  const masterProducts = (masterData || []).map(p => ({
    ...p,
    category_name: p.category_id ? categoryNameById.get(p.category_id) ?? null : null,
  }))

  const loadError = masterError
    ? "تعذر تحميل قائمة المواد من الخادم. جرّب تحديث الصفحة، وإن استمر الخطأ تواصل مع الدعم."
    : ""

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <MaterialsManager
        initialProducts={masterProducts}
        categories={categoriesData || []}
        loadError={loadError}
      />
    </div>
  )
}
