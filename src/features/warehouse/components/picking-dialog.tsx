"use client"

import { useEffect, useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Printer, ClipboardList, UserCheck, CheckCircle2, XCircle, Handshake } from "lucide-react"
import { getPickingListByOrder, assignPicker, confirmPicking, cancelPickingList } from "@/features/warehouse/picking/actions"
import type { PickingList, StaffMember } from "@/features/warehouse/lib/types"

interface Props {
  orderId: string | null
  invoiceNumber: number | null
  storeName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** الموظفون المتاح تعيينهم عمال تجهيز (بصلاحية picking) */
  pickers: StaffMember[]
  canManage: boolean   // التاجر أو موظف مخازن/مبيعات
  canPick: boolean     // يمكنه تأكيد الجمع (عامل معيَّن أو موظف مخازن أو التاجر)
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  issued: { label: "صادرة — بانتظار الجمع", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  picked: { label: "جُمعت — بانتظار تسليم المندوب", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  handed_over: { label: "سُلّمت للمندوب", cls: "bg-brand-blue/10 text-brand-blue" },
  cancelled: { label: "ملغاة", cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
}

export function PickingDialog({ orderId, invoiceNumber, storeName, open, onOpenChange, pickers, canManage, canPick }: Props) {
  // يُعاد تركيبه بالكامل لكل أمر بيع (key في الأب) — التحميل حالة أولية لا أثر للـ effect
  const [list, setList] = useState<PickingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [confirmQty, setConfirmQty] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open || !orderId) return
    let cancelled = false
    getPickingListByOrder(orderId).then(res => {
      if (cancelled) return
      if (res?.error) setError(res.error)
      else if (res?.list) {
        setList(res.list as PickingList)
        const init: Record<string, string> = {}
        for (const it of res.list.items || []) init[it.id] = String(it.confirmed_quantity ?? it.ordered_quantity)
        setConfirmQty(init)
        setReasons({})
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, orderId])

  const shortages = (list?.items || []).filter(it => {
    const q = parseInt(confirmQty[it.id] ?? String(it.ordered_quantity), 10)
    return Number.isFinite(q) && q < it.ordered_quantity
  })

  const doAssign = (pickerId: string) => {
    if (!list) return
    setError("")
    startTransition(async () => {
      const res = await assignPicker(list.id, pickerId)
      if (res?.error) setError(res.error)
      else {
        const picker = pickers.find(p => p.id === pickerId)
        setList(prev => prev ? { ...prev, picker_id: pickerId, picker_name: picker?.full_name ?? null } : prev)
      }
    })
  }

  const doConfirmPick = () => {
    if (!list) return
    setError("")
    startTransition(async () => {
      const confirmations = (list.items || []).map(it => ({
        item_id: it.id,
        confirmed_quantity: parseInt(confirmQty[it.id] ?? String(it.ordered_quantity), 10) || 0,
        shortage_reason: reasons[it.id] || null,
      }))
      const res = await confirmPicking(list.id, confirmations)
      if (res?.error) setError(res.error)
      else {
        setList(prev => prev ? { ...prev, status: "picked", picked_at: new Date().toISOString() } : prev)
      }
    })
  }

  const doCancel = () => {
    if (!list) return
    if (!confirm("إلغاء القائمة وإعادة الطلب إلى «بانتظار الموافقة»؟")) return
    setError("")
    startTransition(async () => {
      const res = await cancelPickingList(list.id)
      if (res?.error) setError(res.error)
      else onOpenChange(false)
    })
  }

  const printList = () => {
    if (!list) return
    const rows = (list.items || []).map(it => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${it.product_name} <span style="color:#888;font-size:11px;">(${it.unit_type})</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">${it.ordered_quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${it.confirmed_quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:${it.shortage_quantity > 0 ? "#dc2626" : "#111"};">${it.shortage_quantity || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left;font-size:11px;">${it.shortage_reason || "—"}</td>
      </tr>`).join("")

    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<title>قائمة تجهيز #${invoiceNumber ?? ""}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>body{font-family:Cairo,sans-serif;background:#f8f9fa;margin:0;padding:20px;color:#111}
.box{max-width:640px;margin:0 auto;background:#fff;padding:28px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,.05)}
h1{color:#e85d26;font-size:22px;margin:0 0 4px}
.meta{color:#666;font-size:12px;margin-bottom:18px;border-bottom:2px dashed #eee;padding-bottom:14px}
.acc{background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
.acc b{color:#312e81}
table{width:100%;border-collapse:collapse}th{background:#f8f9fa;font-size:12px;border-bottom:2px solid #eee}
th,td{padding:8px 10px}.foot{margin-top:18px;font-size:11px;color:#888;text-align:center}</style></head>
<body><div class="box">
<h1>جُملتي — قائمة تجهيز</h1>
<div class="meta">أمر البيع: #${invoiceNumber ?? ""} · المتجر: ${storeName ?? ""} · صدرت: ${list.issued_at ? new Date(list.issued_at).toLocaleString("ar-IQ") : "—"} · أصدرها: ${list.issued_by_name || "—"}</div>
<div class="acc">⚖️ عامل التجهيز المسؤول: <b>${list.picker_name || "لم يُعيَّن بعد"}</b> — يُحمَّل مسؤولية أي نقص يُكتشف عند تسليم القائمة للمندوب (${list.handed_over_name ? `استلمها المندوب: ${list.handed_over_name}` : "لم تُسلَّم بعد"}).</div>
<table><thead><tr><th style="text-align:right">المادة</th><th>المطلوب</th><th>المؤكد</th><th>النقص</th><th style="text-align:left">السبب</th></tr></thead><tbody>${rows}</tbody></table>
<div class="foot">توقيع عامل التجهيز: .................... · توقيع المندوب المستلم: ....................</div>
<div style="text-align:center;margin-top:18px"><button onclick="window.print()" style="background:#e85d26;color:#fff;border:none;padding:10px 32px;border-radius:8px;font-family:Cairo;font-size:14px;font-weight:700;cursor:pointer">🖨️ طباعة</button></div>
</div></body></html>`

    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, "_blank")
    if (w) setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const badge = list ? STATUS_BADGE[list.status] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <ClipboardList className="w-5 h-5 text-brand-orange shrink-0" />
            قائمة تجهيز — أمر بيع #{invoiceNumber ?? "—"}
          </DialogTitle>
          <DialogDescription className="text-right">
            {storeName}
            {badge && <span className={`inline-block mr-2 px-2 py-0.5 rounded-full text-[10px] font-black ${badge.cls}`}>{badge.label}</span>}
          </DialogDescription>
        </DialogHeader>

        {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}

        {!loading && error && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{error}</div>}

        {!loading && list && (
          <div className="space-y-4">
            {/* خط المسؤولية */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-[11px] font-bold leading-5">
              <div>📄 أصدرها: <b>{list.issued_by_name || "—"}</b> {list.issued_at ? `· ${new Date(list.issued_at).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}` : ""}</div>
              <div>👤 عامل التجهيز: <b className={list.picker_name ? "" : "text-red-600 dark:text-red-400"}>{list.picker_name || "لم يُعيَّن"}</b></div>
              {list.picked_at && <div>✅ جُمعت: {new Date(list.picked_at).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}</div>}
              {list.handed_over_name && <div>🚚 استلمها المندوب: <b>{list.handed_over_name}</b> · {new Date(list.handed_over_at!).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}</div>}
              <div className="text-muted-foreground">⚖️ يُحمَّل عامل التجهيز المسؤولية عن أي نقص يُكتشف عند التسليم للمندوب.</div>
            </div>

            {/* تعيين عامل التجهيز */}
            {canManage && list.status === "issued" && (
              <div className="space-y-1.5">
                <div className="text-xs font-black flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> تعيين عامل التجهيز</div>
                {pickers.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">لا يوجد موظفون بصلاحية «التجهيز» — أضف موظفاً من تبويب المخازن ← فريق العمل</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {pickers.map(p => (
                      <button
                        key={p.id}
                        disabled={isPending}
                        onClick={() => doAssign(p.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                          list.picker_id === p.id
                            ? "bg-brand-orange/10 text-brand-orange border-brand-orange/50"
                            : "border-border text-muted-foreground hover:border-brand-orange/40"
                        }`}
                      >
                        {p.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* بنود القائمة */}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b border-border">
                    <th className="text-right p-2.5 font-bold">المادة</th>
                    <th className="text-center p-2.5 font-bold">المطلوب</th>
                    <th className="text-center p-2.5 font-bold">المؤكد</th>
                    <th className="text-center p-2.5 font-bold">النقص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(list.items || []).map(it => {
                    const confirmed = parseInt(confirmQty[it.id] ?? String(it.ordered_quantity), 10)
                    const shortage = Number.isFinite(confirmed) ? Math.max(0, it.ordered_quantity - confirmed) : 0
                    const editable = list.status === "issued" && (canPick || (canManage && true))
                    return (
                      <tr key={it.id} className={shortage > 0 ? "bg-red-500/5" : ""}>
                        <td className="p-2.5 font-bold">{it.product_name} <span className="text-[10px] text-muted-foreground">({it.unit_type})</span></td>
                        <td className="text-center p-2.5 font-black tabular-nums">{it.ordered_quantity}</td>
                        <td className="text-center p-1.5">
                          {editable ? (
                            <Input
                              dir="ltr" inputMode="numeric"
                              className="w-14 text-center h-7 text-xs font-black mx-auto"
                              value={confirmQty[it.id] ?? String(it.ordered_quantity)}
                              onChange={e => setConfirmQty(prev => ({ ...prev, [it.id]: e.target.value.replace(/[^\d]/g, "") }))}
                            />
                          ) : (
                            <span className="font-black tabular-nums">{it.confirmed_quantity}</span>
                          )}
                        </td>
                        <td className={`text-center p-2.5 font-black tabular-nums ${shortage > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                          {shortage || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* أسباب النقص */}
            {list.status === "issued" && shortages.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-black text-red-600 dark:text-red-400">⚠ سجّل سبب النقص لكل بند (يُوثَّق باسم عامل التجهيز)</div>
                {shortages.map(it => (
                  <div key={it.id} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold w-32 truncate">{it.product_name}</span>
                    <Input
                      className="flex-1 h-8 text-xs"
                      placeholder="مثال: الكمية غير متوفرة في المخزن"
                      value={reasons[it.id] ?? ""}
                      onChange={e => setReasons(prev => ({ ...prev, [it.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* الإجراءات */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              <Button variant="outline" size="sm" className="font-bold" onClick={printList}>
                <Printer className="w-3.5 h-3.5 ml-1" /> طباعة القائمة
              </Button>
              {list.status === "issued" && canManage && (
                <>
                  <Button size="sm" className="font-bold" disabled={isPending} onClick={doConfirmPick}>
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تأكيد اكتمال الجمع</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive font-bold" disabled={isPending} onClick={doCancel}>
                    <XCircle className="w-3.5 h-3.5 ml-1" /> إلغاء القائمة
                  </Button>
                </>
              )}
              {list.status === "picked" && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Handshake className="w-4 h-4" />
                  بانتظار استلام المندوب للقائمة — سيُثبَّت اسمه ووقت الاستلام، ثم يظهر الطلب في «بانتظار المندوب»
                </div>
              )}
              {list.status === "handed_over" && (
                <div className="text-[11px] font-bold text-brand-blue">
                  سُلّمت للمندوب: {list.handed_over_name} — من هنا فصاعداً أي نقص يُحمَّل لعامل التجهيز: {list.picker_name || "—"}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
