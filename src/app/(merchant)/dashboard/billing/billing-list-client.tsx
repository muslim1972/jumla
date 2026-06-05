"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Clock, AlertTriangle, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function BillingListClient({ billings }: { billings: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {billings.map((bill) => {
        const isPaid = bill.status === 'paid'
        const isExpanded = expandedId === bill.id

        return (
          <Card 
            key={bill.id} 
            className={cn(
              "overflow-hidden border-2 shadow-sm transition-all duration-300 hover:shadow-md",
              isPaid ? "border-emerald-500/20" : "border-amber-500/30"
            )}
          >
            <button 
              onClick={() => setExpandedId(isExpanded ? null : bill.id)}
              className={cn(
                "w-full text-right p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors cursor-pointer",
                isPaid ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "bg-amber-500/5 hover:bg-amber-500/10"
              )}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  isPaid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                )}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={cn(
                    "font-black text-lg",
                    isPaid ? "text-emerald-700 dark:text-emerald-500" : "text-amber-700 dark:text-amber-500"
                  )}>
                    فاتورة تحاسب
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono mt-0.5" dir="ltr">
                    {new Date(bill.created_at).toLocaleDateString('ar-IQ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-left">
                  {isPaid ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      مسددة
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold text-sm shadow-sm">
                      <Clock className="w-4 h-4" />
                      غير مسددة
                    </div>
                  )}
                </div>
                <div className={cn("p-1.5 rounded-full", isPaid ? "bg-emerald-500/10" : "bg-amber-500/10")}>
                  {isExpanded ? (
                    <ChevronUp className={cn("w-5 h-5", isPaid ? "text-emerald-600" : "text-amber-600")} />
                  ) : (
                    <ChevronDown className={cn("w-5 h-5", isPaid ? "text-emerald-600" : "text-amber-600")} />
                  )}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <CardContent className="p-5 sm:p-6 border-t border-border/50">
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

                  {!isPaid && (
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
                  
                  {isPaid && bill.paid_at && (
                    <div className="mt-6 text-center text-sm font-medium text-emerald-700 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                      تم تأكيد استلام هذا المبلغ من قبل الإدارة بتاريخ {new Date(bill.paid_at).toLocaleString('ar-IQ')}
                    </div>
                  )}
                </CardContent>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
