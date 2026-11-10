const ORDER_REFERENCE_PATTERN =
  /\n?\[order_id:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\s*$/i
const ORDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const INVOICE_NUMBER_PATTERN =
  /(?:القائمة|قائمتك|الفاتورة|فاتورة|فاتورتك|الطلب|طلبك)\s*(?:رقم\s*)?#?\s*(\d+)/

export function extractOrderNotificationReference(message: string | null | undefined) {
  const content = message ?? ""
  const match = content.match(ORDER_REFERENCE_PATTERN)

  return {
    message: match ? content.slice(0, match.index).trimEnd() : content,
    orderId: match?.[1] ?? null,
  }
}

function getOrderHref(
  path: "/cart" | "/dashboard/orders",
  message: string,
  orderId: string | null | undefined,
  fallback: string,
) {
  if (orderId && ORDER_ID_PATTERN.test(orderId)) {
    return `${path}?openOrder=${encodeURIComponent(orderId)}`
  }

  const invoiceMatch = message.match(INVOICE_NUMBER_PATTERN)
  return invoiceMatch
    ? `${path}?openInvoice=${encodeURIComponent(invoiceMatch[1])}`
    : fallback
}

export function getNotificationHref(
  title: string,
  message: string,
  orderId?: string | null,
) {
  switch (title) {
    case "تم تعديل قائمة مشترياتك":
      return getOrderEditNotificationHref(title, message, orderId) ?? "/cart?openOrders=1"
    case "طلب جديد!":
      return getOrderHref("/dashboard/orders", message, orderId, "/dashboard/orders")
    case "وافق المشتري على التعديلات":
    case "المندوب استلم القائمة":
    case "تم التوصيل!":
    case "تعديل طلب":
      return getOrderHref("/dashboard/orders", message, orderId, "/dashboard/orders")
    case "تم تجهيز طلبك!":
    case "طلبك قيد التجهيز":
    case "تم التوصيل بنجاح!":
      return getOrderHref("/cart", message, orderId, "/cart?openOrders=1")
    case "ألغى المشتري عملية الشراء":
      return "/dashboard/orders"
    case "نعتذر، تم رفض طلبك":
      return getOrderHref("/cart", message, orderId, "/cart?openOrders=1")
    case "طلب تسجيل حساب جديد 🔔":
      return "/admin?tab=users&approval=pending"
    case "تم تفعيل حسابك بنجاح! 🎉":
      return "/"
    case "إشعار بشأن تفعيل الحساب ⚠️":
      return "/awaiting-approval"
    case "طلب طرح مخزني بانتظار اعتمادك":
    case "طلب تأييد طرح مخزني":
    case "تم تأييد طلب الطرح من الزميل":
      return "/dashboard/warehouses?tab=deductions&status=pending"
    case "تم رفض طلب الطرح المخزني":
      return "/dashboard/warehouses?tab=deductions&status=rejected"
    case "اكتمل اعتماد وتنفيذ الطرح المخزني":
    case "نُفّذ طرح مخزني معتمد":
      return "/dashboard/warehouses?tab=deductions&status=approved"
    default:
      if (title.includes("فاتورة") || message.includes("فاتورة")) {
        return "/dashboard/billing"
      }
      if (title.includes("طلب") || message.includes("طلب")) {
        return "/dashboard/orders"
      }
      return "/"
  }
}

export function getOrderEditNotificationHref(
  title: string,
  message: string,
  orderId?: string | null,
) {
  if (title !== "تم تعديل قائمة مشترياتك") return null
  return getOrderHref("/cart", message, orderId, "/cart?openOrders=1")
}
