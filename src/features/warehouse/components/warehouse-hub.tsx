"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Warehouse as WarehouseIcon, Search, AlertTriangle, Gem, Boxes, Activity, ClipboardList, Users, ScrollText, RefreshCw } from "lucide-react"
import { enableWarehouseModule, createWarehouse } from "@/features/warehouse/actions"
import { useWarehouseRealtime } from "@/features/warehouse/hooks/use-warehouse-realtime"
import { WarehouseAddItemPanel } from "@/features/warehouse/components/warehouse-add-item"
import { WarehouseItemDialog } from "@/features/warehouse/components/warehouse-item-dialog"
import { WarehouseStaffTab } from "@/features/warehouse/components/warehouse-staff-tab"
import { WarehouseMovementsTab } from "@/features/warehouse/components/warehouse-movements-tab"
import { WarehouseActivityTab } from "@/features/warehouse/components/warehouse-activity-tab"
import { baseToDisplay, formatIQD, statusColor, statusLabel, type StockStatus } from "@/features/warehouse/lib/helpers"
import type {
  PickerStat,
  PoolMasterProduct,
  Warehouse,
  WarehouseItem,
  WarehouseMovement,
  WarehouseUnit,
} from "@/features/warehouse/lib/types"
import type { StaffMember } from "@/features/warehouse/lib/types"

interface Props {
  merchantId: string
  actorName: string | null
  actorRole: "merchant" | "merchant_staff"
  isStaff: boolean
  canPricing: boolean
  canWarehouse: boolean
  warehouseEnabled: boolean
  storeName: string
  warehouses: Warehouse[]
  items: WarehouseItem[]
  poolProducts: PoolMasterProduct[]
  catalogCategories: { id: string; name: string }[]
  staff: StaffMember[]
  movements: WarehouseMovement[]
  activeLists: { id: string; order_id: string; status: string; picker_name: string | null; invoice_number: number | null; store_name: string | null }[]
  pickerStats: PickerStat[]
  canManageStaff: boolean
}

type HubTab = "items" | "add" | "staff" | "movements" | "activity"

export function WarehouseHub(props: Props) {
  const {
    merchantId,
    actorName, actorRole, isStaff, canPricing, canWarehouse, warehouseEnabled,
    storeName, warehouses, items, poolProducts, catalogCategories, staff, movements, activeLists, pickerStats, canManageStaff,
  } = props

  useWarehouseRealtime(merchantId)

  const [tab, setTab] = useState<HubTab>("items")
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | StockStatus>("all")
  const [selectedItem, setSelectedItem] = useState<WarehouseItem | null>(null)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newWhName, setNewWhName] = useState("")
  const [showNewWh, setShowNewWh] = useState(false)

  // خريطة بيانات المنتج لكل الحركات
  const productInfo = useMemo(() => {
    const map = new Map<string, { name: string; baseUnit: string; conversions: { from: string; to: string; multiplier: number }[]; units: WarehouseUnit[]; basePrice: number }>()
    for (const it of items) {
      const p = it.product
      if (!p) continue
      const conversions = p.unit_conversions || []
      const units = p.units || []
      const baseUnit = conversions.length > 0 ? conversions[conversions.length - 1].to : units.find(u => u.multiplier_to_base === 1)?.type ?? ""
      const basePrice = units.find(u => u.multiplier_to_base === 1)?.price ?? p.price ?? 0
      map.set(it.product_id, { name: p.name, baseUnit, conversions, units, basePrice })
    }
    return map
  }, [items])

  const computed = useMemo(() => items.map(it => {
    const info = productInfo.get(it.product_id)
    const units = info?.units ?? []
    const su = it.product?.stock_unit
    const du = (su && units.some(u => u.type === su)) ? su : units[0]?.type ?? info?.baseUnit ?? ""
    const status: StockStatus =
      it.quantity <= 0 ? "out"
      : it.min_stock_alert > 0 && it.quantity <= it.min_stock_alert ? "low"
      : it.min_stock_alert > 0 && it.quantity <= Math.ceil(it.min_stock_alert * 1.2) ? "near"
      : "ok"
    const displayQty = info ? baseToDisplay(it.quantity, du, info.conversions) : it.quantity
    const displayMin = info ? baseToDisplay(it.min_stock_alert || 0, du, info.conversions) : it.min_stock_alert
    const stockPct = it.min_stock_alert > 0 ? Math.min(100, Math.round((it.quantity / (it.min_stock_alert * 2)) * 100)) : 100
    return { item: it, du, info, status, displayQty, displayMin, stockPct }
  }), [items, productInfo])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return computed.filter(c => {
      if (warehouseFilter !== "all" && c.item.warehouse_id !== warehouseFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (!q) return true
      return c.item.product?.name?.toLowerCase().includes(q) || ""
    })
  }, [computed, warehouseFilter, statusFilter, search])

  const lowItems = computed.filter(c => c.status === "low" || c.status === "out")
  const outItems = computed.filter(c => c.status === "out")
  const todayMovements = movements.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString()).length
  const inventoryValue = computed.reduce((sum, c) => sum + c.item.quantity * (c.info?.basePrice ?? 0), 0)
  const linkedMasterIds = useMemo(() => new Set(items.map(i => i.product?.master_product_id).filter(Boolean) as string[]), [items])

  const kpis = [
    { label: "القيمة التقديرية للمخزون", value: `${formatIQD(inventoryValue)} د.ع`, icon: Gem, cls: "text-brand-orange bg-brand-orange/10" },
    { label: "صنف في المخازن", value: formatIQD(items.length), icon: Boxes, cls: "text-brand-blue bg-brand-blue/10" },
    { label: "وصل حد التنبيه", value: `${lowItems.length}${outItems.length > 0 ? ` (${outItems.length} نافد)` : ""}`, icon: AlertTriangle, cls: "text-red-600 dark:text-red-400 bg-red-500/10" },
    { label: "حركة مخزنية اليوم", value: String(todayMovements), icon: Activity, cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  ]
  const visibleKpis = isStaff ? kpis.filter(k => k.label !== "حركة مخزنية اليوم") : kpis

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-4">
      {/* الترويسة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/20"><WarehouseIcon className="w-5 h-5" /></span>
            {isStaff ? (
              <>
                <span>{actorName || "الموظف"}</span>
                <span className="text-xs sm:text-sm font-bold text-muted-foreground">موظف في أسواق {storeName}</span>
              </>
            ) : `مخازن ${storeName}`}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            الكميات، الأسعار، حدود التنبيه، وقوائم التجهيز — كل حركة مسجّلة باسم صاحبها ووقتها
          </p>
        </div>
        {canPricing && warehouseEnabled && warehouses.length > 0 && (
          <div className="flex gap-2">
            {actorRole === "merchant" && (
              <Button variant="outline" size="sm" className="font-bold" onClick={() => setShowNewWh(v => !v)}>
                <Plus className="w-4 h-4 ml-1" /> مخزن جديد
              </Button>
            )}
            <Button size="sm" className="font-bold" onClick={() => setTab("add")}>
              <Plus className="w-4 h-4 ml-1" /> إضافة مادة للمخزن
            </Button>
          </div>
        )}
      </div>

      {showNewWh && (
        <div className="flex gap-2 items-center p-3 rounded-xl border border-border bg-card">
          <Input value={newWhName} onChange={e => setNewWhName(e.target.value)} placeholder="اسم المخزن الجديد (مثال: مخزن الفرع)" className="flex-1" />
          <Button
            size="sm" className="font-bold" disabled={isPending || newWhName.trim().length < 2}
            onClick={() => startTransition(async () => {
              const res = await createWarehouse(newWhName, "")
              if (!res?.error) { setNewWhName(""); setShowNewWh(false) }
            })}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowNewWh(false)}>إلغاء</Button>
        </div>
      )}

      {/* التفعيل الأولي */}
      {!warehouseEnabled ? (
        <OnboardingCard isStaff={isStaff} />
      ) : warehouses.length === 0 ? (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm font-bold text-amber-600 dark:text-amber-400">
          لا يوجد مخزن بعد — تواصل مع صاحب المتجر لتفعيل وحدة المخازن
        </div>
      ) : (
        <>
          {/* المؤشرات */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleKpis.map(k => (
              <div key={k.label} className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${k.cls}`}><k.icon className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <div className="font-black text-base sm:text-lg truncate">{k.value}</div>
                  <div className="text-[10px] text-muted-foreground">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* تنبيه النقص */}
          {lowItems.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400"><AlertTriangle className="w-4 h-4" /></span>
                <div>
                  <div className="text-sm font-black text-red-600 dark:text-red-400">تنبيه النقص — {lowItems.length} صنف</div>
                  <div className="text-[10px] text-muted-foreground">وصلت للحد الأدنى أو دونه</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                {lowItems.slice(0, 4).map(c => (
                  <button
                    key={c.item.id}
                    onClick={() => { setSelectedItem(c.item); setItemDialogOpen(true) }}
                    className="text-[11px] font-bold bg-background/80 border border-border rounded-lg px-2.5 py-1.5 hover:border-red-500/40"
                  >
                    {c.item.product?.name} — بقي <b className="text-red-600 dark:text-red-400">{formatIQD(c.displayQty)} {c.du}</b>
                  </button>
                ))}
                {lowItems.length > 4 && <span className="text-[11px] text-muted-foreground self-center">+{lowItems.length - 4} أصناف</span>}
              </div>
            </div>
          )}

          {/* قوائم التجهيز النشطة */}
          {activeLists.length > 0 && (
            <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="p-2 rounded-lg bg-brand-orange/10 text-brand-orange"><ClipboardList className="w-4 h-4" /></span>
                <div>
                  <div className="text-sm font-black text-brand-orange">قوائم تجهيز نشطة — {activeLists.length}</div>
                  <div className="text-[10px] text-muted-foreground">جارٍ جمعها في المخزن الآن</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                {activeLists.slice(0, 4).map(l => (
                  <span key={l.id} className="text-[11px] font-bold bg-background/80 border border-border rounded-lg px-2.5 py-1.5">
                    #{l.invoice_number} — {l.store_name}
                    {l.status === "picked" ? " · جُمعت ✓" : ` · ${l.picker_name ? `العامل: ${l.picker_name}` : "بانتظار تعيين عامل"}`}
                  </span>
                ))}
              </div>
              <Link href="/dashboard/orders" className="shrink-0">
                <Button variant="outline" size="sm" className="font-bold">متابعة من الطلبات ←</Button>
              </Link>
            </div>
          )}

          {/* تبويبات المركز */}
          <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
            {([
              { id: "items", label: "المواد", icon: Boxes, show: true },
              { id: "add", label: "إضافة مواد", icon: Plus, show: true },
              { id: "staff", label: "فريق العمل", icon: Users, show: canManageStaff },
              { id: "movements", label: "دفتر الحركات", icon: Activity, show: !isStaff },
              { id: "activity", label: "سجل التغييرات", icon: ScrollText, show: !isStaff },
            ] as { id: HubTab; label: string; icon: typeof Users; show: boolean }[]).filter(t => t.show).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.id ? "border-brand-orange text-brand-orange" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* المحتوى */}
          {tab === "items" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-52">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم…" className="pr-9" />
                </div>
                {warehouses.length > 1 && (
                  <select
                    className="rounded-md border border-input bg-background px-3 py-2 text-xs font-bold"
                    value={warehouseFilter}
                    onChange={e => setWarehouseFilter(e.target.value)}
                  >
                    <option value="all">كل المخازن</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                )}
                <div className="flex gap-1">
                  <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={`الكل ${computed.length}`} />
                  <Chip active={statusFilter === "ok"} onClick={() => setStatusFilter("ok")} label="متوفر" />
                  <Chip active={statusFilter === "low" || statusFilter === "near"} onClick={() => setStatusFilter(statusFilter === "low" || statusFilter === "near" ? "all" : "low")} label={`منخفض ${computed.filter(c => c.status === "low" || c.status === "near").length}`} />
                  <Chip active={statusFilter === "out"} onClick={() => setStatusFilter(statusFilter === "out" ? "all" : "out")} label={`نافد ${outItems.length}`} />
                </div>
              </div>

              {visible.length === 0 ? (
                <div className="text-center py-12 space-y-2 border border-dashed border-border rounded-2xl">
                  <Boxes className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-sm font-bold text-muted-foreground">
                    {items.length === 0 ? "مخزنك فارغ — أضف أول مادة من مواد التطبيق أو بإدخال حر" : "لا نتائج مطابقة للبحث"}
                  </p>
                  {canPricing && items.length === 0 && (
                    <Button size="sm" className="font-bold" onClick={() => setTab("add")}>
                      <Plus className="w-4 h-4 ml-1" /> إضافة مادة للمخزن
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground bg-muted/40 border-b border-border">
                          <th className="text-right font-bold p-3">المادة</th>
                          <th className="text-right font-bold p-3 hidden md:table-cell">أسعار البيع</th>
                          <th className="text-right font-bold p-3">الكمية</th>
                          <th className="text-right font-bold p-3 hidden sm:table-cell">حد التنبيه</th>
                          <th className="text-right font-bold p-3">الحالة</th>
                          <th className="text-left font-bold p-3">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {visible.slice(0, 100).map(c => (
                          <tr key={c.item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                  {c.item.product?.image_url
                                    ? <img src={c.item.product.image_url} alt="" className="w-full h-full object-cover" />
                                    : <Boxes className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold truncate max-w-44">{c.item.product?.name ?? "—"}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {warehouses.find(w => w.id === c.item.warehouse_id)?.name}
                                    {c.item.product?.master_product_id ? " · 🔗 مركزياً" : " · خاصة"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              <div className="font-black">{formatIQD(c.info?.units[0]?.price ?? 0)} <span className="text-[9px] text-muted-foreground">/{c.info?.units[0]?.type}</span></div>
                              <div className="text-[10px] text-muted-foreground">
                                {c.info?.units.slice(1).map(u => `${u.type} ${formatIQD(u.price)}`).join(" · ")}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-black tabular-nums">{formatIQD(c.displayQty)} <span className="text-[9px] text-muted-foreground font-bold">{c.du}</span></div>
                              {c.item.min_stock_alert > 0 && (
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                  <div className={`h-full rounded-full ${c.status === "out" || c.status === "low" ? "bg-red-500" : c.status === "near" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${c.stockPct}%` }} />
                                </div>
                              )}
                            </td>
                            <td className="p-3 hidden sm:table-cell tabular-nums font-bold">{formatIQD(c.displayMin)}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                            </td>
                            <td className="p-3 text-left">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="outline" size="sm" className="h-7 px-2 text-[11px] font-bold"
                                  onClick={() => { setSelectedItem(c.item); setItemDialogOpen(true) }}
                                >
                                  إدارة
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {visible.length > 100 && (
                    <div className="p-2 text-center text-[11px] text-muted-foreground bg-muted/30">
                      تُعرض أول 100 صنف — استخدم البحث أو الفلاتر للوصول للبقية
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "add" && (
            <WarehouseAddItemPanel
              warehouses={warehouses}
              pool={poolProducts}
              categories={catalogCategories}
              linkedMasterIds={linkedMasterIds}
            />
          )}

          {tab === "staff" && (
            <WarehouseStaffTab staff={staff} pickerStats={pickerStats} canManage={canManageStaff} />
          )}

          {tab === "movements" && (
            <WarehouseMovementsTab movements={movements} productNames={new Map([...productInfo.entries()].map(([k, v]) => [k, { name: v.name, baseUnit: v.baseUnit }]))} />
          )}

          {tab === "activity" && <WarehouseActivityTab />}
        </>
      )}

      {/* حوار بطاقة الصنف */}
      <WarehouseItemDialog
        key={selectedItem?.id ?? "none"}
        item={selectedItem}
        open={itemDialogOpen}
        onOpenChange={v => { setItemDialogOpen(v); if (!v) setTimeout(() => setSelectedItem(null), 200) }}
        canPricing={canPricing}
        canWarehouse={canWarehouse}
        isStaff={isStaff}
        movements={movements}
      />
    </div>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-[11px] font-bold border transition-colors whitespace-nowrap ${
        active ? "bg-brand-orange/10 text-brand-orange border-brand-orange/40" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

function OnboardingCard({ isStaff }: { isStaff: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  return (
    <div className="rounded-2xl border border-brand-orange/30 bg-gradient-to-br from-brand-orange/5 to-transparent p-6 sm:p-8 text-center space-y-3">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center">
        <WarehouseIcon className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-black">فعّل نظام المخازن لمتجرك</h2>
      <p className="text-xs sm:text-sm text-muted-foreground leading-7 max-w-lg mx-auto">
        سيُنشأ «المخزن الرئيسي» ويُرحَّل رصيد كل منتجاتك الحالية إليه تلقائياً دون أي تغيير على أسعارك أو معروضاتك.
        بعدها تدير الكميات والأسعار وحدود التنبيه، تصدر قوائم تجهيز يثبت فيها اسم عامل التجهيز للمساءلة،
        وتضيف موظفين بأسماء مستخدم وكلمة مرور داخلية لا يدخلون إلا صفحات متجرك.
      </p>
      {error && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold max-w-sm mx-auto">{error}</div>}
      {!isStaff && (
        <Button
          className="font-bold"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            setError("")
            const res = await enableWarehouseModule()
            if (res?.error) setError(res.error)
          })}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ml-1" /> تفعيل وحدة المخازن</>}
        </Button>
      )}
    </div>
  )
}
