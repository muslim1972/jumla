"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, Package, MapPin, Phone, Printer, CheckCircle, Search, Calendar as CalendarIcon, Download } from "lucide-react"
import { cn } from "@/lib/utils"

// تهريب قيمة واحدة بصيغة CSV (التعامل مع علامات التنصيص والفواصل والأسطر الجديدة)
const escapeCsvField = (value: unknown): string => {
  const str = value === null || value === undefined ? "" : String(value)
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function ArchiveClient({ initialOrders, merchantName }: { initialOrders: any[], merchantName: string }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const handlePrintOrder = (order: any, dateStr: string) => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>فاتورة المشتري: ${order.store_name}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; text-align: right; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px dashed #ccc; }
            .title { font-size: 24px; font-weight: bold; margin: 0; }
            .info-row { margin-bottom: 8px; font-size: 14px; }
            table { w-full; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">فاتورة (مكتملة)</h1>
            <p>التاريخ: ${dateStr}</p>
            <p>التاجر: ${merchantName}</p>
          </div>
          <div class="info-row"><strong>المشتري:</strong> ${order.store_name}</div>
          <div class="info-row"><strong>رقم الفاتورة:</strong> ${order.invoice_number}</div>
          <div class="info-row"><strong>العنوان:</strong> ${order.address}</div>
          <div class="info-row"><strong>الهاتف:</strong> ${order.phone}</div>
          ${order.delivery_worker_name ? `<div class="info-row"><strong>المندوب:</strong> ${order.delivery_worker_name}</div>` : ''}
          
          <table style="width: 100%">
            <thead>
              <tr>
                <th>المادة</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>المجموع</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item: any) => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.quantity} ${item.unit_type}</td>
                  <td>${item.product_price}</td>
                  <td>${item.product_price * item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">المجموع الكلي: ${order.total_rounded.toLocaleString('en-US')} د.ع</div>
        </body>
      </html>
    `
    const printWindow = window.open('', '', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  // فلترة الطلبات
  const filteredOrders = initialOrders.filter(order => {
    const matchesSearch = order.store_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.phone.includes(searchTerm) || 
                          (order.invoice_number && order.invoice_number.toString().includes(searchTerm));
                          
    let matchesDate = true;
    if (dateFilter) {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      matchesDate = orderDate === dateFilter;
    }

    return matchesSearch && matchesDate;
  });

  // تصدير الطلبات المعروضة إلى ملف CSV يدعم العربية (مع BOM للتوافق مع Excel)
  const handleExportCsv = () => {
    const headers = ["رقم الفاتورة", "التاريخ", "المشتري", "عدد الأصناف", "المجموع", "الحالة"]
    const rows = filteredOrders.map(order => [
      order.invoice_number ?? "",
      new Date(order.created_at).toLocaleString("ar-IQ"),
      order.store_name,
      order.items?.length ?? 0,
      order.total_rounded,
      "مكتمل",
    ])
    const csvContent = "\uFEFF" + [headers, ...rows]
      .map(row => row.map(escapeCsvField).join(","))
      .join("\r\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    link.href = url
    link.download = `archive-jumla-${today}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="ابحث باسم المشتري، رقم الهاتف، أو رقم الفاتورة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-9"
          />
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          تم العثور على {filteredOrders.length} طلب
        </div>
        <Button onClick={handleExportCsv} variant="outline" className="gap-2 shrink-0">
          <Download className="w-4 h-4" />
          تصدير CSV
        </Button>
      </div>

      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <ArchiveOrderCard 
              key={order.id} 
              order={order} 
              onPrint={() => handlePrintOrder(order, new Date(order.created_at).toLocaleString('ar-IQ'))} 
            />
          ))
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border/50">
            <p className="text-muted-foreground">لم يتم العثور على طلبات مكتملة تطابق بحثك.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ArchiveOrderCard({ order, onPrint }: { order: any, onPrint: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border rounded-xl bg-card overflow-hidden transition-all duration-300 shadow-sm w-full border-emerald-500/20 hover:border-emerald-500/40">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between p-4 text-right cursor-pointer"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-brand-blue">{order.store_name}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> مكتمل
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{order.address}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono" dir="ltr">
            <Phone className="w-3.5 h-3.5" />
            <span>{order.phone}</span>
          </div>
        </div>
        <div className="text-left shrink-0 flex flex-col items-end">
          <div className="font-black text-brand-orange tabular-nums">
            {order.total_rounded.toLocaleString('en-US')} د.ع
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
            {new Date(order.created_at).toLocaleTimeString('ar-IQ')}
          </div>
          <div className="text-muted-foreground mt-2">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t bg-muted/10 animate-in slide-in-from-top-2">
          {/* قائمة المواد */}
          {order.items && order.items.length > 0 && (
            <div className="border border-border/50 shadow-sm rounded-lg overflow-hidden bg-card mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground">
                    <th className="text-right p-2 font-semibold">المنتج</th>
                    <th className="text-center p-2 font-semibold">الكمية</th>
                    <th className="text-left p-2 font-semibold">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: any, idx: number) => (
                    <tr key={item.id} className={idx < order.items.length - 1 ? "border-b border-dashed border-border/50" : ""}>
                      <td className="p-2">
                        <span className="font-medium text-brand-blue dark:text-foreground">{item.product_name}</span>
                        <span className="text-[10px] text-muted-foreground mr-1">({item.unit_type})</span>
                      </td>
                      <td className="text-center p-2 font-bold tabular-nums text-brand-orange">{item.quantity}</td>
                      <td className="text-left p-2 font-bold tabular-nums text-brand-blue dark:text-foreground">
                        {(item.product_price * item.quantity).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* معلومات التوصيل */}
          {order.delivery_worker_name && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md mb-4 flex items-center justify-between">
              <span>تم التوصيل بواسطة: <strong>{order.delivery_worker_name}</strong></span>
              {order.delivered_at && <span>{new Date(order.delivered_at).toLocaleString('ar-IQ')}</span>}
            </div>
          )}

          {/* الإجراءات */}
          <div className="pt-2 border-t border-border/50 flex items-center gap-2">
            <Button 
              onClick={(e) => { e.stopPropagation(); onPrint(); }} 
              variant="outline" 
              className="flex-1 flex items-center justify-center gap-2 bg-white"
            >
              <Printer className="w-4 h-4" />
              طباعة القائمة
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
