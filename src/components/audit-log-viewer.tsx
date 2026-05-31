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
  Clock
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
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void 
}) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTable, setSelectedTable] = useState<string>("all")
  
  const supabase = createClient()

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (selectedTable !== 'all') {
        query = query.eq('table_name', selectedTable)
      }

      if (searchTerm) {
        query = query.eq('record_id', searchTerm)
      }

      const { data, error } = await query

      if (error) throw error

      // جلب أسماء المستخدمين الذين قاموا بالتعديل
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(log => log.changed_by).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds)
          
          if (profiles) {
            const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]))
            data.forEach(log => {
              if (log.changed_by) {
                log.changer_name = profileMap[log.changed_by] || 'مستخدم غير معروف'
              }
            })
          }
        }
      }

      setLogs(data || [])
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
  }, [open, selectedTable])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="bg-slate-500/10 p-2 rounded-lg">
              <History className="w-5 h-5 text-slate-600" />
            </div>
            سجل الحركات (Audit Log)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="ابحث برقم المعرف (ID) للسجل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
              dir="ltr"
            />
          </div>
          <select 
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="h-10 px-3 bg-card border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">كل الجداول</option>
            <option value="orders">الطلبات (orders)</option>
            <option value="profiles">المستخدمين (profiles)</option>
            <option value="products">المنتجات (products)</option>
          </select>
          <Button onClick={fetchLogs} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </Button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد حركات مسجلة
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
                  <div className="text-xs text-muted-foreground font-mono mb-2" dir="ltr">
                    ID: {log.record_id}
                  </div>
                  
                  {log.action === 'UPDATE' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-muted-foreground">قبل التعديل</div>
                        <pre className="text-[10px] bg-red-500/5 text-red-700/80 p-3 rounded-lg overflow-x-auto border border-red-500/10" dir="ltr">
                          {JSON.stringify(log.old_data, null, 2)}
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-muted-foreground">بعد التعديل</div>
                        <pre className="text-[10px] bg-emerald-500/5 text-emerald-700/80 p-3 rounded-lg overflow-x-auto border border-emerald-500/10" dir="ltr">
                          {JSON.stringify(log.new_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-muted-foreground">البيانات المحذوفة</div>
                      <pre className="text-[10px] bg-red-500/5 text-red-700/80 p-3 rounded-lg overflow-x-auto border border-red-500/10" dir="ltr">
                        {JSON.stringify(log.old_data, null, 2)}
                      </pre>
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
