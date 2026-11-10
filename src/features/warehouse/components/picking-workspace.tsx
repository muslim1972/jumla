"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Clock, PackageCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PickingDialog } from "@/features/warehouse/components/picking-dialog"
import type { AssignedPickingSummary } from "@/features/warehouse/lib/types"

interface Props {
  initialLists: AssignedPickingSummary[]
  currentUserId: string
  initialOrderId: string | null
  notice: string | null
}

function formatIssuedAt(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Baghdad",
  }).format(date)
}

function formatInvoiceNumber(value: number | null) {
  return value == null ? "—" : String(value).padStart(5, "0")
}

export function PickingWorkspace({ initialLists, currentUserId, initialOrderId, notice }: Props) {
  const router = useRouter()
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId)
  const selectedList = initialLists.find(list => list.order_id === selectedOrderId) ?? null

  useEffect(() => {
    if (initialOrderId) router.replace("/dashboard/picking", { scroll: false })
  }, [initialOrderId, router])

  return (
    <div className="container mx-auto max-w-4xl px-3 py-5 sm:px-4">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
          <ClipboardList className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-black">قوائم التجهيز المعيّنة لك</h1>
          <p className="text-xs text-muted-foreground">تظهر هنا القوائم المسندة إلى حسابك فقط.</p>
        </div>
      </header>

      {notice && (
        <div role="status" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-bold text-amber-700 dark:text-amber-300">
          {notice}
        </div>
      )}

      {initialLists.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <PackageCheck className="mx-auto mb-2 size-7 text-muted-foreground" />
          <p className="font-bold">لا توجد قائمة تجهيز معيّنة لك حالياً.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initialLists.map(list => (
            <article key={list.order_id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-black">{list.store_name || "متجر المشتري"}</h2>
                  <p className="mt-1 text-xs font-bold text-brand-blue">
                    قائمة رقم #{formatInvoiceNumber(list.invoice_number)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                  list.status === "issued"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                }`}>
                  {list.status === "issued" ? "بانتظار الجمع" : "تم الجمع"}
                </span>
              </div>
              <div className="my-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="size-3.5" />
                <span>{formatIssuedAt(list.issued_at)}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full font-bold"
                onClick={() => setSelectedOrderId(list.order_id)}
              >
                فتح قائمة التجهيز
              </Button>
            </article>
          ))}
        </div>
      )}

      <PickingDialog
        key={selectedOrderId ?? "none"}
        orderId={selectedOrderId}
        invoiceNumber={selectedList?.invoice_number ?? null}
        storeName={selectedList?.store_name ?? null}
        currentUserId={currentUserId}
        open={selectedOrderId !== null}
        onOpenChange={open => {
          if (!open) {
            setSelectedOrderId(null)
            router.refresh()
          }
        }}
        pickers={[]}
        canManage={false}
        canAssign={false}
        canConfirmAsManager={false}
        canPick
      />
    </div>
  )
}
