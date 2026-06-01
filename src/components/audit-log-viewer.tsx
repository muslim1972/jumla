"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  History, 
  Search, 
  Loader2, 
  Calendar,
  Database,
  ArrowRightLeft,
  User,
  Clock,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_data: any
  new_data: any
  changed_by: string
  created_at: string
  changer_name?: string
}

export function AuditLogViewer({ 
  open, 
  onOpenChange,
  initialRecordId = ""
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void 
  initialRecordId?: string
}) {
  const renderDataList = (data: any) => {
    if (!data) return <div className="text-muted-foreground italic text-xs">لا توجد بيانات</div>;
    
    return (
      <ul className="space-y-1.5 w-full">
        {Object.entries(data).map(([key, value]) => {
          let displayValue = String(value);
          if (value === null) displayValue = "فارغ (null)";
          else if (typeof value === "object") displayValue = JSON.stringify(value);
          
          return (
            <li key={key} className="flex flex-col sm:flex-row sm:gap-2 text-[11px] border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
              <span className="font-bold text-muted-foreground sm:w-1/3 truncate" title={key}>{key}:</span>
              <span className="text-foreground flex-1 break-all sm:break-words font-mono" dir="ltr" title={String(value)}>
                {displayValue}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(initialRecordId)
  const [selectedTable, setSelectedTable] = useState<string>("all")
  
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      setSearchTerm(initialRecordId)
    }
  }, [open, initialRecordId])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200) // جلب عدد أكبر للبحث الداخلي

      if (selectedTable !== 'all') {
        query = query.eq('table_name', selectedTable)
      }

      if (fromDate) {
        query = query.gte('created_at', new Date(fromDate).toISOString())
      }
      
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        query = query.lte('created_at', end.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // جلب أسماء المستخدمين الذين قاموا بالتعديل
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(log => log.changed_by).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, store_name')
            .in('id', userIds)
          
          if (profiles) {
            const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || p.store_name]))
            data.forEach(log => {
              if (log.changed_by) {
                log.changer_name = profileMap[log.changed_by] || 'مستخدم غير معروف'
              }
            })
          }
        }
      }

      // الفلترة الذكية (النصية) محلياً
      let filteredData = data || []
      const term = searchTerm.trim().toLowerCase()
      if (term) {
        filteredData = filteredData.filter(log => {
          return (
            log.record_id.toLowerCase().includes(term) ||
            (log.changer_name && log.changer_name.toLowerCase().includes(term)) ||
            JSON.stringify(log.old_data || {}).toLowerCase().includes(term) ||
            JSON.stringify(log.new_data || {}).toLowerCase().includes(term)
          )
        })
      }

      setLogs(filteredData)
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchLogs()
    }
  }, [open, selectedTable]) // نعيد الجلب فقط عند تغيير الجدول أو الفتح

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="bg-slate-500/10 p-2 rounded-lg">
              <History className="w-5 h-5 text-slate-600" />
            </div>
            سجل الحركات (Audit Log)
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-2">
            <Filter className="w-4 h-4" />
            فلاتر البحث
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-[2]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث بأي معلومة (اسم المشتري، رقم الهاتف، رقم الوصل...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                className="pr-9 h-10 border-brand-orange/30 focus-visible:ring-brand-orange text-xs sm:text-sm"
              />
            </div>
            <select 
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="h-10 px-3 bg-card border border-border/50 rounded-md text-sm outline-none focus:ring-2 focus:ring-brand-orange flex-1"
            >
              <option value="all">كل الجداول</option>
              <option value="orders">الطلبات (orders)</option>
              <option value="profiles">المستخدمين (profiles)</option>
              <option value="products">المنتجات (products)</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-bold px-1">من تاريخ</label>
              <Input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-bold px-1">إلى تاريخ</label>
              <Input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <Button onClick={fetchLogs} disabled={isLoading} className="h-9 bg-brand-orange hover:bg-brand-orange/90 text-white w-full sm:w-auto px-8">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Search className="w-4 h-4 ml-2" />}
              تطبيق البحث
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              لا توجد حركات مسجلة تطابق بحثك
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="border-border/40 shadow-sm overflow-hidden">
                <div className="bg-muted/30 p-3 border-b flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                      {log.action}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded border">
                      <Database className="w-3 h-3" />
                      {log.table_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {log.changer_name || 'النظام'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.created_at).toLocaleString('ar-IQ')}
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="text-[10px] text-muted-foreground font-mono mb-3 bg-muted/50 p-1.5 rounded inline-block break-all max-w-full" dir="ltr">
                    ID: {log.record_id}
                  </div>
                  
                  {log.action === 'UPDATE' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="text-xs font-bold text-muted-foreground bg-red-500/10 text-red-700 px-2 py-1 rounded-md inline-block">قبل التعديل</div>
                        <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/10 w-full overflow-hidden">
                          {renderDataList(log.old_data)}
                        </div>
                      </div>
                      <div className="space-y-2 min-w-0">
                        <div className="text-xs font-bold text-muted-foreground bg-emerald-500/10 text-emerald-700 px-2 py-1 rounded-md inline-block">بعد التعديل</div>
                        <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 w-full overflow-hidden">
                          {renderDataList(log.new_data)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 min-w-0">
                      <div className="text-xs font-bold text-muted-foreground bg-red-500/10 text-red-700 px-2 py-1 rounded-md inline-block">البيانات المحذوفة</div>
                      <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/10 w-full overflow-hidden">
                        {renderDataList(log.old_data)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
