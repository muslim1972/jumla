"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Archive,
  Search,
  FileText,
  Loader2,
  Calendar,
  Hash
} from "lucide-react"
import { searchArchivedOrders } from "@/app/(app)/cart/actions"
import type { OrderData } from "@/components/my-orders"

// مكون بطاقة الطلب المؤرشف (مُبسّطة - فقط طباعة بدون تعديل أو أرشفة)
import dynamic from "next/dynamic"

// نستورد OrderCard عبر re-export مؤقت
// سنستخدم OrderCard من my-orders لكن مع isArchiveView=true

interface ArchiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveDialog({ open, onOpenChange }: ArchiveDialogProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [results, setResults] = useState<OrderData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    // التحقق من وجود معايير بحث
    if (!invoiceNumber.trim() && !dateFrom && !dateTo) {
      alert("يجب إدخال رقم الوصل أو الفترة لإتمام البحث")
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    try {
      const res = await searchArchivedOrders({
        invoiceNumber: invoiceNumber.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })

      if (res.error) {
        alert(res.error)
      } else {
        setResults(res.orders as OrderData[])
      }
    } catch {
      alert("حدث خطأ في البحث")
    } finally {
      setIsSearching(false)
    }
  }, [invoiceNumber, dateFrom, dateTo])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="bg-violet-500/10 p-2 rounded-lg">
              <Archive className="w-5 h-5 text-violet-600" />
            </div>
            الأرشيف
          </DialogTitle>
        </DialogHeader>

        {/* حقول البحث */}
        <div className="space-y-3 pb-4 border-b">
          {/* رقم الوصل */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice-search" className="text-xs font-bold flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              رقم الوصل
            </Label>
            <Input
              id="invoice-search"
              type="number"
              placeholder="مثال: 1"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="text-sm h-9"
              dir="ltr"
            />
          </div>

          {/* الفترة */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date-from" className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                من تاريخ
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-to" className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                إلى تاريخ
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* زر البحث */}
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            ابحث
          </Button>
        </div>

        {/* النتائج */}
        <div className="pt-2">
          {hasSearched && results.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-muted/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground text-sm">لا توجد نتائج</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                نتائج البحث ({results.length})
              </p>
              {results.map(order => (
                <ArchivedOrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// بطاقة الطلب المؤرشف - للعرض والطباعة فقط
function ArchivedOrderCard({ order }: { order: OrderData }) {
  const [expanded, setExpanded] = useState(false)

  const dateStr = new Date(order.created_at).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="border rounded-xl overflow-hidden bg-card hover:border-violet-500/20 transition-colors">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-violet-500/10 p-1.5 rounded-lg">
            <FileText className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">
              {order.merchant_name || "طلب"}
              {order.invoice_number && <span className="text-muted-foreground ml-1">#{String(order.invoice_number).padStart(5, '0')}</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 text-[10px] font-bold border border-violet-500/20">
            مؤرشف
          </span>
          <span className="font-black text-primary tabular-nums text-sm">
            {order.total_rounded.toLocaleString('en-US')}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* بيانات التوصيل */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">🏪</span>
              <span className="font-medium">{order.store_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">📍</span>
              <span>{order.address}</span>
            </div>
            <div className="flex items-center gap-2" dir="ltr">
              <span className="text-muted-foreground text-xs">📞</span>
              <span className="font-mono">{order.phone}</span>
            </div>
          </div>

          {/* عناصر الطلب */}
          {order.items && order.items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-right p-2 font-semibold">المنتج</th>
                    <th className="text-center p-2 font-semibold">الكمية</th>
                    <th className="text-left p-2 font-semibold">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className={idx < order.items!.length - 1 ? "border-b border-dashed" : ""}>
                      <td className="p-2">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-[10px] text-muted-foreground mr-1">({item.unit_type})</span>
                      </td>
                      <td className="text-center p-2 font-bold tabular-nums">{item.quantity}</td>
                      <td className="text-left p-2 font-bold tabular-nums">
                        {(item.product_price * item.quantity).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ملخص المبالغ */}
          <div className="text-xs space-y-1 pt-2 border-t border-dashed">
            <div className="flex justify-between text-muted-foreground">
              <span>قيمة المنتجات</span>
              <span className="tabular-nums">{order.subtotal.toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>أجور التوصيل</span>
              <span className="tabular-nums">{order.delivery_fee.toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-1">
              <span>المجموع الكلي</span>
              <span className="text-primary tabular-nums">{order.total_rounded.toLocaleString('en-US')} د.ع</span>
            </div>
          </div>

          {/* زر الطباعة فقط */}
          <Button
            variant="outline"
            className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/5"
            onClick={(e) => {
              e.stopPropagation();
              // نستخدم نفس دالة الطباعة
              const invoiceNum = order.invoice_number ? String(order.invoice_number).padStart(5, '0') : '---';
              const maskedCode = order.verification_code.length > 2
                ? order.verification_code[0] + 'X'.repeat(order.verification_code.length - 2) + order.verification_code[order.verification_code.length - 1]
                : order.verification_code;

              const itemsRows = (order.items || []).map(item => `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${item.product_name} <span style="color:#888;font-size:11px;">(${item.unit_type})</span></td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;font-size:13px;">${item.quantity}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.product_price.toLocaleString('en-US')}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;font-size:13px;">${(item.product_price * item.quantity).toLocaleString('en-US')}</td>
                </tr>
              `).join('');

              const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>قائمة #${invoiceNum}</title>
              <style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Cairo',sans-serif;background:#fff;color:#1a1a1a;padding:20px;direction:rtl}.invoice{max-width:520px;margin:0 auto}.header{text-align:center;padding-bottom:16px;border-bottom:3px solid #e85d26;margin-bottom:20px}.header h1{font-size:28px;font-weight:800;color:#e85d26;margin-bottom:4px}.header .invoice-num{font-size:14px;color:#666}.header .date{font-size:12px;color:#999;margin-top:2px}.section{margin-bottom:16px}.section-title{font-size:12px;font-weight:700;color:#e85d26;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f0f0f0}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}.info-item{font-size:12px}.info-label{color:#888}.info-value{font-weight:600}table{width:100%;border-collapse:collapse;margin-bottom:16px}thead tr{background:#f8f8f8}thead th{padding:8px 12px;font-size:11px;font-weight:700;color:#666;text-align:right;border-bottom:2px solid #e85d26}thead th:nth-child(2),thead th:nth-child(3){text-align:center}thead th:last-child{text-align:left}.totals{background:#fafafa;border-radius:8px;padding:12px 16px}.total-row{display:flex;justify-content:space-between;font-size:12px;color:#666;padding:3px 0}.total-row.grand{font-size:16px;font-weight:800;color:#1a1a1a;border-top:2px solid #e85d26;padding-top:8px;margin-top:6px}.total-row.grand .amount{color:#e85d26}.verification{text-align:center;margin:20px 0 16px;padding:16px;border:2px dashed #22c55e;border-radius:12px;background:#f0fdf4}.verification .label{font-size:11px;font-weight:700;color:#15803d;margin-bottom:6px}.verification .code{font-family:monospace;font-size:28px;font-weight:900;letter-spacing:.3em;color:#15803d}.verification .warning{font-size:10px;color:#dc2626;margin-top:8px;font-weight:600}.status{text-align:center;font-size:11px;font-weight:700;padding:6px;border-radius:6px;margin-bottom:16px;background:#ede9fe;color:#6d28d9}.footer{text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:12px;margin-top:20px}@media print{body{padding:10px}.no-print{display:none!important}}</style></head>
              <body><div class="invoice">
                <div class="header"><h1>جُملتي</h1><div class="invoice-num">قائمة رقم #${invoiceNum}</div><div class="date">${dateStr}</div></div>
                <div class="status">مؤرشف</div>
                <div class="section"><div class="section-title">معلومات التاجر</div><div class="info-grid"><div class="info-item"><span class="info-label">التاجر: </span><span class="info-value">${order.merchant_name || '---'}</span></div>${order.support_phone ? `<div class="info-item"><span class="info-label">هاتف الدعم: </span><span class="info-value" dir="ltr">${order.support_phone}</span></div>` : ''}</div></div>
                <div class="section"><div class="section-title">معلومات التوصيل</div><div class="info-grid"><div class="info-item"><span class="info-label">الاسم: </span><span class="info-value">${order.store_name}</span></div><div class="info-item"><span class="info-label">الهاتف: </span><span class="info-value" dir="ltr">${order.phone}</span></div><div class="info-item" style="grid-column:span 2;"><span class="info-label">العنوان: </span><span class="info-value">${order.address}</span></div></div></div>
                <div class="section"><div class="section-title">تفاصيل المنتجات</div><table><thead><tr><th>المنتج</th><th style="text-align:center;">الكمية</th><th style="text-align:center;">سعر الوحدة</th><th style="text-align:left;">المجموع</th></tr></thead><tbody>${itemsRows}</tbody></table></div>
                <div class="totals"><div class="total-row"><span>قيمة المنتجات</span><span>${order.subtotal.toLocaleString('en-US')} د.ع</span></div><div class="total-row"><span>أجور التوصيل</span><span>${order.delivery_fee.toLocaleString('en-US')} د.ع</span></div><div class="total-row grand"><span>المجموع الكلي</span><span class="amount">${order.total_rounded.toLocaleString('en-US')} د.ع</span></div></div>
                <div class="verification"><div class="label">كود التحقق</div><div class="code">${maskedCode}</div></div>
                <div class="footer"><p>تم إنشاء هذه القائمة عبر منصة جُملتي</p></div>
                <div class="no-print" style="text-align:center;margin-top:20px;"><button onclick="window.print()" style="background:#e85d26;color:#fff;border:none;padding:10px 32px;border-radius:8px;font-family:Cairo;font-size:14px;font-weight:700;cursor:pointer;">🖨️ طباعة</button></div>
              </div></body></html>`;
              const printWindow = window.open('', '_blank');
              if (printWindow) { printWindow.document.write(html); printWindow.document.close(); }
            }}
          >
            <span>🖨️</span>
            طباعة القائمة
          </Button>
        </div>
      )}
    </div>
  )
}
