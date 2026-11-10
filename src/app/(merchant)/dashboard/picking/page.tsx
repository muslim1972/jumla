import { redirect } from "next/navigation"
import { getActorContext, hasPermission, resolveStaffHome } from "@/features/staff/lib/guard"
import { getAssignedPickingLists } from "@/features/warehouse/picking/actions"
import { PickingWorkspace } from "@/features/warehouse/components/picking-workspace"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PickingPage({
  searchParams,
}: {
  searchParams: Promise<{ openOrder?: string | string[] }>
}) {
  const params = await searchParams
  const requestedOrderId = typeof params.openOrder === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.openOrder)
    ? params.openOrder
    : undefined

  const ctx = await getActorContext()
  if (!ctx) redirect("/login")
  if (ctx.role !== "merchant_staff" || !hasPermission(ctx, "picking")) {
    redirect(resolveStaffHome(ctx.permissions))
  }

  const result = await getAssignedPickingLists()
  const assignedLists = result.lists ?? []
  const requestedList = requestedOrderId
    ? assignedLists.find(list => list.order_id === requestedOrderId)
    : undefined
  const notice = result.error
    ?? (requestedOrderId && !requestedList ? "القائمة غير موجودة ضمن القوائم المعيّنة لحسابك." : null)

  return (
    <PickingWorkspace
      initialLists={assignedLists}
      currentUserId={ctx.userId}
      initialOrderId={requestedList?.order_id ?? null}
      notice={notice}
    />
  )
}
