"use client"

import { useMemo, useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, ArrowDownToLine, ArrowUpFromLine, Scale, Trash2, History, FileMinus, ShieldAlert } from "lucide-react"
import { recordWarehouseMovement, updateWarehouseItemPricing, deleteWarehouseItem, createWarehouseDeductionRequest } from "@/features/warehouse/actions"
import { baseToDisplay, displayToBase, formatIQD, statusLabel, statusColor, type StockStatus } from "@/features/warehouse/lib/helpers"
import { DEDUCTION_REASON_LABELS, type DeductionReasonType, type StaffMember, type WarehouseItem, type WarehouseMovement } from "@/features/warehouse/lib/types"

interface Props {
  item: WarehouseItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canPricing: boolean
  canWarehouse: boolean
  isStaff: boolean
  movements: WarehouseMovement[]
  staff?: StaffMember[]
  currentUserId?: string
}

type Tab = "prices" | "stock" | "deduct" | "history"

/** وحدة العرض الافتراضية لصنف: stock_unit إن وُجد وإلا أول وحدة */
function resolveDisplayUnit(product: WarehouseItem["product"]): string {
  const su = product?.stock_unit
  const us = (product?.units ?? []) as { type: string }[]
  if (su && us.some(u => u.type === su)) return su
  return us[0]?.type ?? ""
}

export function WarehouseItemDialog({ item, open, onOpenChange, canPricing, canWarehouse, isStaff, movements, staff = [], currentUserId }: Props) {
  // يُعاد تركيبه بالكامل لكل صنف (key في الأب) — كل الحقول تهيأ من خصائص الصنف مباشرة
  const [tab, setTab] = useState<Tab>("prices")
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")
  const [okMsg, setOkMsg] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)


  const product = item?.product ?? null
  const conversions = useMemo(() => product?.unit_conversions || [], [product])
  const units = useMemo(() => product?.units || [], [product])

  // وحدة العرض الافتراضية: stock_unit إن وُجد وإلا أول وحدة
  const defaultDisplayUnit = useMemo(() => {
    const su = product?.stock_unit
    if (su && units.some(u => u.type === su)) return su
    return units[0]?.type ?? ""
  }, [product?.stock_unit, units])

  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(((item?.product?.units ?? []) as { type: string; price: number }[]).map(u => [u.type, String(u.price ?? "")]))
  )
  const [minUnit, setMinUnit] = useState(() => resolveDisplayUnit(item?.product))
  const [minQty, setMinQty] = useState(() => String(baseToDisplay(item?.min_stock_alert || 0, resolveDisplayUnit(item?.product), item?.product?.unit_conversions || [])))
  const [moveKind, setMoveKind] = useState<"in" | "out" | "adjust">("in")
  const [moveQty, setMoveQty] = useState("")
  const [moveUnit, setMoveUnit] = useState(() => resolveDisplayUnit(item?.product))
  const [moveNote, setMoveNote] = useState("")

  // حالات تبويبة طرح من المخزن
  const [deductQty, setDeductQty] = useState("")
  const [deductUnit, setDeductUnit] = useState(() => resolveDisplayUnit(item?.product))
  const [deductReason, setDeductReason] = useState<DeductionReasonType>("damage")
  const [deductNotes, setDeductNotes] = useState("")
  const [witnessId, setWitnessId] = useState("")

  const otherWarehouseStaff = useMemo(() => {
    return (staff || []).filter(s => s.is_active && s.id !== currentUserId && s.permissions.includes("warehouse"))
  }, [staff, currentUserId])

  const applyDeductionRequest = () => {
    if (!item) return
    setErrorMsg(""); setOkMsg("")
    const qty = Number(deductQty)
    if (!Number.isFinite(qty) || qty <= 0) {
      setErrorMsg("أدخل كمية صحيحة أكبر من الصفر")
      return
    }
    if (otherWarehouseStaff.length > 0 && !witnessId) {
      setErrorMsg("اختر موظف مخزن كشاهد مؤيد للطلب")
      return
    }
    const fd = new FormData()
    fd.set("item_id", item.id)
    fd.set("quantity", String(qty))
    fd.set("unit", deductUnit)
    fd.set("reason_type", deductReason)
    fd.set("notes", deductNotes)
    if (witnessId) fd.set("witness_id", witnessId)

    startTransition(async () => {
      const res = await createWarehouseDeductionRequest(fd)
      if (!res.success) {
        setErrorMsg(res.error || "تعذر إرسال طلب الطرح")
      } else {
        setOkMsg("تم إرسال طلب الطرح بنجاح — بانتظار الاعتماد المزدوج قبل الخصم من الرصيد")
        setDeductQty("")
        setDeductNotes("")
        setWitnessId("")
      }
    })
  }

  const itemMovements = useMemo(
    () => movements.filter(m => m.product_id === item?.product_id).slice(0, 8),
    [movements, item?.product_id]
  )

  const status: StockStatus = item ? (
    item.quantity <= 0 ? "out"
    : item.min_stock_alert > 0 && item.quantity <= item.min_stock_alert ? "low"
    : item.min_stock_alert > 0 && item.quantity <= Math.ceil(item.min_stock_alert * 1.2) ? "near"
    : "ok"
  ) : "ok"

  if (!item || !product || !open) return null

  const savePrices = () => {
    setErrorMsg(""); setOkMsg("")
    const fd = new FormData()
    fd.set("item_id", item.id)
    fd.set("units", JSON.stringify(units.map(u => ({ type: u.type, price: Number(prices[u.type] || 0) }))))
    fd.set("min_stock_alert", minQty || "0")
    fd.set("min_unit", minUnit)
    startTransition(async () => {
      const res = await updateWarehouseItemPricing(fd)
      if (res?.error) setErrorMsg(res.error)
      else { setOkMsg("تم الحفظ — كل تغيير مسجَّل باسمك ووقته"); setTimeout(() => setOkMsg(""), 2500) }
    })
  }

  const applyMovement = () => {
    setErrorMsg(""); setOkMsg("")
    const qty = Number(moveQty)
    if (!Number.isFinite(qty) || qty < 0 || (moveKind !== "adjust" && qty <= 0)) {
      setErrorMsg("أدخل كمية صحيحة")
      return
    }
    startTransition(async () => {
      const res = await recordWarehouseMovement(item.id, moveKind, qty, moveUnit, moveNote)
      if (res?.error) setErrorMsg(res.error)
      else {
        setOkMsg("سُجِّلت الحركة"); setMoveQty(""); setMoveNote("")
        setTimeout(() => setOkMsg(""), 2500)
      }
    })
  }

  const doDelete = () => {
    setErrorMsg("")
    startTransition(async () => {
      const res = await deleteWarehouseItem(item.id)
      if (res?.error) setErrorMsg(res.error)
      else onOpenChange(false)
    })
  }

  const kindMeta: Record<string, { label: string; cls: string }> = {
    in: { label: "وارد", cls: "text-emerald-600 dark:text-emerald-400" },
    out: { label: "إخراج", cls: "text-red-600 dark:text-red-400" },
    adjust: { label: "تسوية جرد", cls: "text-amber-600 dark:text-amber-400" },
    order_deduction: { label: "خصم أمر بيع", cls: "text-brand-blue" },
    order_restore: { label: "استرجاع طلب", cls: "text-brand-blue" },
    shortage_return: { label: "إرجاع نقص تجهيز", cls: "text-amber-600 dark:text-amber-400" },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <span className="text-lg">{product.name}</span>
            {product.master_product_id && (
              <span className="text-[10px] font-bold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">🔗 مربوطة مركزياً</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-right">
            المخزون الحالي: <b>{formatIQD(baseToDisplay(item.quantity, defaultDisplayUnit, conversions))}</b> {defaultDisplayUnit}
            {" · "}الحد: <b>{formatIQD(baseToDisplay(item.min_stock_alert || 0, defaultDisplayUnit, conversions))}</b>
            {" · "}<span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${statusColor(status)}`}>{statusLabel(status)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* تبويبات البطاقة */}
        <div className="flex gap-1 border-b border-border/60 -mt-1 overflow-x-auto">
          {([
            { id: "prices", label: "الأسعار وحد التنبيه", show: canPricing, icon: Save },
            { id: "stock", label: "حركة مخزنية", show: canWarehouse, icon: ArrowDownToLine },
            { id: "deduct", label: "طرح من المخزن", show: canWarehouse, icon: FileMinus },
            { id: "history", label: "آخر الحركات", show: !isStaff, icon: History },
          ] as { id: Tab; label: string; show: boolean; icon: typeof Save }[])

            .filter(t => t.show)
            .map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                  tab === t.id ? "border-brand-orange text-brand-orange" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
        </div>

        {errorMsg && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{errorMsg}</div>}
        {okMsg && <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-md font-bold">{okMsg}</div>}

        {tab === "prices" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">أسعار البيع حسب الوحدة (د.ع)</Label>
              {units.map(u => (
                <div key={u.type} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2 border border-border/60">
                  <div className="w-24 shrink-0">
                    <div className="font-black text-sm">{u.type}</div>
                    {u.multiplier_to_base !== 1 && <div className="text-[10px] text-muted-foreground">×{u.multiplier_to_base} وحدة أساس</div>}
                  </div>
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    className="text-left font-bold"
                    value={prices[u.type] ?? ""}
                    onChange={e => setPrices(prev => ({ ...prev, [u.type]: e.target.value.replace(/[^\d]/g, "") }))}
                  />
                  <div className="text-[10px] text-muted-foreground shrink-0 w-28">
                    {u.multiplier_to_base > 1 && units.some(b => b.multiplier_to_base === 1) && (
                      <>≈ {formatIQD(Math.round((Number(prices[u.type] || 0) / u.multiplier_to_base)))} / {units.find(b => b.multiplier_to_base === 1)!.type}</>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">حد التنبيه — أقل كمية لإطلاق إنذار</Label>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  className="text-left font-bold"
                  value={minQty}
                  onChange={e => setMinQty(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">وحدة الحد</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
                  value={minUnit}
                  onChange={e => {
                    setMinUnit(e.target.value)
                    setMinQty(String(baseToDisplay(displayToBase(Number(minQty) || 0, minUnit, conversions), e.target.value, conversions)))
                  }}
                >
                  {units.map(u => <option key={u.type} value={u.type}>{u.type}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2">
              <Button onClick={savePrices} disabled={isPending} className="font-bold">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
                حفظ التعديلات
              </Button>
              {!isStaff && canWarehouse && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive font-bold">تصفير الرصيد وحذف البند؟</span>
                    <Button variant="destructive" size="sm" onClick={doDelete} disabled={isPending}>تأكيد الحذف</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>إلغاء</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="w-3.5 h-3.5 ml-1" /> حذف من المخزن
                  </Button>
                )
              )}
            </div>
          </div>
        )}

        {tab === "stock" && (
          <div className="space-y-4">
            {isStaff ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span>حركة الموظف المباشرة محصورة في الوارد (إضافة رصيد).</span>
                  <div className="text-[11px] font-normal text-muted-foreground mt-0.5">
                    لطرح أو إتلاف بضاعة يرجى الانتقال إلى تبويبة «طرح من المخزن» لطلب اعتماد التاجر وتأييد الزميل.
                  </div>
                </div>
              </div>
            ) : null}

            <div className={`grid gap-2 ${isStaff ? "grid-cols-1" : "grid-cols-3"}`}>
              {([
                { id: "in", label: "وارد (إضافة)", icon: ArrowDownToLine, show: true },
                { id: "out", label: "إخراج", icon: ArrowUpFromLine, show: !isStaff },
                { id: "adjust", label: "تسوية جرد", icon: Scale, show: !isStaff },
              ] as const)
                .filter(k => k.show)
                .map(k => (
                  <button
                    key={k.id}
                    onClick={() => setMoveKind(k.id as any)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 font-bold text-xs transition-colors ${
                      moveKind === k.id ? "border-brand-orange text-brand-orange bg-brand-orange/5" : "border-border text-muted-foreground hover:border-border"
                    }`}
                  >
                    <k.icon className="w-4 h-4" />
                    {k.label}
                  </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {moveKind === "adjust" ? "الكمية الصحيحة الجديدة" : "الكمية"}
                </Label>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  className="text-left font-bold"
                  value={moveQty}
                  onChange={e => setMoveQty(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={moveKind === "adjust" ? String(baseToDisplay(item.quantity, moveUnit, conversions)) : "0"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الوحدة</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
                  value={moveUnit}
                  onChange={e => setMoveUnit(e.target.value)}
                >
                  {units.map(u => <option key={u.type} value={u.type}>{u.type}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ملاحظة (تظهر في دفتر الحركات)</Label>
              <Input value={moveNote} onChange={e => setMoveNote(e.target.value)} placeholder="مثال: توريد شركة الزيتون" />
            </div>

            <Button onClick={applyMovement} disabled={isPending} className="font-bold">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسجيل الحركة"}
            </Button>
          </div>
        )}

        {tab === "deduct" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-xs space-y-1">
              <div className="font-bold text-destructive flex items-center gap-1.5">
                <FileMinus className="w-4 h-4" />
                <span>طلب طرح أو إتلاف معتمد من المخزن</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-5">
                يُخصم الرصيد تلقائياً بعد استكمال الاعتماد الثنائي المطلوب (تأييد الزميل الشاهد إن وجد + اعتماد التاجر صاحب المتجر).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">الكمية المراد طرحها</Label>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  className="text-left font-bold"
                  value={deductQty}
                  onChange={e => setDeductQty(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">الوحدة</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
                  value={deductUnit}
                  onChange={e => setDeductUnit(e.target.value)}
                >
                  {units.map(u => <option key={u.type} value={u.type}>{u.type}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">سبب الطرح</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
                value={deductReason}
                onChange={e => setDeductReason(e.target.value as DeductionReasonType)}
              >
                {(Object.entries(DEDUCTION_REASON_LABELS) as [DeductionReasonType, { label: string; icon: string }][]).map(([val, meta]) => (
                  <option key={val} value={val}>{meta.icon} {meta.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تفاصيل / بيان سبب الطرح</Label>
              <Input
                value={deductNotes}
                onChange={e => setDeductNotes(e.target.value)}
                placeholder="مثال: تلف أثناء النقل، بيع نقدي مباشر بدون وصل، عجز في الجرد..."
              />
            </div>

            {/* الموظف الشاهد المؤيّد */}
            {otherWarehouseStaff.length > 0 ? (
              <div className="space-y-1.5 p-3 rounded-xl border border-border/80 bg-muted/30">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <span>الموظف الشاهد المؤيّد (إلزامي)</span>
                </Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
                  value={witnessId}
                  onChange={e => setWitnessId(e.target.value)}
                >
                  <option value="">-- اختر موظف المخزن الشاهد من الكادر --</option>
                  {otherWarehouseStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name || s.username}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  👥 سيصل إشعار لزميلك لتأييد الواقعة + إشعار للتاجر للاعتماد النهائي.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 text-xs text-brand-blue font-bold flex items-center gap-2">
                <span>ℹ️</span>
                <span>لا يوجد موظف مخزن آخر حالياً — سيُرسل الطلب مباشرة إلى صاحب المتجر (التاجر الأصلي) للاعتماد.</span>
              </div>
            )}

            <Button onClick={applyDeductionRequest} disabled={isPending} className="w-full font-bold bg-destructive hover:bg-destructive/90 text-white">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileMinus className="w-4 h-4 ml-1" /> إرسال طلب الطرح للاعتماد</>}
            </Button>
          </div>
        )}


        {tab === "history" && (
          <div className="space-y-3">
            {itemMovements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">لا حركات مسجلة لهذا الصنف بعد</p>
            ) : (
              itemMovements.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className={`text-xs font-black shrink-0 w-24 ${kindMeta[m.kind]?.cls ?? ""}`}>
                    {kindMeta[m.kind]?.label ?? m.kind}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold">
                      {m.quantity > 0 ? "+" : ""}{formatIQD(m.quantity)} <span className="text-muted-foreground">← الرصيد {formatIQD(m.balance_after)}</span>
                    </div>
                    {m.note && <div className="text-[11px] text-muted-foreground truncate">{m.note}</div>}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {m.performed_by_name || "النظام"} · {new Date(m.created_at).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
