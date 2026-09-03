"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { linkMasterProduct } from "@/app/(merchant)/dashboard/actions"
import { Search, X, Loader2, AlertCircle, ChevronDown, ChevronUp, Package, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"

type MasterProduct = {
  id: string
  name: string
  description: string | null
  categories?: { name: string } | null
  image_url: string | null
  barcode: string | null
  base_price: number | null
  units: { type: string, multiplier_to_base: number }[]
  unit_conversions: { from: string, to: string, multiplier: number }[]
}

export function MasterCatalogLinker({ masterProducts, linkedIds, disabled }: {
  masterProducts: MasterProduct[]
  linkedIds: string[]
  disabled: boolean
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<MasterProduct | null>(null)
  const [prices, setPrices] = useState<Record<string, string>>({})
  // الحقول الرقمية تبدأ فارغة مع placeholder بدل صفر يعيق الكتابة — والفراغ يُعامل صفراً عند الإرسال
  const [stockQuantity, setStockQuantity] = useState("")
  const [stockUnit, setStockUnit] = useState("")
  const [minStockAlert, setMinStockAlert] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // البحث الفوري: بالاسم أو رمز الباركود
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return masterProducts
    const qDigits = q.replace(/\D/g, "")
    return masterProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (qDigits && (p.barcode || "").includes(qDigits))
    )
  }, [masterProducts, query])

  const toggleSelect = (p: MasterProduct) => {
    if (linkedIds.includes(p.id)) return
    if (selected?.id === p.id) {
      setSelected(null)
      return
    }
    setSelected(p)
    // تعبئة الأسعار مسبقاً من تسعيرة الكتالوج الأساسية (base_price × مضاعف الوحدة)
    // ليقبلها التاجر كما هي أو يعدلها — بدل حقول فارغة
    const suggestedPrices: Record<string, string> = {}
    if (p.base_price && p.base_price > 0) {
      for (const u of p.units || []) {
        const mult = u.multiplier_to_base && u.multiplier_to_base > 0 ? u.multiplier_to_base : 1
        const price = p.base_price * mult
        if (price > 0) suggestedPrices[u.type] = String(price)
      }
    }
    setPrices(suggestedPrices)
    setError("")
    const conversions = p.unit_conversions || []
    const baseUnit = conversions.length > 0
      ? conversions[conversions.length - 1].to
      : p.units?.[0]?.type || ""
    setStockUnit(baseUnit)
  }

  const handleToggleLink = async () => {
    if (!selected) return

    const units = (selected.units || [])
      .filter(u => prices[u.type] && parseFloat(prices[u.type]) > 0)
      .map(u => ({ type: u.type, price: parseFloat(prices[u.type]) }))

    if (units.length === 0) {
      setError("أدخل سعراً صحيحاً لوحدة واحدة على الأقل لإضافة المادة")
      return
    }

    setIsSubmitting(true)
    setError("")

    const formData = new FormData()
    formData.append("master_product_id", selected.id)
    formData.append("units", JSON.stringify(units))
    formData.append("stock_quantity", stockQuantity || "0")
    formData.append("stock_unit", stockUnit || "")
    formData.append("min_stock_alert", minStockAlert || "0")

    const result = await linkMasterProduct(formData)
    setIsSubmitting(false)

    if (!result?.success) {
      setError(result?.error || "حدث خطأ أثناء الربط")
    } else {
      setSelected(null)
      setQuery("")
      router.refresh()
    }
  }

  return (
    <Card className={cn(
      "transition-all",
      disabled ? "opacity-50 pointer-events-none" : "sticky top-16",
      isOpen ? "shadow-md border-primary/20" : ""
    )}>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>إضافة منتج جديد</CardTitle>
            <CardDescription>ابحث في كتالوج المواد المركزي وأضف المادة بأسعارك الخاصة</CardDescription>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="animate-in slide-in-from-top-2 duration-300 border-t pt-4 space-y-4">
          {/* خانة البحث في الكتالوج المركزي */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم أو برمز الباركود..."
              className="pr-9 h-11 bg-background"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {masterProducts.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-xl">
              <p className="text-muted-foreground text-sm">
                الكتالوج المركزي فارغ حالياً. ستظهر المواد هنا فور تسجيلها من إدارة التطبيق.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-xl">
              <p className="text-muted-foreground text-sm">لا توجد مواد مطابقة لبحثك.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pl-1">
              {filtered.map(p => {
                const isLinked = linkedIds.includes(p.id)
                const isSelected = selected?.id === p.id
                return (
                  <div key={p.id} className="space-y-0">
                    {/* صف المادة مع مربع الاختيار */}
                    <div
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md border bg-background transition-colors",
                        isSelected ? "border-brand-blue ring-1 ring-brand-blue/30" : "",
                        isLinked && "opacity-60"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="w-5 h-5 shrink-0 cursor-pointer accent-brand-blue"
                        checked={isSelected || isLinked}
                        disabled={isLinked}
                        onChange={() => toggleSelect(p)}
                      />

                      {p.image_url ? (
                        <div className="relative w-10 h-10 shrink-0 bg-muted rounded-md border overflow-hidden">
                          <Image src={p.image_url} alt={p.name} fill sizes="40px" className="object-contain p-0.5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 shrink-0 bg-muted rounded-md border flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate">{p.name}</span>
                          {isLinked && (
                            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                              مضافة لمتجرك
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {p.units?.map((u, idx) => (
                            <span key={idx} className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {u.type}
                            </span>
                          ))}
                          {p.barcode && (
                            <span className="text-muted-foreground font-mono text-[10px]" dir="ltr">{p.barcode}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* لوحة التسعير تظهر عند تفعيل مربع الاختيار */}
                    {isSelected && (
                      <div className="mt-1 mb-2 p-3 bg-muted/20 border border-brand-blue/30 rounded-lg space-y-3 animate-in slide-in-from-top-1 duration-200">
                        <p className="text-xs font-bold text-brand-blue flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" />
                          أسعار البيع — معبأة مسبقاً من الكتالوج الأساسي، عدّلها إن أردت
                        </p>

                        <div className="space-y-2">
                          {p.units?.map(u => (
                            <div key={u.type} className="flex items-center gap-2">
                              <span className="bg-secondary/50 text-secondary-foreground px-2 py-1 rounded text-xs font-bold min-w-[70px] text-center border">
                                {u.type}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                placeholder="السعر د.ع"
                                value={prices[u.type] || ""}
                                onChange={(e) => setPrices({ ...prices, [u.type]: e.target.value })}
                                dir="ltr"
                                className="h-9 text-right flex-1"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <div className="space-y-1.5 flex-1">
                            <Label className="text-xs">الكمية في المخزن</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={stockQuantity}
                              onChange={(e) => setStockQuantity(e.target.value.replace(/^0+(?=\d)/, ''))}
                              dir="ltr"
                              className="h-9 text-right"
                            />
                          </div>
                          <div className="space-y-1.5 w-[110px]">
                            <Label className="text-xs">وحدة المخزون</Label>
                            <Select value={stockUnit} onValueChange={(val) => setStockUnit(val || "")}>
                              <SelectTrigger dir="rtl" className="h-9">
                                <SelectValue placeholder="وحدة" />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {p.units?.map(u => (
                                  <SelectItem key={u.type} value={u.type}>{u.type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">أقل كمية لتنبيه النفاد (اختياري)</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={minStockAlert}
                            onChange={(e) => setMinStockAlert(e.target.value)}
                            dir="ltr"
                            className="h-9 text-right sm:w-[200px]"
                          />
                        </div>

                        {error && (
                          <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                          </div>
                        )}

                        <Button
                          type="button"
                          onClick={handleToggleLink}
                          className="w-full bg-brand-orange hover:bg-brand-orange/90"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "إضافة المادة لمتجرك"}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
