"use client"

import { useEffect } from "react"
import { Clock, Loader2, User, Calendar, AlertCircle, Hash } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFieldHistory } from "@/features/admin/hooks/use-field-history"

interface FieldHistoryPopoverProps {
  /** اسم الجدول في قاعدة البيانات */
  tableName: string
  /** معرّف السجل */
  recordId: string
  /** اسم الحقل في قاعدة البيانات (مثل "price") */
  fieldName: string
  /** اسم الحقل بالعربي للعرض (مثل "السعر") */
  fieldLabel: string
  /** دالة تنسيق اختيارية لتحويل القيمة الخام إلى نص مقروء */
  formatValue?: (value: unknown) => string
  /** هل النافذة مفتوحة */
  open: boolean
  /** دالة التحكم بفتح/إغلاق النافذة */
  onOpenChange: (open: boolean) => void
}

/**
 * مكون يعرض سجل تعديلات حقل معين في نافذة عائمة
 * يظهر القيمة الحالية والسابقة مع اسم المُعدِّل والتاريخ
 *
 * يُستخدم حصرياً في واجهات الأدمن
 */
export function FieldHistoryPopover({
  tableName,
  recordId,
  fieldName,
  fieldLabel,
  formatValue,
  open,
  onOpenChange,
}: FieldHistoryPopoverProps) {
  const { data, isLoading, error, fetchHistory, reset } = useFieldHistory(
    tableName,
    recordId,
    fieldName
  )

  // جلب البيانات عند فتح النافذة فقط (lazy loading)
  useEffect(() => {
    if (open) {
      fetchHistory()
    } else {
      reset()
    }
  }, [open, fetchHistory, reset])

  const formatDisplayValue = (value: unknown): string => {
    if (formatValue) return formatValue(value)
    if (value === null || value === undefined) return "فارغ"
    if (typeof value === "boolean") return value ? "نعم" : "لا"
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("ar-IQ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[92vw] max-w-md p-0 overflow-hidden rounded-2xl"
        dir="rtl"
        showCloseButton={true}
      >
        {/* الترويسة */}
        <DialogHeader className="bg-gradient-to-l from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4 border-b border-border/50">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <div className="bg-brand-orange/10 p-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-brand-orange" />
            </div>
            سجل تعديلات: {fieldLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* حالة التحميل */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
            </div>
          ) : error ? (
            /* حالة الخطأ */
            <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-600 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : !data || (!data.current && !data.previous) ? (
            /* لا توجد تعديلات */
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm">لا توجد تعديلات مسجلة لهذا الحقل</p>
            </div>
          ) : (
            /* عرض التعديلات */
            <>
              {/* القيمة الحالية */}
              {data.current && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      القيمة الحالية
                    </span>
                  </div>
                  <p className="font-bold text-sm text-foreground pr-4 break-words">
                    {formatDisplayValue(data.current.value)}
                  </p>
                  <div className="flex flex-col gap-1 pr-4">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <User className="w-3 h-3 shrink-0" />
                      {data.current.changerName}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatDate(data.current.changedAt)}
                    </span>
                  </div>
                </div>
              )}

              {/* القيمة السابقة */}
              {data.previous && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      القيمة السابقة
                    </span>
                  </div>
                  <p className="font-bold text-sm text-foreground pr-4 break-words">
                    {formatDisplayValue(data.previous.value)}
                  </p>
                  <div className="flex flex-col gap-1 pr-4">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <User className="w-3 h-3 shrink-0" />
                      {data.previous.changerName}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatDate(data.previous.changedAt)}
                    </span>
                  </div>
                </div>
              )}

              {/* عدد التعديلات الكلي */}
              {data.totalChanges > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/30 pt-3">
                  <Hash className="w-3.5 h-3.5" />
                  <span>عدد التعديلات الكلي: <strong className="text-foreground">{data.totalChanges} {data.totalChanges === 1 ? "مرة" : "مرات"}</strong></span>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * زر الأيقونة 🕒 الذي يُوضع بجوار الحقل
 * يظهر فقط في واجهات الأدمن
 */
export function FieldHistoryButton({
  onClick,
  className = "",
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full 
        text-muted-foreground/50 hover:text-brand-orange hover:bg-brand-orange/10 
        transition-colors cursor-pointer shrink-0 ${className}`}
      title="سجل التعديلات"
      aria-label="عرض سجل تعديلات الحقل"
    >
      <Clock className="w-3 h-3" />
    </button>
  )
}
