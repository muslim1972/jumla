// أنواع نظام المخازن — ميزة معزولة داخل features/warehouse

export interface WarehouseUnit {
  type: string
  price: number
  multiplier_to_base: number
}

export interface Warehouse {
  id: string
  merchant_id: string
  name: string
  location_note: string | null
  is_default: boolean
  created_at: string
}

export interface WarehouseItemProduct {
  id: string
  name: string
  image_url: string | null
  barcode?: string | null
  category_name?: string | null
  master_product_id: string | null
  units: WarehouseUnit[]
  unit_conversions: { from: string; to: string; multiplier: number }[]
  stock_unit: string | null
  price: number
  unit_type: string
}

export type WarehouseItemStockStatus = "out" | "low" | "near" | "ok"

export interface WarehouseItem {
  id: string
  warehouse_id: string
  product_id: string
  quantity: number            // بوحدة الأساس دائماً
  min_stock_alert: number     // بوحدة الأساس دائماً
  low_stock_notified_at: string | null
  updated_at: string
  product?: WarehouseItemProduct
  /** حالة الصنف محسوبة على وحدة العرض */
  status?: WarehouseItemStockStatus
  /** الكمية بوحدة العرض */
  displayQuantity?: number
  /** حد التنبيه بوحدة العرض */
  displayMin?: number
}

export type MovementKind =
  | "in"              // وارد
  | "out"             // إخراج يدوي
  | "adjust"          // تسوية جرد
  | "order_deduction" // خصم تلقائي بأمر بيع
  | "order_restore"   // استرجاع بإلغاء/تعديل طلب
  | "shortage_return" // إرجاع نقص قائمة تجهيز إلى الرف

export interface WarehouseMovement {
  id: string
  merchant_id: string
  warehouse_id: string
  product_id: string
  product_name?: string | null
  kind: MovementKind
  quantity: number       // بالوحدة الأساسية (موجب/سالب حسب النوع)
  balance_after: number  // الرصيد بعد الحركة (بالوحدة الأساسية)
  reference_type: string | null
  reference_id: string | null
  note: string | null
  performed_by: string | null
  performed_by_name?: string | null
  created_at: string
}

/** صلاحيات موظف التاجر الداخلي */
export type StaffPermission = "sales" | "warehouse" | "picking" | "pricing"

export const STAFF_PERMISSION_LABELS: Record<StaffPermission, { label: string; desc: string }> = {
  sales: { label: "المبيعات وإصدار الفواتير", desc: "معالجة الطلبات الواردة، الطباعة، تسليم للمندوب" },
  warehouse: { label: "العمل على المخازن", desc: "إدخال وإخراج الكميات، الجرد، إصدار قوائم التجهيز" },
  picking: { label: "التجهيز وجمع المواد", desc: "تأكيد جمع قوائم التجهيز المُعيَّن بها" },
  pricing: { label: "تعديل الأسعار وحدود التنبيه", desc: "تغيير أسعار البيع وحد أدنى للكمية" },
}

export interface StaffMember {
  id: string
  full_name: string | null
  username: string | null
  permissions: StaffPermission[]
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export type PickingStatus = "issued" | "picked" | "handed_over" | "cancelled"

export interface PickingListItem {
  id: string
  order_item_id: string
  product_id: string | null
  product_name: string
  unit_type: string
  ordered_quantity: number
  confirmed_quantity: number
  shortage_quantity: number
  shortage_reason: string | null
}

export interface PickingList {
  id: string
  merchant_id: string
  order_id: string
  status: PickingStatus
  warehouse_name?: string | null
  picker_id: string | null
  picker_name: string | null
  issued_by: string | null
  issued_by_name: string | null
  issued_at: string | null
  picked_at: string | null
  handed_over_at: string | null
  handed_over_by: string | null
  handed_over_name: string | null
  photo_url: string | null
  note: string | null
  created_at: string
  items?: PickingListItem[]
}

/** مادة من الـ Pool المركزي — الحقول اللازمة لشاشة الإضافة فقط (تصغير الحمولة) */
export interface PoolMasterProduct {
  id: string
  name: string
  description?: string | null
  barcode: string | null
  image_url: string | null
  base_price: number | null
  units: { type: string; multiplier_to_base: number }[]
  unit_conversions: { from: string; to: string; multiplier: number }[]
  category_id: string | null
  updated_at: string
  category_name: string | null
  /** مصدر المادة: إدارة المواد أو مساهمة تاجر */
  origin?: "admin" | "merchant" | null
}

/** صف في سجل التغييرات (audit) كما يراه التاجر */
export interface MerchantActivityRow {
  id: string
  table_name: string
  record_id: string
  action: "UPDATE" | "DELETE" | "INSERT"
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by_name: string | null
  created_at: string
}

/** إحصاء أداء عامل التجهيز */
export interface PickerStat {
  staffId: string
  pickedLists: number
  shortageItems: number
  avgPickMinutes: number | null
}
