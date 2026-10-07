// مساعدات وحدات القياس — قرين معزول لمساعدات لوحة المنتجات (نفس المنطق لضمان الاتساق)

interface Conversion {
  from: string
  to: string
  multiplier: number
}

interface UnitLike {
  type: string
  price?: number
  multiplier_to_base?: number
}

/** الوحدة الأساسية = وجهة آخر تحويل (نفس اتفاق لوحة المنتجات) */
export function getBaseUnit(conversions: Conversion[] | null | undefined): string {
  return conversions && conversions.length > 0 ? conversions[conversions.length - 1].to : ""
}

/** مضاعف وحدة إلى وحدة الأساس عبر سلسلة التحويلات */
export function multiplierToBase(unit: string, conversions: Conversion[] | null | undefined): number {
  if (!conversions || conversions.length === 0) return 1
  const baseUnit = getBaseUnit(conversions)
  if (unit === baseUnit) return 1
  let multiplier = 1
  let current = unit
  let loops = 0
  while (current !== baseUnit && loops < 20) {
    const conv = conversions.find(c => c.from === current)
    if (!conv) break
    multiplier *= conv.multiplier
    current = conv.to
    loops++
  }
  return multiplier
}

/** الكمية المخزنة بوحدة الأساس → كميتها بوحدة العرض المطلوبة */
export function baseToDisplay(baseQuantity: number, unit: string, conversions: Conversion[] | null | undefined): number {
  const m = multiplierToBase(unit, conversions)
  return m > 0 ? Math.floor(baseQuantity / m) : baseQuantity
}

/** كمية بوحدة العرض → بوحدة الأساس */
export function displayToBase(quantity: number, unit: string, conversions: Conversion[] | null | undefined): number {
  return Math.round(quantity * multiplierToBase(unit, conversions))
}

/** وحدات العرض المتاحة لصنف (المخزنة في products.units) */
export function displayUnits(units: UnitLike[] | null | undefined): string[] {
  if (!units || units.length === 0) return []
  return units.map(u => u.type)
}

export type StockStatus = "out" | "low" | "near" | "ok"

/** حالة الصنف: نافد/تحت الحد/يقترب (≤ 120% من الحد)/متوفر */
export function computeStockStatus(baseQuantity: number, baseMin: number): StockStatus {
  if (baseQuantity <= 0) return "out"
  if (baseMin > 0 && baseQuantity <= baseMin) return "low"
  if (baseMin > 0 && baseQuantity <= Math.ceil(baseMin * 1.2)) return "near"
  return "ok"
}

export function statusLabel(status: StockStatus): string {
  switch (status) {
    case "out": return "نافد"
    case "low": return "تحت الحد"
    case "near": return "يقترب من الحد"
    default: return "متوفر"
  }
}

export function statusColor(status: StockStatus): string {
  switch (status) {
    case "out": return "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
    case "low": return "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
    case "near": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
    default: return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
  }
}

export function formatIQD(value: number): string {
  return value.toLocaleString("en-US")
}
