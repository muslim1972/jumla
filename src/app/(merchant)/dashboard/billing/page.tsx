import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, CheckCircle, Clock, AlertTriangle, FileText, Receipt } from "lucide-react"

export default async function MerchantBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch billings for this merchant
  const { data: billings } = await supabase
    .from('merchant_billings')
    .select('*')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-brand-orange" />
          التحاسب والفواتير
        </h1>
        <p className="text-muted-foreground mt-1">
          هنا تظهر فواتير مبيعاتك المستحقة للتطبيق والمسددة.
        </p>
      </div>

      {!billings || billings.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">لم يتم إصدار أي فواتير تحاسب لك بعد.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {billings.map((bill) => (
            <Card key={bill.id} className="overflow-hidden border-2 shadow-premium">
              <div className="bg-muted p-4 sm:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">فاتورة تحاسب</h3>
                    <p className="text-sm text-muted-foreground font-mono" dir="ltr">
                      {new Date(bill.created_at).toLocaleDateString('ar-IQ')}
                    </p>
                  </div>
                </div>
                
                <div className="text-left">
                  {bill.status === 'paid' ? (
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black text-lg">
                      <CheckCircle className="w-5 h-5" />
                      تم التسديد
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 font-black text-lg shadow-sm">
                      <Clock className="w-5 h-5" />
                      بانتظار الدفع
                    </div>
                  )}
                </div>
              </div>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* التفاصيل الأساسية */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground mb-3 border-b pb-2">تفاصيل فترة المحاسبة</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">بداية الفترة:</span>
                          <span className="font-mono">{new Date(bill.period_start).toLocaleDateString('ar-IQ')}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">نهاية الفترة (القطع):</span>
                          <span className="font-mono">{new Date(bill.period_end).toLocaleDateString('ar-IQ')}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">من الوصل رقم:</span>
                          <span className="font-mono font-bold">#{bill.first_invoice_number}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">إلى الوصل رقم:</span>
                          <span className="font-mono font-bold">#{bill.last_invoice_number}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* التفاصيل المالية */}
                  <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
                    <h4 className="text-sm font-bold text-muted-foreground mb-4">التفاصيل المالية</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">إجمالي المبيعات المكتملة</span>
                        <span className="font-black text-lg">{bill.total_sales.toLocaleString()} د.ع</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">نسبة استقطاع التطبيق</span>
                        <span className="font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md">{bill.commission_percentage}%</span>
                      </div>
                      
                      <div className="pt-4 border-t-2 border-dashed border-border/80">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-brand-blue">المبلغ المستحق للدفع</span>
                          <span className="font-black text-2xl text-brand-orange">{bill.amount_due.toLocaleString()} د.ع</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {bill.status === 'pending' && (
                  <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 text-red-700 rounded-xl border border-red-500/20">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">تنبيه هام!</p>
                      <p className="text-sm opacity-90">
                        يرجى التسديد خلال مدة أقصاها 3 أيام للحفاظ على استمرار الخدمة، لتجنب توقف حسابك مؤقتاً.
                      </p>
                    </div>
                  </div>
                )}
                
                {bill.status === 'paid' && bill.paid_at && (
                  <div className="mt-6 text-center text-sm text-muted-foreground bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                    تم تأكيد استلام هذا المبلغ من قبل الإدارة بتاريخ {new Date(bill.paid_at).toLocaleString('ar-IQ')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
