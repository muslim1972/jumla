"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2, AlertCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { deleteUserAccount } from "@/app/actions/auth-actions"
import { getBuyerActiveOrders } from "@/app/actions/buyer-orders-actions"
import { BuyerOrdersManager } from "./buyer-orders-manager"

export function AccountDeletion() {
  const supabase = createClient()
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeOrders, setActiveOrders] = useState<any[] | null>(null)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  const handleCheckOrdersForDeletion = async (autoProceedToDeleteOrEvent?: boolean | React.BaseSyntheticEvent) => {
    // Determine if we should auto-proceed
    const autoProceedToDelete = typeof autoProceedToDeleteOrEvent === 'boolean'
      ? autoProceedToDeleteOrEvent
      : true; // Default to true when called from button click

    // If not a buyer (guest role usually means buyer in this system) or if we just want to be safe, check orders for everyone
    // Admin, Merchant, Support don't make orders typically, but if they do, same rules apply.
    setIsLoadingOrders(true)
    try {
      const res = await getBuyerActiveOrders()
      if (res.orders && res.orders.length > 0) {
        setActiveOrders(res.orders)
      } else {
        if (autoProceedToDelete) {
          // No active orders, proceed to delete
          handleDeleteAccount()
        } else {
          setActiveOrders(null)
        }
      }
    } catch (e) {
      console.error(e)
      alert("حدث خطأ أثناء التحقق من الطلبات الفعالة.")
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("هل أنت متأكد تماماً أنك تريد حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء!")
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await deleteUserAccount(user.id)

      if (result.error) {
        console.error("Delete user account result.error:", result.error)
        alert("حدث خطأ أثناء محاولة حذف الحساب: " + result.error)
      } else {
        alert("تم حذف حسابك بنجاح. نتمنى أن نراك مجدداً!")
        await supabase.auth.signOut()
        window.location.reload()
      }
    } catch (error) {
      console.error("Delete account error:", error)
      alert("حدث خطأ غير متوقع")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    /* قسم حذف الحساب */
    <div className="space-y-3 pt-2">
      <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-right w-full">
            <h3 className="font-bold text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              منطقة الخطر
            </h3>
            <p className="text-xs text-muted-foreground">
              حذف حسابك سيؤدي إلى مسح جميع بياناتك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          {!activeOrders || activeOrders.length === 0 ? (
            <Button
              variant="destructive"
              onClick={handleCheckOrdersForDeletion}
              disabled={isDeleting || isLoadingOrders}
              className="w-full sm:w-auto shrink-0 whitespace-nowrap min-w-[100px]"
            >
              {isDeleting || isLoadingOrders ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف الحساب"}
            </Button>
          ) : null}
        </div>

        {activeOrders && activeOrders.length > 0 && (
          <div className="mt-2 border-t border-destructive/20 pt-4 space-y-3">
            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-700 p-3 rounded-lg text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                لا يمكنك حذف حسابك حالياً لوجود طلبات فعالة مرتبطة بك.
                <br />- الطلبات قيد الانتظار يجب حذفها أولاً.
                <br />- الطلبات الموافقة أو قيد التوصيل يجب إرسال طلب للتاجر لحذفها، وسيقوم بالتواصل معك أو مع المندوب لإرجاعها.
              </p>
            </div>

            <BuyerOrdersManager activeOrders={activeOrders} onOrdersChange={setActiveOrders} />

            <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setActiveOrders(null)}
                size="sm"
                className="border-muted-foreground/30"
              >
                تراجع عن الحذف
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCheckOrdersForDeletion(false)}
                disabled={isLoadingOrders}
                size="sm"
              >
                {isLoadingOrders ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تحديث القائمة
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
