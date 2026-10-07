"use client"

import { useMemo, useState } from "react"
import { formatIQD } from "@/features/warehouse/lib/helpers"
import type { WarehouseMovement } from "@/features/warehouse/lib/types"

const KIND_META: Record<string, { label: string; badge: string }> = {
  in: { label: "وارد", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  out: { label: "إخراج", badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
  adjust: { label: "تسوية جرد", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  order_deduction: { label: "خصم أمر بيع", badge: "bg-brand-blue/10 text-brand-blue" },
  order_restore: { label: "استرجاع طلب", badge: "bg-brand-blue/10 text-brand-blue" },
  shortage_return: { label: "إرجاع نقص تجهيز", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
}

interface Props {
  movements: WarehouseMovement[]
  productNames: Map<string, { name: string; baseUnit: string }>
}

export function WarehouseMovementsTab({ movements, productNames }: Props) {
  const [kindFilter, setKindFilter] = useState<string>("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return movements.filter(m => {
      if (kindFilter !== "all" && m.kind !== kindFilter) return false
      if (!q) return true
      const name = productNames.get(m.product_id)?.name?.toLowerCase() || ""
      return name.includes(q) || (m.note || "").toLowerCase().includes(q)
    })
  }, [movements, kindFilter, query, productNames])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-bold"
            placeholder="ابحث باسم المادة أو الملاحظة…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <FilterChip active={kindFilter === "all"} onClick={() => setKindFilter("all")} label="الكل" />
          {Object.entries(KIND_META).map(([k, meta]) => (
            <FilterChip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)} label={meta.label} />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">لا حركات مطابقة</p>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
          {filtered.slice(0, 120).map(m => {
            const meta = KIND_META[m.kind] ?? { label: m.kind, badge: "bg-muted text-muted-foreground" }
            const info = productNames.get(m.product_id)
            return (
              <div key={m.id} className="flex items-start gap-3 p-3">
                <span className={`text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${meta.badge}`}>{meta.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{info?.name ?? "مادة"}</div>
                  {m.note && <div className="text-[11px] text-muted-foreground mt-0.5">{m.note}</div>}
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {m.performed_by_name || "النظام"} · {new Date(m.created_at).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <div className={`text-xs font-black ${m.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {m.quantity > 0 ? "+" : ""}{formatIQD(m.quantity)} {info?.baseUnit ?? ""}
                  </div>
                  <div className="text-[10px] text-muted-foreground">الرصيد {formatIQD(m.balance_after)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
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
