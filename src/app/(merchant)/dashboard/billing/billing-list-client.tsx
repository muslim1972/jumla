"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertTriangle, FileText, Star, CheckCircle2, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { upsertAppRating, getMerchantAppRating } from "@/features/orders/actions/rating-actions"

export function BillingListClient({ billings }: { billings: any[] }) {
  const paidBillings = billings.filter(b => b.status === 'paid')
  const pendingBillings = billings.filter(b => b.status !== 'paid')
  const [selectedBill, setSelectedBill] = useState<any | null>(null)

  const handleOpenDialog = (bill: any) => {
    setSelectedBill(bill)
  }

  const handleCloseDialog = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedBill(null)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 items-start">
        {/* العمود الأيمن: الفواتير المسددة (Right column in RTL) */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="font-bold text-sm sm:text-lg text-emerald-700 dark:text-emerald-500 flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            مسددة
          </h2>
          {paidBillings.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground p-4 sm:p-6 text-center bg-muted/20 rounded-xl border border-dashed">لا يوجد</p>
          ) : (
            paidBillings.map((bill) => (
              <BillingCard key={bill.id} bill={bill} isPaid={true} onClick={() => handleOpenDialog(bill)} />
            ))
          )}
        </div>

        {/* العمود الأيسر: فواتير بانتظار التسديد (Left column in RTL) */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="font-bold text-sm sm:text-lg text-amber-700 dark:text-amber-500 flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            بانتظار التسديد
          </h2>
          {pendingBillings.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground p-4 sm:p-6 text-center bg-muted/20 rounded-xl border border-dashed">لا يوجد</p>
          ) : (
            pendingBillings.map((bill) => (
              <BillingCard key={bill.id} bill={bill} isPaid={false} onClick={() => handleOpenDialog(bill)} />
            ))
          )}
        </div>
      </div>

      <BillingDialog bill={selectedBill} open={!!selectedBill} onOpenChange={handleCloseDialog} />
    </>
  )
}

function BillingCard({ bill, isPaid, onClick }: { bill: any, isPaid: boolean, onClick: () => void }) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "overflow-hidden border-2 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        isPaid ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-amber-500/30 hover:border-amber-500/60"
      )}
    >
      <div 
        className={cn(
          "w-full text-right p-2.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3 transition-colors",
          isPaid ? "bg-emerald-500/5" : "bg-amber-500/5"
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner",
            isPaid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
          )}>
            <FileText className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-bold text-xs sm:text-sm truncate",
              isPaid ? "text-emerald-700 dark:text-emerald-500" : "text-amber-700 dark:text-amber-500"
            )}>
              فاتورة التطبيق
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-mono mt-0.5 truncate" dir="ltr">
              {new Date(bill.created_at).toLocaleDateString('ar-IQ')}
            </p>
          </div>
        </div>
        
        <div className="shrink-0 flex justify-end">
          {isPaid ? (
            <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[9px] sm:text-xs">
              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              مسددة
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-amber-500/10 text-amber-600 font-bold text-[9px] sm:text-xs shadow-sm">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
              بانتظار التسديد
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function BillingDialog({ bill, open, onOpenChange }: { bill: any | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  if (!bill) return null

  const isPaid = bill.status === 'paid'

  // حالة تقييم التطبيق من التاجر
  const [appRating, setAppRating] = useState(0)
  const [hoverAppRating, setHoverAppRating] = useState(0)
  const [appComment, setAppComment] = useState("")
  const [isSubmittingAppRating, setIsSubmittingAppRating] = useState(false)
  const [appRatingSuccess, setAppRatingSuccess] = useState(false)
  const [appRatingError, setAppRatingError] = useState<string | null>(null)
  const [hasPreviousRating, setHasPreviousRating] = useState(false)

  // جلب تقييم التاجر السابق لهذا التحاسب أو للتطبيق إن وجد
  useEffect(() => {
    if (open && bill && isPaid) {
      setAppRatingSuccess(false)
      setAppRatingError(null)
      getMerchantAppRating(bill.id).then(res => {
        if (res?.rating) {
          setAppRating(res.rating.rating)
          setAppComment(res.rating.comment || "")
          setHasPreviousRating(true)
        } else {
          setAppRating(0)
          setAppComment("")
          setHasPreviousRating(false)
        }
      })
    }
  }, [open, bill, isPaid])

  // إخفاء تنبيه النجاح بعد ثانية ونصف
  useEffect(() => {
    if (!appRatingSuccess) return
    const timer = setTimeout(() => {
      setAppRatingSuccess(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [appRatingSuccess])

  const handleSaveAppRating = async () => {
    if (appRating === 0) {
      setAppRatingError("الرجاء تحديد عدد النجوم لتقييم التطبيق")
      return
    }
    setAppRatingError(null)
    setIsSubmittingAppRating(true)
    try {
      const res = await upsertAppRating({
        rating: appRating,
        comment: appComment,
        billingId: bill.id
      })
      if (res.error) {
        setAppRatingError(res.error)
      } else {
        setAppRatingSuccess(true)
        setHasPreviousRating(true)
      }
    } catch {
      setAppRatingError("حدث خطأ أثناء حفظ تقييم التطبيق")
    } finally {
      setIsSubmittingAppRating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-0 bg-transparent shadow-none" showCloseButton={false}>
        <div className="bg-card rounded-xl border border-border/40 shadow-premium overflow-hidden">
          <DialogHeader className={cn(
            "p-4 sm:p-6 border-b flex flex-row items-center justify-between",
            isPaid ? "bg-emerald-500/10" : "bg-amber-500/10"
          )}>
            <DialogTitle className={cn(
              "flex items-center gap-2 text-lg font-black",
              isPaid ? "text-emerald-700 dark:text-emerald-500" : "text-amber-700 dark:text-amber-500"
            )}>
              <FileText className="w-5 h-5" />
              تفاصيل فاتورة التحاسب
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          <div className="p-4 sm:p-6 space-y-6 text-right max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* التفاصيل الأساسية */}
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

            {/* التفاصيل المالية */}
            <div className="bg-muted/30 p-4 sm:p-5 rounded-xl border border-border/50">
              <h4 className="text-sm font-bold text-muted-foreground mb-4">التفاصيل المالية</h4>
              <div className="space-y-4 text-sm sm:text-base">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">إجمالي المبيعات المكتملة</span>
                  <span className="font-black">{bill.total_sales.toLocaleString('en-US')} د.ع</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">نسبة استقطاع التطبيق</span>
                  <span className="font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md">{bill.commission_percentage}%</span>
                </div>
                
                <div className="pt-4 border-t-2 border-dashed border-border/80">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-brand-blue">المبلغ المستحق للدفع</span>
                    <span className="font-black text-xl sm:text-2xl text-brand-orange">{bill.amount_due.toLocaleString('en-US')} د.ع</span>
                  </div>
                </div>
              </div>
            </div>

            {!isPaid ? (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 text-red-700 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-6 h-6 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">تنبيه هام!</p>
                  <p className="text-xs sm:text-sm opacity-90">
                    يرجى التسديد خلال مدة أقصاها 3 أيام للحفاظ على استمرار الخدمة، لتجنب توقف حسابك مؤقتاً.
                  </p>
                </div>
              </div>
            ) : (
              bill.paid_at ? (
                <div className="text-center text-sm font-medium text-emerald-700 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                  تم تأكيد استلام هذا المبلغ من قبل الإدارة بتاريخ {new Date(bill.paid_at).toLocaleString('ar-IQ')}
                </div>
              ) : null
            )}

            {/* تقييم التاجر لتجربة التطبيق بعد إتمام التسديد */}
            {isPaid && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 sm:p-5 space-y-3.5 text-center">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {hasPreviousRating ? "تعديل تقييمك لتجربة التطبيق:" : "تقييمك لتجربة التعامل مع التطبيق:"}
                  </span>
                  {appRating > 0 && (
                    <span className="text-[10px] text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded-full font-bold">
                      {appRating} من 5 نجوم
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-right leading-relaxed">
                  بما أنك أتممت التحاسب مع التطبيق، رأيك وملاحظاتك تهم إدارة جملتي جداً لتطوير الخدمة وتسهيل عملك كشريك نجاح.
                </p>

                {/* النجوم التفاعلية */}
                <div className="flex items-center justify-center gap-2 py-1 flex-row-reverse">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-1.5 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      onMouseEnter={() => setHoverAppRating(star)}
                      onMouseLeave={() => setHoverAppRating(0)}
                      onClick={() => {
                        setAppRating(star)
                        setAppRatingError(null)
                      }}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-9 sm:h-9 ${
                          (hoverAppRating ? star <= hoverAppRating : star <= appRating)
                            ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                            : "text-muted-foreground/30"
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>

                {/* حقل الملاحظات */}
                <div className="space-y-1 text-right">
                  <label className="text-[11px] font-bold text-muted-foreground">
                    ملاحظاتك أو مقترحاتك للإدارة (اختياري)
                  </label>
                  <textarea
                    placeholder="اكتب رأيك بصراحة عن دقة الحسابات، دعم التطبيق، أو مقترحات للتطوير..."
                    value={appComment}
                    onChange={(e) => setAppComment(e.target.value)}
                    className="flex min-h-[70px] w-full rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 resize-none text-right"
                  />
                </div>

                {appRatingError && (
                  <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 text-center font-bold">
                    {appRatingError}
                  </p>
                )}

                {appRatingSuccess ? (
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>شكراً لتقييمكم! تم حفظ رأيك بنجاح ووصل للإدارة</span>
                  </div>
                ) : (
                  <Button
                    className="w-full font-bold text-xs h-9 sm:h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-1.5 shadow-sm"
                    onClick={handleSaveAppRating}
                    disabled={isSubmittingAppRating || appRating === 0}
                  >
                    {isSubmittingAppRating ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      <>
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                        {hasPreviousRating ? "تعديل وحفظ التقييم ⭐" : "حفظ تقييم التطبيق ⭐"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
