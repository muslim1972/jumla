"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { validateBarcode } from "@/features/materials/lib/barcode"

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
  market_country: "iraq"
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

function hasArabicName(value: string | null) {
  return !!value && /[\u0600-\u06FF]/u.test(value)
}

function isTaggedForIraq(product: Record<string, unknown>) {
  const tags = product.countries_tags
  if (!Array.isArray(tags)) return false
  return tags.some((tag) => {
    if (typeof tag !== "string") return false
    const normalizedTag = tag.toLocaleLowerCase("en").replace(/^[a-z]{2}:/, "").replace(/_/g, "-")
    return normalizedTag === "iraq" || normalizedTag === "republic-of-iraq"
  })
}

async function readProviderErrorExcerpt(response: Response, searchTerm?: string) {
  const reader = response.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let byteLength = 0
  try {
    while (byteLength < 1_024) {
      const { done, value } = await reader.read()
      if (done || !value) break
      const chunk = value.subarray(0, 1_024 - byteLength)
      chunks.push(chunk)
      byteLength += chunk.byteLength
      if (chunk.byteLength < value.byteLength) break
    }
  } catch {
    return null
  } finally {
    await reader.cancel().catch(() => undefined)
  }

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  const excerpt = new TextDecoder().decode(bytes).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const redactedExcerpt = searchTerm
    ? excerpt.replace(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "[عبارة البحث]")
    : excerpt
  return redactedExcerpt.slice(0, 400) || null
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

export async function browseIraqFoodCatalog(pageValue: number) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return { success: false as const, error: auth.error }

  if (!Number.isInteger(pageValue) || pageValue < 1 || pageValue > 10_000) {
    return { success: false as const, error: "رقم دفعة التصفح غير صالح" }
  }

  const provider = "food" as const
  const config = PROVIDERS.food
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
    search_term: `تصفح مواد العراق - الدفعة ${pageValue}`,
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
  const searchFields = ["code", "product_name", "product_name_ar", "generic_name", "generic_name_ar", "brands", "quantity", "image_front_url", "countries_tags"]
  const endpoint = new URL("https://search.openfoodfacts.org/search")

  let payload: { hits?: Record<string, unknown>[]; page_count?: number }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "User-Agent": "JumlaCatalog/1.0 (https://github.com/muslim1972/jumla)",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: 'countries_tags:"en:iraq"',
        sort_by: "-popularity_key",
        fields: searchFields,
        page_size: 10,
        page: pageValue,
        langs: ["ar", "en"],
      }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    })
    if (!response.ok) {
      if (response.status === 503) {
        const diagnosticId = crypto.randomUUID()
        const responseExcerpt = await readProviderErrorExcerpt(response)
        console.error("[catalog-import] provider returned 503", {
          diagnosticId,
          provider,
          status: response.status,
          statusText: response.statusText,
          responseExcerpt,
          contentType: response.headers.get("content-type"),
          retryAfter: response.headers.get("retry-after"),
          server: response.headers.get("server"),
          via: response.headers.get("via"),
          cfRay: response.headers.get("cf-ray"),
          requestId: response.headers.get("x-request-id") || response.headers.get("x-correlation-id"),
          finalHost: new URL(response.url).host,
        })
        return {
          success: false as const,
          error: `أعاد ${config.label} الحالة 503، ولا تكفي هذه الحالة وحدها لمعرفة السبب. معرّف التشخيص: ${diagnosticId}. راجع سجل خادم Vercel بهذا المعرّف لتحديد رد المصدر بدقة.`,
        }
      }
      return { success: false as const, error: `رفض المصدر الطلب (${response.status})` }
    }
    payload = await response.json()
  } catch {
    return { success: false as const, error: "تعذر الوصول إلى مصدر المنتجات. حاول لاحقاً." }
  }

  const products = (payload.hits || []).filter(isTaggedForIraq).slice(0, 10)
  const rows = products.flatMap((product) => {
    const name = [product.product_name_ar, product.product_name, product.generic_name_ar, product.generic_name]
      .map(cleanText)
      .find(hasArabicName) || null
    const providerKey = cleanText(product.code)
    if (!name || !providerKey) return []
    const code = encodeURIComponent(providerKey)
    const brands = cleanText(product.brands)
    const quantity = cleanText(product.quantity)
    const genericName = cleanText(product.generic_name)
    const productDetails = [brands, quantity].filter(Boolean).join(" · ")
    const description = productDetails || (genericName && normalize(genericName) !== normalize(name) ? genericName : null)
    const barcode = /^\d{8,14}$/.test(providerKey) && !validateBarcode(providerKey) ? providerKey : null
    return [{
      provider,
      provider_key: providerKey,
      market_country: "iraq" as const,
      name,
      description,
      barcode,
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
    })
    if (error) {
      console.error("[catalog-import] failed to save search candidates", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return { success: false as const, error: "تعذر حفظ نتائج البحث. تحقق من صلاحيات جدول المرشحين." }
    }
  }

  const { data, error } = rows.length ? await auth.supabase
    .from("catalog_import_candidates")
    .select("id, provider, provider_key, market_country, name, description, barcode, image_url, source_url, source_license, status, matched_master_product_id, accepted_master_product_id, created_at")
    .eq("status", "pending")
    .eq("market_country", "iraq")
    .in("provider_key", rows.map((row) => row.provider_key)) : { data: [], error: null }
  if (error) return { success: false as const, error: "حُفظ البحث لكن تعذر تحميل قائمة المراجعة" }

  revalidatePath("/admin")
  const pageCount = Number.isInteger(payload.page_count) ? payload.page_count! : pageValue
  const reviewCandidates = (data || []).filter((candidate) => hasArabicName(candidate.name))
  return {
    success: true as const,
    found: rows.length,
    page: pageValue,
    pageCount,
    hasMore: pageValue < pageCount,
    candidates: reviewCandidates as Candidate[],
  }
}

export async function loadPendingCatalogCandidates() {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return { success: false as const, error: auth.error }
  const { data, error } = await auth.supabase
    .from("catalog_import_candidates")
    .select("id, provider, provider_key, market_country, name, description, barcode, image_url, source_url, source_license, status, matched_master_product_id, accepted_master_product_id, created_at")
    .eq("status", "pending")
    .eq("market_country", "iraq")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) return { success: false as const, error: "تعذر تحميل قائمة المراجعة. تحقق من تطبيق ترحيل استيراد الكتالوج." }
  const reviewCandidates = (data || []).filter((candidate) => hasArabicName(candidate.name))
  return { success: true as const, candidates: reviewCandidates as Candidate[] }
}

export async function loadCatalogImportCategories() {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return { success: false as const, error: auth.error }
  const { data, error } = await auth.supabase.from("categories").select("id, name").order("name")
  if (error) return { success: false as const, error: "تعذر تحميل أقسام المواد" }
  return { success: true as const, categories: data || [] }
}

export async function checkExternalProductRows(rows: { name: string; description: string | null }[]) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return { success: false as const, error: auth.error }
  if (!Array.isArray(rows) || rows.length > 200) return { success: false as const, error: "الحد الأقصى للمعاينة 200 سجل في الملف" }
  const duplicateIndexes: number[] = []
  const seen = new Set<string>()
  for (const [index, row] of rows.entries()) {
    const name = cleanText(row?.name)
    const description = cleanText(row?.description)
    if (!name) continue
    const identity = `${normalize(name)}\\u0000${normalize(description)}`
    if (seen.has(identity)) duplicateIndexes.push(index)
    seen.add(identity)
    const match = await findNameMatch(auth.supabase, name, description)
    if (match.error) return { success: false as const, error: match.error }
    if (match.id) duplicateIndexes.push(index)
  }
  return { success: true as const, duplicateIndexes: [...new Set(duplicateIndexes)] }
}

export async function rejectCatalogImportCandidate(candidateId: string) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return { success: false as const, error: auth.error }
  if (!candidateId) return { success: false as const, error: "معرّف المرشح مفقود" }
  const { error } = await auth.supabase.from("catalog_import_candidates")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", candidateId)
    .eq("status", "pending")
    .eq("market_country", "iraq")
  if (error) return { success: false as const, error: "تعذر رفض المرشح" }
  revalidatePath("/admin")
  return { success: true as const }
}
