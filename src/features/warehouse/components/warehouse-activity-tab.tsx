"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { getMerchantActivity } from "@/features/warehouse/activity-actions"
import type { MerchantActivityRow } from "@/features/warehouse/lib/types"

const TABLE_LABELS: Record<string, { label: string; icon: string; fields: Record<string, string> }> = {
  products: {
    label: "المنتجات",
    icon: "💲",
    fields: { units: "أسعار الوحدات", price: "السعر", min_stock_alert: "حد التنبيه", stock_quantity: "الكمية", name: "الاسم", description: "الوصف", category_id: "القسم" },
  },
  warehouse_items: {
    label: "بنود المخازن",
    icon: "📦",
    fields: { quantity: "الكمية", min_stock_alert: "حد التنبيه" },
  },
  warehouses: { label: "المخازن", icon: "🏬", fields: { name: "الاسم", location_note: "الموقع" } },
  picking_lists: { label: "قوائم التجهيز", icon: "📋", fields: { status: "الحالة", picker_name: "عامل التجهيز" } },
  profiles: { label: "الفريق والصلاحيات", icon: "👥", fields: { permissions: "الصلاحيات", is_active: "الحالة", full_name: "الاسم", role: "الدور" } },
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (Array.isArray(v)) return `${v.length} عنصر`
  if (typeof v === "object") return "{…}"
  if (typeof v === "boolean") return v ? "نعم" : "لا"
  return String(v)
}

export function WarehouseActivityTab() {
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<MerchantActivityRow[] | null>(null)
  const [error, setError] = useState("")
  const [tableFilter, setTableFilter] = useState("all")

  useEffect(() => {
    startTransition(async () => {
      const res = await getMerchantActivity()
      if (res?.error) setError(res.error)
      else setRows(res.rows || [])
    })
  }, [])

  const filtered = (rows || []).filter(r => tableFilter === "all" || TABLE_LABELS[r.table_name])

  const tablesPresent = [...new Set((rows || []).map(r => r.table_name).filter(t => TABLE_LABELS[t]))]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          كل تعديل على أي حقل: القيمة السابقة واللاحقة، اسم من نفّذها، والتوقيت — سجل غير قابل للتعديل أو الحذف
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <FilterChip active={tableFilter === "all"} onClick={() => setTableFilter("all")} label="الكل" />
        {tablesPresent.map(t => (
          <FilterChip
            key={t}
            active={tableFilter === t}
            onClick={() => setTableFilter(t)}
            label={`${TABLE_LABELS[t].icon} ${TABLE_LABELS[t].label}`}
          />
        ))}
      </div>

      {error && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{error}</div>}
      {isPending && (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      )}
      {!isPending && !error && rows && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-8">لا سجلات بعد — ستظهر هنا كل التعديلات القادمة على موادك ومخازنك وفريقك</p>
      )}

      <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
        {filtered.slice(0, 120).map(r => {
          const meta = TABLE_LABELS[r.table_name]
          const changedFields = Object.keys(meta?.fields || {}).filter(f => {
            if (!meta) return false
            const oldV = r.old_data?.[f]
            const newV = r.new_data?.[f]
            return JSON.stringify(oldV) !== JSON.stringify(newV)
          })
          return (
            <div key={r.id} className="flex items-start gap-3 p-3">
              <span className="text-base shrink-0">{meta?.icon ?? "•"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-5">
                  <b className="text-brand-orange">{r.changed_by_name || "النظام"}</b>
                  {" "}
                  {r.action === "UPDATE" && <>عدّل {meta ? meta.fields[changedFields[0]] || "بيانات" : "بيانات"} {changedFields.length > 1 ? `و${changedFields.length - 1} حقولاً أخرى` : ""} في {meta?.label ?? r.table_name}</>}
                  {r.action === "INSERT" && <>أضاف سجلاً في {meta?.label ?? r.table_name}</>}
                  {r.action === "DELETE" && <>حذف سجلاً من {meta?.label ?? r.table_name}</>}
                </div>
                {r.action === "UPDATE" && changedFields[0] && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] font-black">
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 line-through">{fmtValue(r.old_data?.[changedFields[0]])}</span>
                    <span className="text-muted-foreground">←</span>
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded px-1.5 py-0.5">{fmtValue(r.new_data?.[changedFields[0]])}</span>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
        active ? "bg-brand-orange/10 text-brand-orange border-brand-orange/40" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}
