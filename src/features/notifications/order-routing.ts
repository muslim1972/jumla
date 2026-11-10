const ORDER_REFERENCE_PATTERN =
  /\n?\[order_id:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\s*$/i

export function extractOrderNotificationReference(message: string | null | undefined) {
  const content = message ?? ""
  const match = content.match(ORDER_REFERENCE_PATTERN)

  return {
    message: match ? content.slice(0, match.index).trimEnd() : content,
    orderId: match?.[1] ?? null,
  }
}

export function getOrderEditNotificationHref(
  title: string,
  message: string,
  orderId?: string | null,
) {
  if (title !== "تم تعديل قائمة مشترياتك") return null

  if (orderId && ORDER_REFERENCE_PATTERN.test(`\n[order_id:${orderId}]`)) {
    return `/cart?openOrder=${encodeURIComponent(orderId)}`
  }

  const invoiceMatch = message.match(/القائمة رقم\s*#?(\d+)/)
  return invoiceMatch
    ? `/cart?openInvoice=${encodeURIComponent(invoiceMatch[1])}`
    : "/cart?openOrders=1"
}
