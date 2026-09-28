"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * نتيجة تعديل واحد لحقل معين
 */
interface FieldChange {
  value: unknown
  changerName: string
  changedAt: string
}

/**
 * النتيجة الكاملة لسجل تعديلات حقل
 */
export interface FieldHistoryResult {
  current: FieldChange | null
  previous: FieldChange | null
  totalChanges: number
  error?: string
}

/**
 * جلب آخر تعديلين لحقل معين من سجل الحركات (audit_logs)
 *
 * المنطق:
 * 1. التحقق من صلاحية الأدمن
 * 2. جلب آخر 50 سجل UPDATE لهذا الجدول والسجل
 * 3. فلترة السجلات التي تغيّر فيها الحقل المطلوب فعلياً
 * 4. إرجاع آخر تعديلين مع اسم المُعدِّل والتاريخ
 */
export async function getFieldHistory(
  tableName: string,
  recordId: string,
  fieldName: string
): Promise<FieldHistoryResult> {
  const supabase = await createClient()

  // --- التحقق من صلاحية الأدمن ---
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { current: null, previous: null, totalChanges: 0, error: "غير مصرح" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const allowedRoles = ["admin", "support", "call_center", "materials"]
  if (!allowedRoles.includes(profile?.role || "")) {
    return { current: null, previous: null, totalChanges: 0, error: "صلاحيات غير كافية" }
  }

  // إنشاء عميل بصلاحيات تجاوز RLS لجلب السجلات لأن جدول audit_logs قد يكون محميّاً
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // --- جلب سجلات الحركات ---
  const { data: logs, error: logsError } = await adminSupabase
    .from("audit_logs")
    .select("id, old_data, new_data, changed_by, created_at")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .eq("action", "UPDATE")
    .order("created_at", { ascending: false })
    .limit(50)

  if (logsError) {
    return {
      current: null,
      previous: null,
      totalChanges: 0,
      error: "خطأ في جلب السجلات",
    }
  }

  if (!logs || logs.length === 0) {
    return { current: null, previous: null, totalChanges: 0 }
  }

  // --- فلترة التغييرات الفعلية لهذا الحقل ---
  const relevantChanges = logs.filter((log) => {
    const oldVal = log.old_data?.[fieldName]
    const newVal = log.new_data?.[fieldName]
    // نعتبره تغييراً فعلياً إذا اختلفت القيمتان
    return JSON.stringify(oldVal) !== JSON.stringify(newVal)
  })

  console.log(`[getFieldHistory] tableName=${tableName} recordId=${recordId} fieldName=${fieldName}`)
  console.log(`[getFieldHistory] fetched logs count=${logs.length} relevant=${relevantChanges.length}`)


  const totalChanges = relevantChanges.length

  if (totalChanges === 0) {
    return { current: null, previous: null, totalChanges: 0 }
  }

  // --- جلب أسماء المُعدِّلين ---
  const changerIds = [
    ...new Set(
      relevantChanges
        .slice(0, 2)
        .map((log) => log.changed_by)
        .filter(Boolean)
    ),
  ]

  let profileMap: Record<string, string> = {}

  if (changerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, store_name")
      .in("id", changerIds)

    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map((p) => [p.id, p.full_name || p.store_name || "مستخدم"])
      )
    }
  }

  // --- بناء النتيجة ---
  const buildChange = (
    log: (typeof relevantChanges)[0]
  ): FieldChange => ({
    value: log.new_data?.[fieldName] ?? null,
    changerName:
      log.changed_by
        ? profileMap[log.changed_by] || "مستخدم غير معروف"
        : "النظام",
    changedAt: log.created_at,
  })

  // أول تغيير (الأحدث) = القيمة الحالية
  const current = buildChange(relevantChanges[0])

  // ثاني تغيير = القيمة السابقة (نأخذ new_data من السجل الأقدم التالي)
  const previous =
    totalChanges >= 2 ? buildChange(relevantChanges[1]) : null

  return { current, previous, totalChanges }
}
