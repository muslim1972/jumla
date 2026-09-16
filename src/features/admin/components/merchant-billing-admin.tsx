"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { sendBillingNotification } from "@/features/admin/actions"
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Calendar,
  Percent,
  Search,
  Loader2,
  AlertCircle,
  History
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MerchantBillingAdmin() {
  const [merchants, setMerchants] = useState<any[]>([])
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<string[]>([])
  const [billings, setBillings] = useState<any[]>([])
  const [allBillings, setAllBillings] = useState<any[]>([])
  // طلبات غير محاسبة لكل تاجر مؤشر
  const [groupUnbilled, setGroupUnbilled] = useState<Record<string, any[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isIssuingAll, setIsIssuingAll] = useState(false)
  
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  // قيمة نصية تسمح بالفراغ الكامل — لا صفر ملتصق بالكتابة الجديدة
  const [commissionInput, setCommissionInput] = useState("5")
  const commissionPercent = parseFloat(commissionInput) || 0

  const supabase = createClient()

  const loadAllBillings = async () => {
    const { data } = await supabase
      .from('merchant_billings')
      .select('*, profiles!inner(store_name, full_name, phone)')
      .order('created_at', { ascending: false })
    
    if (data) setAllBillings(data)
  }

  // Fetch merchants on load
  useEffect(() => {
    async function loadMerchants() {
      const { data } = await supabase
        .from('profiles')
        .select('id, store_name, full_name, phone')
        .eq('role', 'merchant')
      
      if (data) setMerchants(data)
    }
    loadMerchants()
    loadAllBillings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // عند تغيير التجار المؤشرين أو تاريخ القطع: جلب الطلبات غير المحاسبة والسجل دفعة واحدة
  useEffect(() => {
    if (selectedMerchantIds.length === 0) {
      setGroupUnbilled({})
      setBillings([])
      return
    }
    loadSelectedData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMerchantIds, endDate])

  const loadSelectedData = async () => {
    setIsLoading(true)
    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999)

    // الطلبات المكتملة غير المحاسبة لجميع التجار المؤشرين حتى تاريخ القطع
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .in('merchant_id', selectedMerchantIds)
      .in('status', ['delivered', 'completed'])
      .is('billing_id', null)
      .lte('created_at', endDateTime.toISOString())
      .order('invoice_number', { ascending: true })

    // تجميع الطلبات حسب التاجر
    const grouped: Record<string, any[]> = {}
    for (const o of orders || []) {
      if (!grouped[o.merchant_id]) grouped[o.merchant_id] = []
      grouped[o.merchant_id].push(o)
    }
    setGroupUnbilled(grouped)

    // سجل فواتير التجار المؤشرين (مع الأسماء للعرض)
    const { data: history } = await supabase
      .from('merchant_billings')
      .select('*, profiles!inner(store_name, full_name, phone)')
      .in('merchant_id', selectedMerchantIds)
      .order('created_at', { ascending: false })
    if (history) setBillings(history)

    setIsLoading(false)
  }

  const handleToggleAll = (checked: boolean) => {
    setSelectedMerchantIds(checked ? merchants.map(m => m.id) : [])
  }

  const handleToggleMerchant = (id: string, checked: boolean) => {
    setSelectedMerchantIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id))
  }

  const handleIssueBills = async () => {
    const targets = selectedMerchantIds.filter(id => (groupUnbilled[id]?.length || 0) > 0)
    if (targets.length === 0) return
    if (commissionPercent <= 0) {
      alert("أدخل نسبة استقطاع صحيحة أكبر من صفر أولاً")
      return
    }
    if (!confirm(`هل أنت متأكد من إصدار ${targets.length} فاتورة للتجار المؤشرين؟`)) return

    setIsIssuingAll(true)
    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999)

    // آخر نهاية فترة محاسبة سابقة لكل تاجر (بداية الفترة الجديدة)
    const lastPeriodEnd: Record<string, string> = {}
    for (const b of billings) {
      if (!lastPeriodEnd[b.merchant_id] || new Date(b.period_end) > new Date(lastPeriodEnd[b.merchant_id])) {
        lastPeriodEnd[b.merchant_id] = b.period_end
      }
    }

    let okCount = 0
    let failCount = 0

    for (const merchantId of targets) {
      const orders = groupUnbilled[merchantId]
      const totalSales = orders.reduce((sum, o) => sum + (o.total_rounded || 0), 0)
      const amountDue = totalSales * (commissionPercent / 100)
      const firstInvoice = orders[0].invoice_number
      const lastInvoice = orders[orders.length - 1].invoice_number
      const periodStart = lastPeriodEnd[merchantId] || orders[0].created_at

      // Insert billing
      const { data: newBill, error: billError } = await supabase
        .from('merchant_billings')
        .insert({
          merchant_id: merchantId,
          period_start: periodStart,
          period_end: endDateTime.toISOString(),
          first_invoice_number: firstInvoice,
          last_invoice_number: lastInvoice,
          total_sales: totalSales,
          commission_percentage: commissionPercent,
          amount_due: amountDue,
          status: 'pending'
        })
        .select()
        .single()

      if (billError || !newBill) {
        failCount++
        continue
      }

      // Update orders
      const orderIds = orders.map(o => o.id)
      const { error: updateError } = await supabase
        .from('orders')
        .update({ billing_id: newBill.id })
        .in('id', orderIds)

      if (updateError) {
        failCount++
        continue
      }

      // إرسال إشعار للتاجر
      try {
        await sendBillingNotification(merchantId, amountDue)
      } catch (e) {
        console.error("Notification sending error", e)
      }
      okCount++
    }

    alert(
      failCount === 0
        ? `تم إصدار ${okCount} فاتورة بنجاح!`
        : `تم إصدار ${okCount} فاتورة بنجاح — وفشل ${failCount}، أعد المحاولة للتجار المتبقين.`
    )
    await loadSelectedData()
    loadAllBillings()
    setIsIssuingAll(false)
  }

  const handleMarkAsPaid = async (billId: string) => {
    if (!confirm("هل تم استلام المبلغ من التاجر فعلياً؟")) return

    const { error } = await supabase
      .from('merchant_billings')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', billId)

    if (error) {
      alert("خطأ: " + error.message)
    } else {
      setBillings(prev => prev.map(b => b.id === billId ? { ...b, status: 'paid', paid_at: new Date().toISOString() } : b))
      setAllBillings(prev => prev.map(b => b.id === billId ? { ...b, status: 'paid', paid_at: new Date().toISOString() } : b))
    }
  }

  // Calculate preview stats
  const selectedOrders = useMemo(
    () => Object.values(groupUnbilled).flat(),
    [groupUnbilled]
  )
  const previewTotalSales = selectedOrders.reduce((sum, o) => sum + (o.total_rounded || 0), 0)
  const previewAmountDue = previewTotalSales * (commissionPercent / 100)
  const billableCount = selectedMerchantIds.filter(id => (groupUnbilled[id]?.length || 0) > 0).length
  const allSelected = merchants.length > 0 && selectedMerchantIds.length === merchants.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">إعدادات التحاسب</CardTitle>
            <CardDescription>أشّر التجار وحدد فترة المحاسبة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold">
                  التجار ({selectedMerchantIds.length}/{merchants.length})
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-violet-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-violet-600"
                    checked={allSelected}
                    onChange={(e) => handleToggleAll(e.target.checked)}
                  />
                  تحديد الكل
                </label>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-md border bg-background divide-y">
                {merchants.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">لا يوجد تجار مسجلون</p>
                ) : (
                  merchants.map(m => {
                    const checked = selectedMerchantIds.includes(m.id)
                    return (
                      <label key={m.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/40 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-violet-600 shrink-0"
                          checked={checked}
                          onChange={(e) => handleToggleMerchant(m.id, e.target.checked)}
                        />
                        <span className="text-sm font-bold truncate">
                          {m.store_name || m.full_name || m.phone}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                تاريخ القطع (End Date)
              </label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">سيتم احتساب جميع الطلبات المكتملة التي لم تُحاسب لغاية هذا التاريخ.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                <Percent className="w-4 h-4" />
                نسبة استقطاع التطبيق %
              </label>
              <Input 
                type="number" 
                step="0.1"
                min="0"
                inputMode="decimal"
                value={commissionInput}
                onChange={(e) => setCommissionInput(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="أدخل النسبة"
                dir="ltr"
                className="text-right"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2 shadow-sm border-violet-500/20">
          <CardHeader className="bg-violet-500/5 border-b">
            <CardTitle className="text-lg text-violet-700 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              معاينة الفاتورة قبل الإصدار
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selectedMerchantIds.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                يرجى تأشير التجار لرؤية المعاينة
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : selectedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
                لا توجد طلبات مكتملة غير محاسب عليها للتجار المؤشرين حتى تاريخ القطع المحدد.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">التجار المشاركون</span>
                    <span className="font-black text-xl">{billableCount}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">إجمالي عدد الطلبات المكتملة</span>
                    <span className="font-black text-xl">{selectedOrders.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">إجمالي المبيعات</span>
                    <span className="font-black text-xl text-brand-blue">{previewTotalSales.toLocaleString('en-US')} د.ع</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">نسبة التطبيق ({commissionPercent}%)</span>
                    <span className="font-black text-xl text-brand-orange">{previewAmountDue.toLocaleString('en-US')} د.ع</span>
                  </div>
                </div>

                {/* تفصيل لكل تاجر مؤشر */}
                <div className="space-y-2">
                  {selectedMerchantIds.map(id => {
                    const m = merchants.find(x => x.id === id)
                    const orders = groupUnbilled[id] || []
                    const sales = orders.reduce((sum, o) => sum + (o.total_rounded || 0), 0)
                    return (
                      <div key={id} className="flex justify-between items-center gap-3 p-2.5 bg-muted/40 rounded-lg text-sm">
                        <span className="font-bold truncate">
                          {m?.store_name || m?.full_name || m?.phone}
                        </span>
                        {orders.length > 0 ? (
                          <span className="flex items-center gap-3 text-xs shrink-0">
                            <span className="text-muted-foreground">{orders.length} طلب</span>
                            <span className="text-brand-blue font-bold">{sales.toLocaleString('en-US')} د.ع</span>
                            <span className="text-brand-orange font-bold">{(sales * commissionPercent / 100).toLocaleString('en-US')} د.ع</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">لا طلبات غير محاسبة</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-500/10 text-blue-700 rounded-lg border border-blue-500/20 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    سيتم إصدار فاتورة مستقلة لكل تاجر مؤشر تشمل جميع طلباته المكتملة غير المحاسبة حتى تاريخ القطع، لضمان عدم ضياع أي حقوق.
                  </p>
                </div>

                <Button 
                  onClick={handleIssueBills} 
                  disabled={isIssuingAll || billableCount === 0}
                  className="w-full h-12 text-lg font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-lg"
                >
                  {isIssuingAll ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <FileText className="w-5 h-5 ml-2" />}
                  إصدار {billableCount} فاتورة الآن
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      {selectedMerchantIds.length > 0 && billings.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">فواتير التجار المؤشرين السابقة</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <BillingTable billings={billings} onMarkAsPaid={handleMarkAsPaid} showMerchant />
          </CardContent>
        </Card>
      )}

      {/* All Billings */}
      {selectedMerchantIds.length === 0 && allBillings.length > 0 && (
        <Card className="shadow-sm border-brand-blue/20">
          <CardHeader className="bg-brand-blue/5 border-b">
            <CardTitle className="text-lg text-brand-blue flex items-center gap-2">
              <History className="w-5 h-5" />
              سجل جميع الفواتير المصدرة
            </CardTitle>
            <CardDescription>هذه القائمة تعرض جميع الفواتير الصادرة لجميع التجار</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <BillingTable billings={allBillings} onMarkAsPaid={handleMarkAsPaid} showMerchant />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BillingTable({ billings, onMarkAsPaid, showMerchant = false }: { billings: any[], onMarkAsPaid: (id: string) => void, showMerchant?: boolean }) {
  return (
    <table className="w-full text-right text-sm">
      <thead className="bg-muted/50 text-muted-foreground">
        <tr>
          <th className="p-4 font-bold">تاريخ الإصدار</th>
          {showMerchant && <th className="p-4 font-bold">التاجر</th>}
          <th className="p-4 font-bold">المبيعات</th>
          <th className="p-4 font-bold">النسبة</th>
          <th className="p-4 font-bold">المستحق للتطبيق</th>
          <th className="p-4 font-bold text-center">الحالة</th>
          <th className="p-4 font-bold text-center">إجراءات</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {billings.map(bill => (
          <tr key={bill.id} className="hover:bg-muted/20">
            <td className="p-4 text-xs font-mono" dir="ltr">{new Date(bill.created_at).toLocaleDateString('ar-IQ')}</td>
            {showMerchant && (
              <td className="p-4 font-bold">
                {bill.profiles?.store_name || bill.profiles?.full_name || bill.profiles?.phone || 'غير معروف'}
              </td>
            )}
            <td className="p-4 font-bold">{bill.total_sales.toLocaleString('en-US')}</td>
            <td className="p-4 text-muted-foreground">{bill.commission_percentage}%</td>
            <td className="p-4 font-black text-brand-orange">{bill.amount_due.toLocaleString('en-US')} د.ع</td>
            <td className="p-4 text-center">
              {bill.status === 'paid' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  تم التسديد
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  بانتظار الدفع
                </span>
              )}
            </td>
            <td className="p-4 text-center">
              {bill.status === 'pending' && (
                <Button 
                  onClick={() => onMarkAsPaid(bill.id)}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  استلام المبلغ
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
