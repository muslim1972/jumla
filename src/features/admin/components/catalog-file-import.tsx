"use client"

import { useState, useTransition } from "react"
import * as XLSX from "xlsx"
import { AlertCircle, Check, FileUp, Loader2, Table } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { checkExternalProductRows } from "@/features/admin/actions/catalog-import-actions"

interface CatalogFileImportProps {
  categories: { id: string; name: string }[]
}

export function CatalogFileImport({ categories }: CatalogFileImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [data, setData] = useState<any[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: "",
    description: "",
    barcode: "",
  })
  const [report, setReport] = useState<{ total: number; valid: number; duplicates: number } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFile(file)
    setError("")
    setReport(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        
        if (json.length > 0) {
          const headers = json[0].map(String)
          setHeaders(headers)
          const rows = XLSX.utils.sheet_to_json(ws)
          setData(rows)
          
          // Auto-mapping attempt
          const newMapping = { ...mapping }
          headers.forEach(h => {
            const lower = h.toLowerCase()
            if (lower.includes("اسم") || lower.includes("name")) newMapping.name = h
            if (lower.includes("وصف") || lower.includes("desc")) newMapping.description = h
            if (lower.includes("باركود") || lower.includes("barcode") || lower.includes("رمز")) newMapping.barcode = h
          })
          setMapping(newMapping)
        }
      } catch (err) {
        setError("تعذر قراءة ملف Excel. تأكد من التنسيق.")
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleCheck = () => {
    if (!mapping.name) {
      setError("يجب تحديد عمود اسم المادة على الأقل.")
      return
    }
    setError("")
    startTransition(async () => {
      const rowsToCheck = data.map(row => ({
        name: String(row[mapping.name] || ""),
        description: mapping.description ? String(row[mapping.description] || "") : null
      })).filter(r => r.name)

      const result = await checkExternalProductRows(rowsToCheck)
      if (!result.success) {
        setError(result.error)
        return
      }

      setReport({
        total: data.length,
        valid: data.length - result.duplicateIndexes.length,
        duplicates: result.duplicateIndexes.length
      })
    })
  }

  const dbColumns = [
    { key: "name", label: "اسم المادة", required: true },
    { key: "description", label: "الوصف", required: false },
    { key: "barcode", label: "الباركود", required: false },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>استيراد مواد من ملف Excel</CardTitle>
          <CardDescription>
            ارفع ملف Excel يحتوي على بيانات المواد لربطها مع قاعدة بيانات النظام وفحصها قبل الاستيراد.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <Button variant="outline" className="w-full">
                <FileUp className="ml-2 h-4 w-4" />
                {file ? file.name : "اختر ملف Excel"}
              </Button>
            </div>
            {file && (
              <Button onClick={handleCheck} disabled={isPending}>
                {isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Check className="ml-2 h-4 w-4" />}
                بدء الفحص والمعاينة
              </Button>
            )}
          </div>

          {headers.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Table className="h-4 w-4" /> أعمدة قاعدة البيانات (الهدف)
                </h3>
                <div className="space-y-4">
                  {dbColumns.map(col => (
                    <div key={col.key} className="flex items-center justify-between gap-4">
                      <span className="text-sm">
                        {col.label} {col.required && <span className="text-destructive">*</span>}
                      </span>
                      <Select 
                        value={mapping[col.key]} 
                        onValueChange={(val) => setMapping(prev => ({ ...prev, [col.key]: val || "" }))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="اختر عمود الملف" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- لا يوجد --</SelectItem>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> تقرير الفحص
                </h3>
                {report ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>إجمالي القيود في الملف:</span>
                      <span className="font-bold">{report.total}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>قيود جديدة قابلة للاستيراد:</span>
                      <span className="font-bold">{report.valid}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>قيود مكررة أو موجودة مسبقاً:</span>
                      <span className="font-bold">{report.duplicates}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      * يتم الفحص بناءً على مطابقة الاسم والوصف مع المواد الموجودة في Pool.
                    </p>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-muted-foreground text-center">
                    قم بربط الأعمدة ثم اضغط على "بدء الفحص" لإظهار التقرير.
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
