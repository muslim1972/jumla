"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search, Plus, Package, CheckCircle2 } from "lucide-react"
import { addOwnItemToWarehouse, addPoolItemToWarehouse } from "@/features/warehouse/actions"
import { formatIQD } from "@/features/warehouse/lib/helpers"
import type { PoolMasterProduct, Warehouse } from "@/features/warehouse/lib/types"

interface Props {
  warehouses: Warehouse[]
  pool: PoolMasterProduct[]
  /** المعرّفات المرتبطة مسبقاً — لمنع التكرار في الواجهة */
  linkedMasterIds: Set<string>
}

/**
 * تبويبة «إضافة مواد» — بحث في الكتالوج أو إدخال مادة جديدة للمخزن.
 */
export function WarehouseAddItemPanel({ warehouses, pool, linkedMasterIds }: Props) {
  const [mode, setMode] = useState<"search" | "own">("search")
  const [warehouseId, setWarehouseId] = useState(warehouses.find(w => w.is_default)?.id || warehouses[0]?.id || "")
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")
  const [okMsg, setOkMsg] = useState("")

  // —— استعراض الـ Pool: الكل المتاح للربط + بحث محلي فوري ——
  const [query, setQuery] = useState("")
  const unlinked = useMemo(() => pool, [pool]) // Show all to avoid confusion, disable linked ones below
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return unlinked
      .filter(p => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.barcode || "").includes(q))
      .slice(0, 40)
  }, [query, unlinked])

  const [selected, setSelected] = useState<PoolMasterProduct | null>(null)
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})
  const [stockQty, setStockQty] = useState("")
  const [stockUnit, setStockUnit] = useState("")
  const [minAlert, setMinAlert] = useState("")

  // —— نموذج الإدخال الحر ——
  const [ownName, setOwnName] = useState("")
  const [ownDescription, setOwnDescription] = useState("")
  const [ownBarcode, setOwnBarcode] = useState("")
  const [ownUnits, setOwnUnits] = useState<{ type: string; price: string }[]>([{ type: "تكة", price: "" }])
  const [ownConversions, setOwnConversions] = useState<{ from: string; to: string; multiplier: string }[]>([])
  const [ownStockQty, setOwnStockQty] = useState("")
  const [ownStockUnit, setOwnStockUnit] = useState("تكة")
  const [ownMinAlert, setOwnMinAlert] = useState("")
  const [ownImage, setOwnImage] = useState<File | null>(null)

  const pickMaster = (p: PoolMasterProduct) => {
    setSelected(p)
    const prefilled: Record<string, string> = {}
    for (const u of p.units) {
      prefilled[u.type] = p.base_price ? String(Math.round(p.base_price * u.multiplier_to_base)) : ""
    }
    setUnitPrices(prefilled)
    setStockUnit(p.units[0]?.type ?? "")
    setStockQty("")
    setMinAlert("")
  }

  const submitPool = () => {
    setErrorMsg("")
    if (!selected || !warehouseId) { setErrorMsg("اختر المادة والمخزن"); return }
    const units = selected.units
      .map(u => ({ type: u.type, price: Number(unitPrices[u.type] || 0) }))
      .filter(u => u.price > 0)
    if (units.length === 0) { setErrorMsg("أدخل سعر وحدة واحدة على الأقل"); return }

    const fd = new FormData()
    fd.set("warehouse_id", warehouseId)
    fd.set("master_product_id", selected.id)
    fd.set("units", JSON.stringify(units))
    fd.set("stock_quantity", stockQty || "0")
    fd.set("stock_unit", stockUnit)
    fd.set("min_stock_alert", minAlert || "0")

    startTransition(async () => {
      const res = await addPoolItemToWarehouse(fd)
      if (res?.error) setErrorMsg(res.error)
      else {
        setOkMsg(`أُضيفت «${selected.name}» إلى المخزن — الأسعار والرصيد محفوظة عندك ولم تُمسّ بيانات الكتالوج المركزي`)
        setSelected(null); setQuery("")
        setTimeout(() => setOkMsg(""), 5000)
      }
    })
  }

  const submitOwn = () => {
    setErrorMsg("")
    if (!warehouseId) { setErrorMsg("اختر المخزن"); return }
    if (ownName.trim().length < 2) { setErrorMsg("اسم المادة قصير جداً"); return }
    if (ownBarcode.trim() && !/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(ownBarcode.trim())) {
      setErrorMsg("صيغة الباركود غير مقبولة. استخدم 8 أو 12 أو 13 أو 14 رقماً، أو اتركه فارغاً.")
      return
    }
    const normalized = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ar")
    const duplicate = pool.find(p => normalized(p.name) === normalized(ownName) && normalized(p.description ?? "") === normalized(ownDescription))
    if (duplicate) {
      setErrorMsg("توجد مادة مطابقة للاسم والوصف في الكتالوج. اخترها من نتائج البحث أو عدّل الاسم أو الوصف.")
      return
    }
    if (ownBarcode.trim() && pool.some(p => p.barcode === ownBarcode.trim())) {
      setErrorMsg("هذا الباركود مستخدم لمادة أخرى. اتركه فارغاً أو أدخل باركوداً مختلفاً.")
      return
    }
    const units = ownUnits
      .map(u => ({ type: u.type.trim(), price: Number(u.price || 0) }))
      .filter(u => u.type && u.price > 0)
    if (units.length === 0) { setErrorMsg("أضف وحدة واحدة مع سعر صحيح"); return }
    const conversions = ownConversions
      .map(c => ({ from: c.from.trim(), to: c.to.trim(), multiplier: Number(c.multiplier || 0) }))
      .filter(c => c.from && c.to && c.multiplier > 0)

    const fd = new FormData()
    fd.set("warehouse_id", warehouseId)
    fd.set("name", ownName.trim())
    fd.set("description", ownDescription.trim())
    fd.set("add_as_new", "true")
    fd.set("barcode", ownBarcode.trim())
    fd.set("units", JSON.stringify(units))
    fd.set("unit_conversions", JSON.stringify(conversions))
    fd.set("stock_quantity", ownStockQty || "0")
    fd.set("stock_unit", ownStockUnit || units[0].type)
    fd.set("min_stock_alert", ownMinAlert || "0")
    if (ownImage) fd.set("image", ownImage)

    startTransition(async () => {
      let res: Awaited<ReturnType<typeof addOwnItemToWarehouse>>
      try {
        res = await addOwnItemToWarehouse(fd)
      } catch {
        setErrorMsg("تعذّرت إضافة المادة بسبب مشكلة اتصال مؤقتة. بيانات النموذج ما زالت محفوظة؛ أعد المحاولة.")
        return
      }
      if (res?.error) { setErrorMsg(res.error); return }
      const poolMsg = "🌱 وسُجِّلت مادة جديدة في الكتالوج المركزي منسوبة إليك — أسعارك ورصيدك يبقيان خاصين بك"
      setOkMsg(`أُضيفت «${ownName.trim()}» إلى المخزن — ${poolMsg}`)
      setOwnName(""); setOwnBarcode(""); setOwnUnits([{ type: "تكة", price: "" }]); setOwnConversions([])
      setOwnStockQty(""); setOwnMinAlert(""); setOwnImage(null)
      setTimeout(() => setOkMsg(""), 8000)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black">إضافة مواد للمخزن</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            من مواد التطبيق (الكتالوج المركزي) أو إضافة مادة جديدة
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">المخزن المستقبل</Label>
        <select
          className="w-full sm:w-72 rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
          value={warehouseId}
          onChange={e => setWarehouseId(e.target.value)}
        >
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.is_default ? " (الرئيسي)" : ""}</option>)}
        </select>
      </div>

      {errorMsg && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{errorMsg}</div>}
      {okMsg && (
        <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs rounded-md font-bold flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{okMsg}</span>
        </div>
      )}

      {mode === "search" && !selected && (
        <div className="space-y-3">
          <div className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في مواد التطبيق بالاسم أو الباركود…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Button variant="outline" onClick={() => { setMode("own"); setOwnName(query.trim()); setSelected(null); setErrorMsg("") }}>جديد</Button>
          </div>

          {!query.trim() ? null : results.length === 0 ? (
            <div className="text-center p-6 rounded-xl border border-dashed border-border space-y-2">
              <Package className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">لا توجد نتائج مطابقة. يمكنك إضافة المادة كجديدة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {results.map(p => (
                <button
                  key={p.id}
                  onClick={() => pickMaster(p)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/70 hover:border-brand-orange/50 hover:bg-brand-orange/5 text-right transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {p.image_url
                      ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      : <Package className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold truncate">{p.name}</span>
                      {p.origin === 'merchant' && (
                        <span className="text-[9px] font-bold bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded-full border border-brand-orange/30">🌱</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.units.map(u => u.type).join(" · ")}{p.category_name ? ` — ${p.category_name}` : ""}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-brand-orange shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "search" && selected && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between bg-muted/40 rounded-xl p-3 border border-border/60">
            <div>
              <div className="font-black text-sm">{selected.name}</div>
              <div className="text-[11px] text-muted-foreground">
                بيانات المادة (الاسم/الصورة/القسم) تُدار مركزياً — وما ستدخله الآن يُحفظ لمتجرك فقط
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>تغيير</Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">أسعار البيع (د.ع) — مقترحة من سعر المركز، عدّلها بحرية</Label>
            {selected.units.map(u => (
              <div key={u.type} className="flex items-center gap-2 max-w-md">
                <div className="w-20 font-bold text-sm shrink-0">{u.type}</div>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  className="text-left font-bold"
                  value={unitPrices[u.type] ?? ""}
                  onChange={e => setUnitPrices(prev => ({ ...prev, [u.type]: e.target.value.replace(/[^\d]/g, "") }))}
                />
                {u.multiplier_to_base !== 1 && (
                  <div className="text-[10px] text-muted-foreground shrink-0 w-20">×{u.multiplier_to_base}</div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-2xl">
            <div className="space-y-1.5">
              <Label className="text-xs">الرصيد</Label>
              <Input dir="ltr" inputMode="numeric" className="text-left font-bold" value={stockQty}
                onChange={e => setStockQty(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وحدة الرصيد</Label>
              <select className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm font-bold"
                value={stockUnit} onChange={e => setStockUnit(e.target.value)}>
                {selected.units.map(u => <option key={u.type} value={u.type}>{u.type}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">حد التنبيه</Label>
              <Input dir="ltr" inputMode="numeric" className="text-left font-bold" value={minAlert}
                onChange={e => setMinAlert(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
            </div>
          </div>

          {selected.base_price ? (
            <p className="text-[10px] text-muted-foreground">السعر المرجعي في المركز: {formatIQD(selected.base_price)} د.ع (لا يُعرض للمشترين)</p>
          ) : null}

          <Button onClick={submitPool} disabled={isPending} className="font-bold">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ml-1" /> إضافة إلى المخزن</>}
          </Button>
        </div>
      )}

      {mode === "own" && (
        <div className="space-y-4 max-w-2xl">
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("search")}>العودة للبحث</Button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم المادة</Label>
              <Input value={ownName} onChange={e => setOwnName(e.target.value)} placeholder="مثال: صابون غسيل برتقالي 900غ" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وصف المادة</Label>
              <Input value={ownDescription} onChange={e => setOwnDescription(e.target.value)} placeholder="الوصف أو الحجم أو النوع" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الباركود (اختياري)</Label>
              <Input dir="ltr" className="text-left font-bold" value={ownBarcode}
                onChange={e => setOwnBarcode(e.target.value.replace(/[^\d]/g, ""))} placeholder="8/12/13/14 رقماً" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">وحدات البيع وأسعارها</Label>
            {ownUnits.map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="w-24 font-bold"
                  value={u.type}
                  onChange={e => setOwnUnits(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                  placeholder="الوحدة"
                />
                <Input
                  dir="ltr" inputMode="numeric" className="text-left font-bold"
                  value={u.price}
                  onChange={e => setOwnUnits(prev => prev.map((x, j) => j === i ? { ...x, price: e.target.value.replace(/[^\d]/g, "") } : x))}
                  placeholder="السعر"
                />
                {ownUnits.length > 1 && (
                  <button type="button" className="text-destructive text-xs font-bold px-1"
                    onClick={() => setOwnUnits(prev => prev.filter((_, j) => j !== i))}>✕</button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setOwnUnits(prev => [...prev, { type: "", price: "" }])}>
              <Plus className="w-3.5 h-3.5 ml-1" /> وحدة أخرى
            </Button>
          </div>

          {ownUnits.length > 1 && (
            <div className="space-y-2 rounded-xl border border-border/60 p-3 bg-muted/30">
              <Label className="text-xs">تحويلات الوحدات (اختياري) — مثال: 1 كارتون = 24 تكة</Label>
              {ownConversions.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-bold">
                  <span>1</span>
                  <Input className="w-20" value={c.from}
                    onChange={e => setOwnConversions(prev => prev.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} placeholder="كارتون" />
                  <span>=</span>
                  <Input dir="ltr" className="w-16 text-left" value={c.multiplier}
                    onChange={e => setOwnConversions(prev => prev.map((x, j) => j === i ? { ...x, multiplier: e.target.value.replace(/[^\d]/g, "") } : x))} placeholder="24" />
                  <Input className="w-20" value={c.to}
                    onChange={e => setOwnConversions(prev => prev.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} placeholder="تكة" />
                  <button type="button" className="text-destructive px-1"
                    onClick={() => setOwnConversions(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <Button variant="outline" size="sm"
                onClick={() => setOwnConversions(prev => [...prev, { from: "", to: "", multiplier: "" }])}>
                <Plus className="w-3.5 h-3.5 ml-1" /> إضافة تحويل
              </Button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">الرصيد</Label>
              <Input dir="ltr" inputMode="numeric" className="text-left font-bold" value={ownStockQty}
                onChange={e => setOwnStockQty(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وحدة الرصيد</Label>
              <select className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm font-bold"
                value={ownStockUnit} onChange={e => setOwnStockUnit(e.target.value)}>
                {ownUnits.filter(u => u.type.trim()).map(u => <option key={u.type} value={u.type}>{u.type}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">حد التنبيه</Label>
              <Input dir="ltr" inputMode="numeric" className="text-left font-bold" value={ownMinAlert}
                onChange={e => setOwnMinAlert(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">صورة المادة (اختياري)</Label>
            <Input type="file" accept="image/*" onChange={e => setOwnImage(e.target.files?.[0] ?? null)} className="text-xs" />
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl border border-brand-blue/25 bg-brand-blue/5">
            <span className="text-base leading-none mt-0.5">🌱</span>
            <div>
              <div className="text-xs font-black text-brand-blue dark:text-brand-blue">المادة تُسجَّل في الكتالوج المركزي</div>
              <div className="text-[10px] text-muted-foreground leading-5 mt-0.5">
                الكتالوج المركزي هو المكان الموحد لمواد التطبيق ويعلم كل شيء: تُرفع بيانات مادتك العامة
                (الاسم/الصورة/الوحدات/الباركود) بشارة «من تجار التطبيق»، وإن وجدنا مطابقاً بالباركود أو الاسم ربطنا بها تلقائياً دون ازدواج.
                الأسعار والرصيد وحدّ التنبيه تبقى خاصة بك وحدك ولا تُنشر.
              </div>
            </div>
          </div>

          <Button onClick={submitOwn} disabled={isPending} className="font-bold">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ml-1" /> إضافة إلى المخزن</>}
          </Button>
        </div>
      )}
    </div>
  )
}
