"use client"

import { useEffect, useState, useTransition } from "react"
import Image from "next/image"
import { AlertCircle, ExternalLink, Loader2, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MasterProductForm, type MasterProduct } from "@/features/materials/components/materials-manager"
import { createMasterProduct } from "@/features/materials/actions"
import {
  loadPendingCatalogCandidates,
  rejectCatalogImportCandidate,
  searchAndQueueCatalogCandidates,
} from "@/features/admin/actions/catalog-import-actions"

type Provider = "food" | "beauty" | "petfood" | "product"
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

const PROVIDERS: { value: Provider; label: string; note: string }[] = [
  { value: "food", label: "الأغذية — Open Food Facts", note: "أغذية ومشروبات" },
  { value: "beauty", label: "العناية والتجميل — Open Beauty Facts", note: "منتجات عناية وتجميل" },
  { value: "petfood", label: "أغذية الحيوانات — Open Pet Food Facts", note: "أغذية الحيوانات الأليفة" },
  { value: "product", label: "منتجات عامة — Open Products Facts", note: "تغطيتها تجريبية وقد تكون محدودة" },
]

export function CatalogImportTab() {
  const [provider, setProvider] = useState<Provider>("food")
  const [searchTerm, setSearchTerm] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [licenseAcknowledged, setLicenseAcknowledged] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [isPending, startTransition] = useTransition()
  const selectedProvider = PROVIDERS.find((item) => item.value === provider)!

  const reloadCandidates = () => {
    startTransition(async () => {
      const result = await loadPendingCatalogCandidates()
      if (!result.success) {
        setError(result.error)
        return
      }
      setCandidates(result.candidates)
      setError("")
    })
  }

  useEffect(() => {
    const load = async () => {
      const result = await loadPendingCatalogCandidates()
      if (result.success) setCandidates(result.candidates)
      else setError(result.error)
    }
    void load()
  }, [])

  const handleSearch = () => {
    setError("")
    setInfo("")
    startTransition(async () => {
      const result = await searchAndQueueCatalogCandidates(searchTerm, provider)
      if (!result.success) {
        setError(result.error)
        return
      }
      setCandidates(result.candidates)
      setInfo(`فُحصت ${result.found} نتيجة ووُضعت العناصر الجديدة في قائمة المراجعة. لم تُنشر أي مادة تلقائياً.`)
    })
  }

  const handleReject = (candidate: Candidate) => {
    setError("")
    startTransition(async () => {
      const result = await rejectCatalogImportCandidate(candidate.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      setCandidates((current) => current.filter((item) => item.id !== candidate.id))
    })
  }

  const initial: MasterProduct | undefined = selected ? {
    id: "",
    name: selected.name,
    description: selected.description,
    category_id: null,
    image_url: selected.image_url,
    barcode: selected.barcode,
    base_price: null,
    units: [],
    unit_conversions: [],
  } : undefined

  return (
    <div className="space-y-5" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>تعزيز الكتالوج من مصادر المنتجات المفتوحة</CardTitle>
          <CardDescription>
            ابحث في مصدر واحد في كل مرة. النتائج تحفظ كمرشحين للمراجعة ولا تصل إلى Pool المواد إلا بعد اعتمادك.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as Provider)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="مصدر البحث"
            >
              {PROVIDERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") handleSearch() }}
              placeholder="مثال: رز، زيت، منظف، شامبو"
              maxLength={80}
              aria-label="عبارة البحث"
            />
            <Button onClick={handleSearch} disabled={isPending || searchTerm.trim().length < 2}>
              {isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Search className="ml-2 h-4 w-4" />}
              ابحث وأضف للمراجعة
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{selectedProvider.note} — البحث يعيد حتى 10 نتائج للدفعة الواحدة.</p>
          <p className="text-xs text-muted-foreground">
            يطابق النظام بالاسم أولاً ثم الوصف. الباركود معلومة مساعدة فقط ولا يستخدم لتحديد التكرار.
          </p>
          {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
          {info && <p role="status" className="text-sm font-semibold text-emerald-700">{info}</p>}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">قائمة المراجعة ({candidates.length})</h2>
        <Button variant="outline" size="sm" onClick={reloadCandidates} disabled={isPending}>تحديث القائمة</Button>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد مواد بانتظار المراجعة.</div>
      ) : (
        <div className="grid gap-3">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {candidate.image_url ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-white">
                    <Image src={candidate.image_url} alt={candidate.name} fill sizes="80px" className="object-contain p-1" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">بلا صورة</div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="font-bold">{candidate.name}</h3>
                  {candidate.description && <p className="text-sm text-muted-foreground">{candidate.description}</p>}
                  {candidate.barcode && <p className="font-mono text-xs text-muted-foreground" dir="ltr">{candidate.barcode}</p>}
                  {candidate.matched_master_product_id && (
                    <p className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5" /> تطابق الاسم والوصف مع مادة موجودة؛ راجعها قبل الاعتماد.
                    </p>
                  )}
                  <a href={candidate.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-blue underline">
                    المصدر والترخيص <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-[10px] text-muted-foreground">{candidate.source_license}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    disabled={isPending || !!candidate.matched_master_product_id}
                    onClick={() => { setSelected(candidate); setLicenseAcknowledged(false); setError("") }}
                  >
                    {candidate.matched_master_product_id ? "موجودة في Pool" : "مراجعة واعتماد"}
                  </Button>
                  <Button size="icon" variant="outline" aria-label="رفض المرشح" onClick={() => handleReject(candidate)} disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setLicenseAcknowledged(false) } }}>
        <DialogContent dir="rtl" className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>اعتماد مادة من {selected ? PROVIDERS.find((item) => item.value === selected.provider)?.label : "المصدر"}</DialogTitle>
          </DialogHeader>
          {selected && initial && (
            <>
              <p className="text-xs text-muted-foreground">
                راجع الاسم والوصف والصورة. اختر وحدة البيع صراحةً؛ لن نخمنها من المصدر. سيبقى رابط المصدر والترخيص محفوظين مع المادة.
              </p>
              <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
                <input
                  type="checkbox"
                  checked={licenseAcknowledged}
                  onChange={(event) => setLicenseAcknowledged(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-blue"
                />
                <span>
                  أقر بأن بيانات Open Facts تخضع لـ ODbL، بما فيها النسبة ومشاركة قاعدة البيانات المشتقة وفق شروط مماثلة، وأن الصور تخضع لـ CC BY-SA. راجع
                  {" "}<a href="https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/" target="_blank" rel="noreferrer" className="text-brand-blue underline">شروط إعادة الاستخدام</a>.
                </span>
              </label>
              <MasterProductForm
                key={selected.id}
                categories={[]}
                initial={initial}
                formId={`catalog-import-${selected.id}`}
                submitLabel="اعتماد وإضافة إلى Pool"
                requireExplicitUnit
                submitDisabled={!licenseAcknowledged}
                onSubmit={async (formData) => {
                  formData.append("catalog_import_candidate_id", selected.id)
                  return createMasterProduct(formData)
                }}
                onSuccess={() => {
                  setSelected(null)
                  setLicenseAcknowledged(false)
                  setCandidates((current) => current.filter((item) => item.id !== selected.id))
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
