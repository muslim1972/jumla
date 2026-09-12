import { cache } from "react"
import { createClient } from "@/utils/supabase/server"

// استعلامات السياق المشتركة بين التخطيطات — مغلّفة بـ React.cache
// لتجري مرة واحدة فقط لكل طلب مهما تكرر استدعاؤها بين layout.tsx و (app)/layout.tsx

/** المستخدم الحالي (جلسة المصادقة) */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/** الملف الشخصي للمستخدم الحالي: الدور والاسم الكامل */
export const getCurrentProfile = cache(async (): Promise<{ role: string | null; fullName: string | null }> => {
  const user = await getCurrentUser()
  if (!user) return { role: null, fullName: null }

  const supabase = await createClient()
  const profileResponse = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  return {
    role: profileResponse.data?.role || null,
    fullName: profileResponse.data?.full_name || null,
  }
})

/** عدد عناصر السلة للمستخدم الحالي */
export const getCartCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser()
  if (!user) return 0

  const supabase = await createClient()
  const { count } = await supabase
    .from('cart_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return count || 0
})

/** الإعدادات العامة للتطبيق (id = 1) */
export const getAppSettings = cache(async () => {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  return settings
})

/** بانرات الترويج السفلية (جدول banners) — تُجلب سيرفرياً وتُمرَّر لـ PromoBanners */
export const getPromoBanners = cache(async () => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('banners')
      .select('id, title, description, bg_gradient, image_url, link_url')
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) return []
    return data
  } catch {
    return []
  }
})

/** شريط الإعلانات العلوي (جدول top_banners) النشطة ضمن فترتها الزمنية */
export const getTopBanners = cache(async () => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('top_banners')
      .select('id, text, link_url, start_date, end_date')
    if (error || !data || data.length === 0) return []
    const now = Date.now()
    return data.filter((b: any) => {
      const from = b.start_date ? new Date(b.start_date).getTime() : 0
      const to = b.end_date ? new Date(b.end_date).getTime() : Infinity
      return from <= now && now <= to
    })
  } catch {
    return []
  }
})
