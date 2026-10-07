import { sendNotificationToUser } from "@/utils/onesignal"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * فحص بنود المخزن العابرة لحد التنبيه وإطلاق إنذار فوري لهاتف التاجر.
 * تُستدعى بعد حركات المخزون الخصمية (طلب جديد، تجهيز، تسويات) —
 * ومهيأة لمنع التكرار عبر low_stock_notified_at (سكون 6 ساعات لكل بند).
 */
export async function checkAndNotifyLowStock(merchantId: string) {
  try {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString()

    // بنود تحت الحد ولم يُطلق عنها إنذار حديثاً
    const { data: lowItems } = await adminClient
      .from("warehouse_items")
      .select("id, quantity, min_stock_alert, low_stock_notified_at, product:products(name)")
      .eq("merchant_id", merchantId)

    const crossing = (lowItems || []).filter((it: { min_stock_alert: number; quantity: number; low_stock_notified_at: string | null }) =>
      it.min_stock_alert > 0 && it.quantity <= it.min_stock_alert &&
      (!it.low_stock_notified_at || it.low_stock_notified_at < sixHoursAgo)
    )

    if (crossing.length === 0) return

    // علّمها أولاً (منع تكرار الإشعار عند تزامن النداءات)
    await Promise.all(
      crossing.map(it =>
        adminClient.from("warehouse_items").update({ low_stock_notified_at: new Date().toISOString() }).eq("id", it.id)
      )
    )

    const names = crossing
      .slice(0, 4)
      .map(it => (it.product as { name?: string } | null)?.name || "صنف")
      .join("، ")
    await sendNotificationToUser(
      merchantId,
      "⚠️ تنبيه نقص مخزون",
      crossing.length === 1
        ? `«${names}» وصل حد التنبيه — راجع مخزنك.`
        : `${crossing.length} أصناف وصلت حد التنبيه منها: ${names} — راجع مخزنك.`
    )
  } catch (e) {
    // الإنذار ميزة تحسينية — لا يُفشل العملية الأساسية أبداً
    console.error("[low-stock] فشل فحص التنبيه:", e)
  }
}
