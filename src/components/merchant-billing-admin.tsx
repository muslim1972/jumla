"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Calendar,
  Percent,
  Search,
  Loader2,
  DollarSign,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MerchantBillingAdmin() {
  const [merchants, setMerchants] = useState<any[]>([])
  const [selectedMerchantId, setSelectedMerchantId] = useState("")
  const [billings, setBillings] = useState<any[]>([])
  const [unbilledOrders, setUnbilledOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [commissionPercent, setCommissionPercent] = useState<number>(5)

  const supabase = createClient()

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
  }, [])

  // When merchant or date changes, fetch preview and history
  useEffect(() => {
    if (selectedMerchantId) {
      loadMerchantData()
    } else {
      setUnbilledOrders([])
      setBillings([])
    }
  }, [selectedMerchantId, endDate])

  const loadMerchantData = async () => {
    setIsLoading(true)
    
    // Fetch billing history
    const { data: history } = await supabase
      .from('merchant_billings')
      .select('*')
      .eq('merchant_id', selectedMerchantId)
      .order('created_at', { ascending: false })
      
    if (history) setBillings(history)

    // Fetch unbilled delivered orders up to end date
    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999)

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_id', selectedMerchantId)
      .eq('status', 'delivered')
      .is('billing_id', null)
      .lte('created_at', endDateTime.toISOString())
      .order('invoice_number', { ascending: true })

    if (orders) setUnbilledOrders(orders)
    
    setIsLoading(false)
  }

  const handleIssueBill = async () => {
    if (unbilledOrders.length === 0) return
    if (!confirm("هل أنت متأكد من إصدار هذه الفاتورة للتاجر؟")) return
    
    setIsIssuing(true)

    const totalSales = unbilledOrders.reduce((sum, o) => sum + (o.total_rounded || 0), 0)
    const amountDue = totalSales * (commissionPercent / 100)
    const firstInvoice = unbilledOrders[0].invoice_number
    const lastInvoice = unbilledOrders[unbilledOrders.length - 1].invoice_number
    
    // Determine period_start (either first order date or last bill end date)
    let periodStart = unbilledOrders[0].created_at
    if (billings.length > 0 && billings[0].period_end) {
      periodStart = billings[0].period_end
    }

    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999)

    // Insert billing
    const { data: newBill, error: billError } = await supabase
      .from('merchant_billings')
      .insert({
        merchant_id: selectedMerchantId,
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
      alert("حدث خطأ أثناء إصدار الفاتورة: " + billError?.message)
      setIsIssuing(false)
      return
    }

    // Update orders
    const orderIds = unbilledOrders.map(o => o.id)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ billing_id: newBill.id })
      .in('id', orderIds)

    if (updateError) {
      alert("تم إصدار الفاتورة ولكن حدث خطأ في ربط الطلبات: " + updateError.message)
    } else {
      alert("تم إصدار الفاتورة بنجاح!")
      loadMerchantData() // Refresh
    }
    
    setIsIssuing(false)
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
    }
  }

  // Calculate preview stats
  const previewTotalSales = unbilledOrders.reduce((sum, o) => sum + (o.total_rounded || 0), 0)
  const previewAmountDue = previewTotalSales * (commissionPercent / 100)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">إعدادات التحاسب</CardTitle>
            <CardDescription>اختر التاجر وحدد فترة المحاسبة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">التاجر</label>
              <select 
                value={selectedMerchantId}
                onChange={(e) => setSelectedMerchantId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">-- اختر التاجر --</option>
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.store_name || m.full_name || m.phone}
                  </option>
                ))}
              </select>
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
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(parseFloat(e.target.value) || 0)}
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
            {!selectedMerchantId ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                يرجى اختيار التاجر لرؤية المعاينة
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : unbilledOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
                لا توجد طلبات مكتملة غير محاسب عليها لهذا التاجر حتى تاريخ القطع المحدد.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">عدد الطلبات المكتملة</span>
                    <span className="font-black text-xl">{unbilledOrders.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">إجمالي المبيعات</span>
                    <span className="font-black text-xl text-brand-blue">{previewTotalSales.toLocaleString()} د.ع</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">نسبة التطبيق ({commissionPercent}%)</span>
                    <span className="font-black text-xl text-brand-orange">{previewAmountDue.toLocaleString()} د.ع</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>من الوصل #{unbilledOrders[0].invoice_number}</span>
                    <span>إلى الوصل #{unbilledOrders[unbilledOrders.length - 1].invoice_number}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-500/10 text-blue-700 rounded-lg border border-blue-500/20 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    هذا التحاسب يشمل جميع الطلبات المتأخرة التي اكتملت مؤخراً ولم تدخل في الفواتير السابقة، لضمان عدم ضياع أي حقوق.
                  </p>
                </div>

                <Button 
                  onClick={handleIssueBill} 
                  disabled={isIssuing}
                  className="w-full h-12 text-lg font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-lg"
                >
                  {isIssuing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <FileText className="w-5 h-5 ml-2" />}
                  إصدار الفاتورة الآن
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      {selectedMerchantId && billings.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">فواتير التاجر السابقة</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-4 font-bold">تاريخ الإصدار</th>
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
                    <td className="p-4 font-bold">{bill.total_sales.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{bill.commission_percentage}%</td>
                    <td className="p-4 font-black text-brand-orange">{bill.amount_due.toLocaleString()} د.ع</td>
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
                          onClick={() => handleMarkAsPaid(bill.id)}
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
