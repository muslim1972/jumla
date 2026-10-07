"use client"

import { useMemo, useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search, Plus, Package } from "lucide-react"
import { addOwnItemToWarehouse, addPoolItemToWarehouse } from "@/features/warehouse/actions"
import { formatIQD } from "@/features/warehouse/lib/helpers"
import type { PoolMasterProduct, Warehouse } from "@/features/warehouse/lib/types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouses: Warehouse[]
  pool: PoolMasterProduct[]
  /** المعرّفات المرتبطة مسبقاً — لمنع التكرار في الواجهة */
  linkedMasterIds: Set<string>
}

type Mode = "pool" | "own"

export function WarehouseAddItemDialog({ open, onOpenChange, warehouses, pool, linkedMasterIds }: Props) {
  const [mode, setMode] = useState<Mode>("pool")
  const [warehouseId, setWarehouseId] = useState(warehouses.find(w => w.is_default)?.id || warehouses[0]?.id || "")
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")
  const [okMsg, setOkMsg] = useState("")

  // —— بحث الـ Pool (بدون أي تأخير شبكة: البحث محلي على القائمة المحمّلة) ——
  const [query, setQuery] = useState("")
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return pool
      .filter(p => !linkedMasterIds.has(p.id))
      .filter(p => p.name.toLowerCase().includes(q) || (p.barcode || "").includes(q))
      .slice(0, 8)
  }, [query, pool, linkedMasterIds])

  const [selected, setSelected] = useState<PoolMasterProduct | null>(null)
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})
  const [stockQty, setStockQty] = useState("")
  const [stockUnit, setStockUnit] = useState("")
  const [minAlert, setMinAlert] = useState("")

  // —— نموذج الإدخال الحر ——
  const [ownName, setOwnName] = useState("")
  const [ownUnits, setOwnUnits] = useState<{ type: string; price: string }[]>([{ type: "تكة", price: "" }])
  const [ownConversions, setOwnConversions] = useState<{ from: string; to: string; multiplier: string }[]>([])
  const [ownStockQty, setOwnStockQty] = useState("")
  const [ownStockUnit, setOwnStockUnit] = useState("تكة")
  const [ownMinAlert, setOwnMinAlert] = useState("")
  const [ownImage, setOwnImage] = useState<File | null>(null)

  const reset = () => {
    setSelected(null); setQuery(""); setUnitPrices({}); setStockQty(""); setStockUnit(""); setMinAlert("")
    setOwnName(""); setOwnUnits([{ type: "تكة", price: "" }]); setOwnConversions([])
    setOwnStockQty(""); setOwnStockUnit("تكة"); setOwnMinAlert(""); setOwnImage(null)
    setErrorMsg(""); setOkMsg("")
  }

  const close = () => { onOpenChange(false); reset() }

  const pickMaster = (p: PoolMasterProduct) => {
    setSelected(p)
    const prefilled: Record<string, string> = {}
    for (const u of p.units) {
      prefilled[u.type] = p.base_price ? String(Math.round(p.base_price * u.multiplier_to_base)) : ""
    }
    setUnitPrices(prefilled)
    const first = p.units[0]?.type ?? ""
    setStockUnit(first)
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
      else { setOkMsg("أُضيفت المادة إلى المخزن ✓"); setTimeout(close, 700) }
    })
  }

  const submitOwn = () => {
    setErrorMsg("")
    if (!warehouseId) { setErrorMsg("اختر المخزن"); return }
    if (ownName.trim().length < 2) { setErrorMsg("اسم المادة قصير جداً"); return }
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
    fd.set("description", "")
    fd.set("units", JSON.stringify(units))
    fd.set("unit_conversions", JSON.stringify(conversions))
    fd.set("stock_quantity", ownStockQty || "0")
    fd.set("stock_unit", ownStockUnit || units[0].type)
    fd.set("min_stock_alert", ownMinAlert || "0")
    if (ownImage) fd.set("image", ownImage)

    startTransition(async () => {
      const res = await addOwnItemToWarehouse(fd)
      if (res?.error) setErrorMsg(res.error)
      else { setOkMsg("أُضيفت المادة الخاصة إلى المخزن ✓"); setTimeout(close, 700) }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close() }}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">إضافة مادة للمخزن</DialogTitle>
          <DialogDescription className="text-right">من مواد التطبيق (الكتالوج المركزي) أو إدخال حر لمادة خاصة</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "pool", label: "من مواد التطبيق" },
            { id: "own", label: "مادة خاصة (إدخالي)" },
          ] as const).map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setSelected(null); setQuery(""); setErrorMsg("") }}
              className={`p-2.5 rounded-xl border-2 font-bold text-xs transition-colors ${
                mode === m.id ? "border-brand-orange text-brand-orange bg-brand-orange/5" : "border-border text-muted-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">المخزن</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
          >
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.is_default ? " (الرئيسي)" : ""}</option>)}
          </select>
        </div>

        {errorMsg && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{errorMsg}</div>}
        {okMsg && <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-md font-bold">{okMsg}</div>}

        {mode === "pool" && !selected && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="ابحث بالاسم أو الباركود…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            {query.trim().length > 0 && results.length === 0 && (
              <div className="text-center p-4 rounded-lg border border-dashed border-border">
                <p className="text-xs text-muted-foreground mb-2">لا نتائج مطابقة — أضفها كمادة خاصة أو أنشئها في الكتالوج المركزي من تبويب «المنتجات والإعدادات»</p>
                <Button variant="outline" size="sm" onClick={() => setMode("own")}>
                  <Plus className="w-3.5 h-3.5 ml-1" /> إدخال كمادة خاصة
                </Button>
              </div>
            )}
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {results.map(p => (
                <button
                  key={p.id}
                  onClick={() => pickMaster(p)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border/70 hover:border-brand-orange/50 hover:bg-brand-orange/5 text-right transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {p.image_url
                      ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      : <Package className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.units.map(u => u.type).join(" · ")}{p.category_name ? ` — ${p.category_name}` : ""}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-brand-orange shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "pool" && selected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2.5 border border-border/60">
              <div className="font-black text-sm">{selected.name}</div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>تغيير</Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">أسعار البيع (د.ع) — مُقترحة من سعر المركز، عدّلها بحرية</Label>
              {selected.units.map(u => (
                <div key={u.type} className="flex items-center gap-2">
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
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5 col-span-1">
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
            <Button onClick={submitPool} disabled={isPending} className="w-full font-bold">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة إلى المخزن"}
            </Button>
          </div>
        )}

        {mode === "own" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم المادة</Label>
              <Input value={ownName} onChange={e => setOwnName(e.target.value)} placeholder="مثال: صابون غسيل برتقالي 900غ" />
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
              <div className="space-y-2 rounded-lg border border-border/60 p-2.5 bg-muted/30">
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

            <Button onClick={submitOwn} disabled={isPending} className="w-full font-bold">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة إلى المخزن"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
