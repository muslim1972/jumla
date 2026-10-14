"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

const PROVIDERS = {
  food: { label: "Open Food Facts", host: "world.openfoodfacts.org", imageHost: "images.openfoodfacts.org" },
  beauty: { label: "Open Beauty Facts", host: "world.openbeautyfacts.org", imageHost: "images.openbeautyfacts.org" },
  petfood: { label: "Open Pet Food Facts", host: "world.openpetfoodfacts.org", imageHost: "images.openpetfoodfacts.org" },
  product: { label: "Open Products Facts", host: "world.openproductsfacts.org", imageHost: "images.openproductsfacts.org" },
} as const

type Provider = keyof typeof PROVIDERS
type Candidate = {
  id: string
  provider: Provider
  provider_key: string
  name: string
  description: string | null
  barcode: string | null
  image_url: string | null
  source_url: string
  source_license: string
  status: "pending" | "accepted" | "rejected" | "duplicate"
  matched_master_product_id: string | null
  accepted_master_product_id: string | null
  created_at: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: "يلزم تسجيل الدخول" }

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (error || profile?.role !== "admin") return { supabase, user: null, error: "هذه العملية متاحة للمدير فقط" }
  return { supabase, user, error: null }
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const cleaned = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  return cleaned ? cleaned.slice(0, 500) : null
}

function safeImageUrl(value: unknown, imageHost: string): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === imageHost && url.pathname.startsWith("/images/products/")
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function normalize(value: string | null | undefined) {
  return (value || "").normalize("NFKC").trim().toLocaleLowerCase("ar").replace(/\s+/g, " ")
}

async function findNameMatch(supabase: Awaited<ReturnType<typeof createClient>>, name: string, description: string | null) {
  const escaped = name.replace(/[\\%_]/g, "\\$&")
  const { data, error } = await supabase.from("master_products").select("id, name, description").ilike("name", escaped).limit(100)
  if (error) return { id: null, error: "تعذر فحص الاسم في الكتالوج" }
  const normalizedName = normalize(name)
  const normalizedDescription = normalize(description)
  const sameName = (data || []).filter((row) => normalize(row.name) === normalizedName)
  const exact = sameName.find((row) => normalize(row.description) === normalizedDescription)
  return { id: exact?.id || null, error: null }
}

export async function searchAndQueueCatalogCandidates(searchValue: string, providerValue: string) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return { success: false as const, error: auth.error }

  const searchTerm = (searchValue || "").trim()
  if (searchTerm.length < 2 || searchTerm.length > 80) {
    return { success: false as const, error: "اكتب عبارة بحث من حرفين إلى 80 حرفاً" }
  }
  if (!Object.hasOwn(PROVIDERS, providerValue)) return { success: false as const, error: "مصدر البحث غير صالح" }

  const provider = providerValue as Provider
  const config = PROVIDERS[provider]
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
  const { count: recentSearchCount, error: rateLimitLookupError } = await auth.supabase
    .from("catalog_import_search_runs")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", auth.user.id)
    .gt("created_at", oneMinuteAgo)
  if (rateLimitLookupError) return { success: false as const, error: "تعذر التحقق من حد البحث. تحقق من تطبيق ترحيل استيراد الكتالوج." }
  if ((recentSearchCount || 0) >= 10) return { success: false as const, error: "وصلت إلى حد البحث المؤقت. انتظر دقيقة ثم حاول مجدداً." }
  const { error: runLogError } = await auth.supabase.from("catalog_import_search_runs").insert({
    provider,
    search_term: searchTerm,
    requested_by: auth.user.id,
  })
  if (runLogError) {
    console.error("[catalog-import] failed to record search run", {
      code: runLogError.code,
      message: runLogError.message,
      details: runLogError.details,
      hint: runLogError.hint,
    })
    return { success: false as const, error: "تعذر تسجيل محاولة البحث. تحقق من صلاحيات جدول سجل البحث وتطبيق ترحيل الكتالوج." }
  }
  const endpoint = new URL(`https://${config.host}/cgi/search.pl`)
  endpoint.searchParams.set("search_terms", searchTerm)
  endpoint.searchParams.set("json", "1")
  endpoint.searchParams.set("page_size", "10")
  endpoint.searchParams.set("page", "1")
  endpoint.searchParams.set("fields", "code,product_name,product_name_ar,generic_name,brands,quantity,image_front_url")

  let payload: { products?: Record<string, unknown>[] }
  try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "JumlaCatalog/1.0 (https://github.com/muslim1972/jumla)", Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    })
    if (!response.ok) return { success: false as const, error: `رفض المصدر الطلب (${response.status})` }
    payload = await response.json()
  } catch {
    return { success: false as const, error: "تعذر الوصول إلى مصدر المنتجات. حاول لاحقاً." }
  }

  const products = (payload.products || []).slice(0, 10)
  const rows = products.flatMap((product) => {
    const name = cleanText(product.product_name_ar) || cleanText(product.product_name) || cleanText(product.generic_name)
    const providerKey = cleanText(product.code)
    if (!name || !providerKey) return []
    const code = encodeURIComponent(providerKey)
    const brands = cleanText(product.brands)
    const quantity = cleanText(product.quantity)
    const genericName = cleanText(product.generic_name)
    const description = genericName && normalize(genericName) !== normalize(name)
      ? genericName
      : [brands, quantity].filter(Boolean).join(" · ") || null
    return [{
      provider,
      provider_key: providerKey,
      name,
      description,
      barcode: /^\d{8,14}$/.test(providerKey) ? providerKey : null,
      image_url: safeImageUrl(product.image_front_url, config.imageHost),
      source_url: `https://${config.host}/product/${code}`,
      source_license: "Open Database License (ODbL); product images Creative Commons Attribution-ShareAlike (CC BY-SA)",
      requested_by: auth.user!.id,
    }]
  })

  if (rows.length) {
    const matches = await Promise.all(rows.map((row) => findNameMatch(auth.supabase, row.name, row.description)))
    const rowsWithMatches = rows.map((row, index) => ({ ...row, matched_master_product_id: matches[index].id }))
    const { error } = await auth.supabase.from("catalog_import_candidates").upsert(rowsWithMatches, {
      onConflict: "provider,provider_key",
      ignoreDuplicates: true,
    })
    if (error) return { success: false as const, error: "تعذر حفظ نتائج البحث. تحقق من تطبيق ترحيل استيراد الكتالوج." }
  }

  const { data, error } = await auth.supabase
    .from("catalog_import_candidates")
    .select("id, provider, provider_key, name, description, barcode, image_url, source_url, source_license, status, matched_master_product_id, accepted_master_product_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) return { success: false as const, error: "حُفظ البحث لكن تعذر تحميل قائمة المراجعة" }

  revalidatePath("/admin")
  return { success: true as const, found: rows.length, candidates: (data || []) as Candidate[] }
}

export async function loadPendingCatalogCandidates() {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return { success: false as const, error: auth.error }
  const { data, error } = await auth.supabase
    .from("catalog_import_candidates")
    .select("id, provider, provider_key, name, description, barcode, image_url, source_url, source_license, status, matched_master_product_id, accepted_master_product_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) return { success: false as const, error: "تعذر تحميل قائمة المراجعة. تحقق من تطبيق ترحيل استيراد الكتالوج." }
  return { success: true as const, candidates: (data || []) as Candidate[] }
}

export async function rejectCatalogImportCandidate(candidateId: string) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return { success: false as const, error: auth.error }
  if (!candidateId) return { success: false as const, error: "معرّف المرشح مفقود" }
  const { error } = await auth.supabase.from("catalog_import_candidates")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", candidateId)
    .eq("status", "pending")
  if (error) return { success: false as const, error: "تعذر رفض المرشح" }
  revalidatePath("/admin")
  return { success: true as const }
}
