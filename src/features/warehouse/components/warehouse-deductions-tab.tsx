"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, FileMinus, ShieldCheck, UserCheck, MessageSquare } from "lucide-react"
import { decideWarehouseDeduction } from "@/features/warehouse/actions"
import { DEDUCTION_REASON_LABELS, type WarehouseDeductionRequest } from "@/features/warehouse/lib/types"

interface Props {
  requests: WarehouseDeductionRequest[]
  currentUserId: string
  isMerchant: boolean
}

type Filter = "all" | "pending" | "approved" | "rejected"

export function WarehouseDeductionsTab({ requests, currentUserId, isMerchant }: Props) {
  const [filter, setFilter] = useState<Filter>("all")
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState("")
  const [actionOk, setActionOk] = useState("")
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [rejectNotePromptId, setRejectNotePromptId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")

  const filtered = useMemo(() => {
    // إخفاء الطلبات المكتملة (المعتمدة أو المرفوضة) من العرض الافتراضي (الكل)
    if (filter === "all") return requests.filter(r => r.status === "pending")
    if (filter === "pending") return requests.filter(r => r.status === "pending")
    if (filter === "approved") return requests.filter(r => r.status === "approved")
    if (filter === "rejected") return requests.filter(r => r.status === "rejected")
    return requests
  }, [requests, filter])

  const pendingCountForMe = useMemo(() => {
    return requests.filter(r => {
      if (r.status !== "pending") return false
      if (isMerchant && r.merchant_status === "pending") return true
      if (r.witness_id === currentUserId && r.witness_status === "pending") return true
      return false
    }).length
  }, [requests, isMerchant, currentUserId])

  const handleDecision = (requestId: string, decision: "approve" | "reject", note?: string) => {
    setActionError("")
    setActionOk("")
    setActiveActionId(requestId)
    startTransition(async () => {
      const res = await decideWarehouseDeduction(requestId, decision, note)
      setActiveActionId(null)
      setRejectNotePromptId(null)
      setRejectNote("")
      if (!res.success) {
        setActionError(res.error || "تعذر إكمال العملية")
      } else {
        setActionOk(res.message || "تمت معالجة القرار بنجاح")
      }
    })
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError("")} className="text-xs hover:underline">إغلاق</button>
        </div>
      )}
      {actionOk && (
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionOk}</span>
          </div>
          <button onClick={() => setActionOk("")} className="text-xs hover:underline">إغلاق</button>
        </div>
      )}

      {/* شريط الإحصاء والتوجيه */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-brand-orange/20 bg-brand-orange/5 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
            <FileMinus className="w-4 h-4" />
          </div>
          <div>
            <div className="font-black text-sm">سجل وموافقات الطرح المخزني</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              نظام الرقابة المزدوجة لحماية المخزون من العجز أو الإتلاف دون اعتماد ثنائي موثق.
            </div>
          </div>
        </div>

        {pendingCountForMe > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-orange text-white text-xs font-bold self-start sm:self-auto shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            <span>لديك {pendingCountForMe} طلبات تنتظر توقيعك</span>
          </div>
        )}
      </div>

      {/* فلاتر الحالة */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([
          { id: "all", label: `النشطة (${requests.filter(r => r.status === "pending").length})` },
          { id: "approved", label: `المعتمدة (${requests.filter(r => r.status === "approved").length})` },
          { id: "rejected", label: `المرفوضة (${requests.filter(r => r.status === "rejected").length})` },
        ] as { id: Filter; label: string }[]).map(btn => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
              filter === btn.id
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* قائمة الطلبات */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border p-6 space-y-2">
          <FileMinus className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-bold">لا توجد طلبات طرح مخزني في هذا القسم حالياً</p>
        </div>
      ) : filter === "all" || filter === "pending" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(req => {
            const reasonMeta = DEDUCTION_REASON_LABELS[req.reason_type] || { label: req.reason_type, icon: "📌" }
            const isWitnessForThis = req.witness_id === currentUserId
            const canWitnessAct = isWitnessForThis && req.witness_status === "pending" && req.status === "pending"
            const canMerchantAct = isMerchant && req.merchant_status === "pending" && req.status === "pending"
            const isActing = activeActionId === req.id && isPending

            return (
              <div key={req.id} className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                {/* رأس الطلب: اسم المادة والكمية */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-sm">{req.product_name || "مادة"}</h3>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {req.warehouse_name || "المخزن"} · طالب الطرح: <span className="font-bold text-foreground">{req.requested_by_name}</span>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-sm font-black text-destructive">
                      -{req.quantity} {req.unit}
                    </span>
                    <div className="text-[10px] text-muted-foreground" dir="ltr">
                      {new Date(req.created_at).toLocaleDateString("ar-IQ", { dateStyle: "short" })}
                    </div>
                  </div>
                </div>

                {/* سبب الطرح وملاحظة الموظف */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span>{reasonMeta.icon}</span>
                    <span>{reasonMeta.label}</span>
                  </div>
                  {req.notes && (
                    <p className="text-[11px] text-muted-foreground leading-5">
                      «{req.notes}»
                    </p>
                  )}
                </div>

                {/* مسار الاعتماد الثنائي (الشاهد والتاجر) */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* مسار الشاهد */}
                  <div className="p-2 rounded-xl border border-border/50 bg-background/60 space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground font-bold">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>تأييد الزميل</span>
                    </div>
                    <div>
                      {req.witness_status === "not_required" ? (
                        <span className="text-muted-foreground font-bold">غير مطلوب (موظف وحيد)</span>
                      ) : req.witness_status === "approved" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> مؤيّد ({req.witness_name})
                        </span>
                      ) : req.witness_status === "rejected" ? (
                        <span className="text-destructive font-black flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> مرفوض ({req.witness_name})
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> بانتظار ({req.witness_name})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* مسار التاجر */}
                  <div className="p-2 rounded-xl border border-border/50 bg-background/60 space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>اعتماد التاجر</span>
                    </div>
                    <div>
                      {req.merchant_status === "approved" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> معتمد رسمياً
                        </span>
                      ) : req.merchant_status === "rejected" ? (
                        <span className="text-destructive font-black flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> مرفوض
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> بانتظار التاجر
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* الحالة العامة */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>الحالة:</span>
                    {req.status === "approved" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">تم الطرح والخصم من الرصيد</span>
                    ) : req.status === "rejected" ? (
                      <span className="text-destructive font-black">مرفوض ملغى</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">قيد المراجعة والمطابقة</span>
                    )}
                  </div>
                </div>

                {/* أزرار الإجراء التفاعلية */}
                {(canWitnessAct || canMerchantAct) && (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    {rejectNotePromptId === req.id ? (
                      <div className="space-y-2 bg-destructive/5 p-2.5 rounded-xl border border-destructive/20">
                        <Input
                          placeholder="سبب الرفض (اختياري)..."
                          value={rejectNote}
                          onChange={e => setRejectNote(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs font-bold flex-1"
                            disabled={isActing}
                            onClick={() => handleDecision(req.id, "reject", rejectNote)}
                          >
                            {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : "تأكيد الرفض"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => { setRejectNotePromptId(null); setRejectNote("") }}
                          >
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                          disabled={isActing}
                          onClick={() => handleDecision(req.id, "approve")}
                        >
                          {isActing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : canMerchantAct ? (
                            <><CheckCircle2 className="w-3.5 h-3.5 ml-1" /> اعتماد وطرح فوري</>
                          ) : (
                            <><CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تأييد الطلب كشاهد</>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
                          disabled={isActing}
                          onClick={() => setRejectNotePromptId(req.id)}
                        >
                          <XCircle className="w-3.5 h-3.5 ml-1" /> رفض
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-3 font-bold">المادة</th>
                  <th className="p-3 font-bold">الكمية</th>
                  <th className="p-3 font-bold">السبب</th>
                  <th className="p-3 font-bold">طالب الطرح</th>
                  <th className="p-3 font-bold">التاريخ</th>
                  <th className="p-3 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(req => {
                  const reasonMeta = DEDUCTION_REASON_LABELS[req.reason_type] || { label: req.reason_type, icon: "📌" }
                  return (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-black">{req.product_name || "مادة"}</td>
                      <td className="p-3 font-bold text-destructive" dir="ltr">-{req.quantity} {req.unit}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span>{reasonMeta.icon}</span>
                          <span className="font-bold">{reasonMeta.label}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold">{req.requested_by_name}</td>
                      <td className="p-3 text-muted-foreground" dir="ltr">
                        {new Date(req.created_at).toLocaleDateString("ar-IQ", { dateStyle: "short" })}
                      </td>
                      <td className="p-3">
                        {req.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black">
                            <CheckCircle2 className="w-3 h-3" /> معتمد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive font-black">
                            <XCircle className="w-3 h-3" /> مرفوض
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
