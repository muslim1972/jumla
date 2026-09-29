"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, Search, Loader2, Package, TrendingUp, Award, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getMaterialsProductivity, type ProductivityRecord } from "@/features/admin/actions/employee-productivity-actions"

export function MaterialsProductivity() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // أول يوم في الشهر
    return d.toISOString().split("T")[0]
  })
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })

  const [records, setRecords] = useState<ProductivityRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProductivity = useCallback(async () => {
    if (!startDate || !endDate) return

    setIsLoading(true)
    setError(null)
    try {
      const data = await getMaterialsProductivity(startDate, endDate)
      setRecords(data)
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء جلب البيانات")
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchProductivity()
  }, [fetchProductivity])

  const totalProducts = records.reduce((sum, r) => sum + r.productsAdded, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-blue" />
            أداء موظفي إدارة المواد
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            متابعة عدد المواد (القيود الناجحة) التي أضافها كل موظف لحساب الأجور والمكافآت.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2 rounded-xl border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-[130px] text-xs bg-background"
            />
          </div>
          <span className="text-muted-foreground text-sm">إلى</span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-[130px] text-xs bg-background"
            />
          </div>
          <Button
            size="sm"
            onClick={fetchProductivity}
            disabled={isLoading}
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-white shadow-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-600 rounded-xl flex items-center gap-2 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {!isLoading && records.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gradient-to-br from-brand-blue/5 to-transparent border-brand-blue/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-blue" />
                إجمالي الإضافات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalProducts.toLocaleString("en-US")}</div>
              <p className="text-xs text-muted-foreground mt-1">مادة مضافة خلال الفترة المحددة</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse shadow-sm">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-muted rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))
        ) : records.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-card rounded-xl border border-dashed">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground">لا توجد بيانات</h3>
            <p className="text-muted-foreground text-sm mt-1">لا يوجد موظفون أو لم يتم إضافة مواد في هذه الفترة.</p>
          </div>
        ) : (
          records.map((record, index) => {
            const isTop = index === 0 && record.productsAdded > 0
            
            return (
              <Card key={record.employeeId} className={isTop ? "border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm relative overflow-hidden" : "shadow-sm relative overflow-hidden"}>
                {isTop && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100 dark:bg-amber-900/40 rounded-bl-full -mr-8 -mt-8 flex items-end justify-start p-3">
                    <Award className="w-5 h-5 text-amber-500 mt-6 ml-6" />
                  </div>
                )}
                
                <CardHeader className="pb-2 relative z-10">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {record.employeeName}
                  </CardTitle>
                  <CardDescription>موظف إدارة مواد</CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black tracking-tight text-brand-blue">
                      {record.productsAdded.toLocaleString("en-US")}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">قيد ناجح</span>
                  </div>
                  
                  {isTop && (
                    <div className="mt-4 text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/40 inline-flex px-2 py-1 rounded-md">
                      الأعلى إنتاجية في هذه الفترة 🏆
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
