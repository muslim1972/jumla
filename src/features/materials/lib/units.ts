// حساب مضاعف كل وحدة للوصول لوحدة الأساس (آخر "to" في سلسلة التحويلات)
// مشترك بين أكشنات السيرفر وواجهات العميل — دوال نقية بلا "use server"

export type UnitConversion = { from: string, to: string, multiplier: number }

// تحسب multiplier_to_base لكل وحدة (بلا أسعار — لسجل الكتالوج المركزي)
export function calculateUnitMultipliers(
  units: { type: string }[],
  conversions: UnitConversion[]
): { type: string, multiplier_to_base: number }[] {
  if (!conversions || conversions.length === 0) {
    return units.map(u => ({ type: u.type, multiplier_to_base: 1 }))
  }

  const baseUnit = conversions[conversions.length - 1].to

  const getMultiplierToBase = (unit: string): number => {
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

  return units.map(u => ({
    type: u.type,
    multiplier_to_base: getMultiplierToBase(u.type)
  }))
}

// تحويل كمية المخزون المدخلة بوحدة معينة إلى وحدة الأساس
export function toBaseStockQuantity(
  stockQuantity: number,
  stockUnit: string,
  conversions: UnitConversion[]
): number {
  if (!conversions || conversions.length === 0) return stockQuantity

  const baseUnit = conversions[conversions.length - 1].to
  if (stockUnit === baseUnit) return stockQuantity

  let multiplier = 1
  let current = stockUnit
  let loops = 0
  while (current !== baseUnit && loops < 20) {
    const conv = conversions.find(c => c.from === current)
    if (!conv) break
    multiplier *= conv.multiplier
    current = conv.to
    loops++
  }
  return stockQuantity * multiplier
}
