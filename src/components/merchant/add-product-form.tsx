"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { addProductWithUnits } from "@/app/(merchant)/dashboard/actions"
import { Plus, X, Loader2, CheckCircle2, Circle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Unit = { type: string, price: number }

type Conversion = {
  id: string;
  from: string;
  to: string;
  multiplier: string;
  isConfirmed: boolean;
  isNoParts: boolean;
}

const UNIT_OPTIONS = [
  "كارتون", "تكة", "باكيت", "درزن", "نصف درزن", "مفرد", "كيلو", "كيس", "علبة"
]

export function AddProductForm({ disabled, categories = [] }: { disabled: boolean, categories?: {id: string, name: string}[] }) {
  const [units, setUnits] = useState<Unit[]>([])
  const [currentUnitType, setCurrentUnitType] = useState("كارتون")
  const [currentPrice, setCurrentPrice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // UOM State
  const [stockQuantity, setStockQuantity] = useState("0")
  const [stockUnit, setStockUnit] = useState("كارتون")
  const [categoryId, setCategoryId] = useState("none")
  const [conversions, setConversions] = useState<Conversion[]>([])

  useEffect(() => {
    // Reset conversions if stock unit changes and there are no confirmed conversions yet
    // Or if the first conversion doesn't match the stock unit
    if (conversions.length === 0 || conversions[0].from !== stockUnit) {
      setConversions([{
        id: Math.random().toString(),
        from: stockUnit,
        to: "",
        multiplier: "",
        isConfirmed: false,
        isNoParts: false
      }])
    }
  }, [stockUnit])

  const handleAddUnit = () => {
    const priceNum = parseFloat(currentPrice)
    if (!priceNum || priceNum <= 0) {
      setError("الرجاء إدخال سعر صحيح للكمية")
      return
    }

    if (units.some(u => u.type === currentUnitType)) {
      setError("هذه الوحدة مضافة مسبقاً لهذا المنتج")
      return
    }

    setUnits([...units, { type: currentUnitType, price: priceNum }])
    setCurrentPrice("")
    setError("")
  }

  const handleRemoveUnit = (type: string) => {
    setUnits(units.filter(u => u.type !== type))
  }

  const handleConfirmConversion = (index: number) => {
    const conv = conversions[index]
    if (!conv.multiplier || parseFloat(conv.multiplier) <= 0 || !conv.to) {
      setError("يجب إدخال المعامل واختيار الوحدة الأصغر بشكل صحيح")
      return
    }
    if (conv.to === conv.from) {
      setError("لا يمكن التحويل لنفس الوحدة")
      return
    }

    const newConversions = [...conversions]
    newConversions[index].isConfirmed = true
    newConversions[index].isNoParts = false

    // Add next row if it doesn't exist
    if (index === newConversions.length - 1) {
      newConversions.push({
        id: Math.random().toString(),
        from: conv.to,
        to: "",
        multiplier: "",
        isConfirmed: false,
        isNoParts: false
      })
    }
    
    setConversions(newConversions)
    setError("")
  }

  const handleNoParts = (index: number) => {
    const newConversions = [...conversions]
    newConversions[index].isNoParts = true
    newConversions[index].isConfirmed = false // It's no parts, so it's not a standard confirmed relationship
    // Remove any subsequent rows
    newConversions.splice(index + 1)
    setConversions(newConversions)
    setError("")
  }

  const handleConversionChange = (index: number, field: keyof Conversion, value: string) => {
    const newConversions = [...conversions]
    newConversions[index] = { ...newConversions[index], [field]: value, isConfirmed: false, isNoParts: false }
    // If they edit a confirmed row, remove subsequent rows to force them to rebuild the chain
    if (conversions[index].isConfirmed || conversions[index].isNoParts) {
      newConversions.splice(index + 1)
    }
    setConversions(newConversions)
  }

  const handleSubmit = async (formData: FormData) => {
    if (units.length === 0) {
      setError("يجب إضافة كمية واحدة وسعرها على الأقل")
      return
    }

    // Validate Conversions
    const firstConv = conversions[0]
    if (!firstConv) {
      setError("يجب تحديد علاقة الكميات")
      return
    }

    if (!firstConv.isConfirmed && !firstConv.isNoParts) {
      setError("يجب تأكيد علاقة المخزون الأولى (بالضغط على علامة الصح أو زر بدون أجزاء)")
      return
    }

    const validConversions = conversions.filter(c => c.isConfirmed).map(c => ({
      from: c.from,
      to: c.to,
      multiplier: parseFloat(c.multiplier)
    }))

    setIsSubmitting(true)
    setError("")

    formData.append("units", JSON.stringify(units))
    formData.append("stock_unit", stockUnit)
    formData.append("unit_conversions", JSON.stringify(validConversions))
    
    const result = await addProductWithUnits(formData)

    if (!result?.success) {
      setError(result?.error || "حدث خطأ أثناء الإضافة")
      setIsSubmitting(false)
    } else {
      // Reset form
      setUnits([])
      setCurrentPrice("")
      setCurrentUnitType("كارتون")
      setStockQuantity("0")
      setStockUnit("كارتون")
      setCategoryId("none")
      setConversions([])
      setIsSubmitting(false)
      const form = document.getElementById("add-product-form") as HTMLFormElement
      if (form) form.reset()
    }
  }

  return (
    <Card className={disabled ? "opacity-50 pointer-events-none" : "sticky top-16"}>
      <CardHeader>
        <CardTitle>إضافة منتج جديد</CardTitle>
        <CardDescription>قم بإضافة منتجاتك للبيع بالجملة</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="add-product-form" action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم المادة</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">وصف المادة</Label>
            <Input id="description" name="description" />
          </div>

          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="category_id">القسم (اختياري)</Label>
              <Select name="category_id" value={categoryId} onValueChange={(val) => setCategoryId(val || "none")}>
                <SelectTrigger dir="rtl">
                  <span className="flex-1 text-right truncate text-sm">
                    {categoryId === "none" ? "بدون قسم" : (categories?.find(c => c.id === categoryId)?.name || "اختر القسم")}
                  </span>
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون قسم</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1">
              <Label htmlFor="stock_quantity">الكمية المتوفرة في المخزن</Label>
              <div className="flex gap-2">
                <Input 
                  id="stock_quantity" 
                  name="stock_quantity" 
                  type="number" 
                  min="0" 
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  required 
                  dir="ltr" 
                  className="text-right flex-1" 
                />
                <Select value={stockUnit} onValueChange={(val) => setStockUnit(val || "كارتون")}>
                  <SelectTrigger dir="rtl" className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {UNIT_OPTIONS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Unit Conversions Section */}
          <div className="space-y-3 pt-2 border-t mt-4 bg-muted/10 p-3 rounded-lg border border-dashed border-border/60">
            <div className="flex items-center gap-2">
              <Label className="text-brand-blue font-bold">علاقات الوحدات (تحويل المخزون)</Label>
              <AlertCircle className="w-4 h-4 text-brand-orange" />
            </div>
            <p className="text-xs text-muted-foreground">
              حدد مكونات الوحدة لتتمكن المنظومة من خصم المخزون بشكل صحيح عند البيع بالوحدات الأصغر.
            </p>
            
            <div className="flex flex-col gap-3">
              {conversions.map((conv, index) => (
                <div key={conv.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-background p-2 rounded-md border shadow-sm relative">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="font-bold text-sm bg-muted px-2 py-1.5 rounded-md min-w-[60px] text-center border shrink-0">
                      1 {conv.from}
                    </span>
                    <span className="text-muted-foreground font-black shrink-0">=</span>
                    <Input 
                      type="number" 
                      placeholder="؟" 
                      className="w-16 h-9 text-center font-bold shrink-0"
                      value={conv.multiplier}
                      onChange={(e) => handleConversionChange(index, "multiplier", e.target.value)}
                      disabled={conv.isNoParts}
                    />
                    <Select 
                      value={conv.to} 
                      onValueChange={(val) => handleConversionChange(index, "to", val || "")}
                      disabled={conv.isNoParts}
                    >
                      <SelectTrigger dir="rtl" className="h-9 min-w-[90px] flex-1">
                        <SelectValue placeholder="وحدة" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {UNIT_OPTIONS.filter(u => u !== conv.from).map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-none shrink-0 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfirmConversion(index)}
                      disabled={conv.isNoParts}
                      className={cn(
                        "h-9 px-2.5 font-bold transition-all",
                        conv.isConfirmed 
                          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700" 
                          : "text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600"
                      )}
                    >
                      {conv.isConfirmed ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      {conv.isConfirmed ? "" : "تأكيد"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleNoParts(index)}
                      className={cn(
                        "h-9 px-2.5 text-[11px] font-bold transition-all",
                        conv.isNoParts && "bg-muted text-muted-foreground border-dashed"
                      )}
                    >
                      {conv.isNoParts ? "بدون أجزاء" : "بدون أجزاء"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t mt-4">
            <Label>الأسعار لكل وحدة</Label>
            
            <div className="flex flex-col gap-2 p-3 bg-muted/30 border rounded-lg">
              {units.map((unit, index) => (
                <div key={index} className="flex items-center gap-2 bg-background p-2 rounded-md border">
                  <span className="font-medium text-sm flex-1">{unit.type}</span>
                  <span className="text-brand-orange font-bold flex-1" dir="ltr">{unit.price.toLocaleString('en-US')} د.ع</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemoveUnit(unit.type)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex gap-2 items-end mt-2">
                <div className="space-y-1.5 flex-1">
                  <Select value={currentUnitType} onValueChange={(val) => setCurrentUnitType(val || "")}>
                    <SelectTrigger dir="rtl" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                       {UNIT_OPTIONS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Input 
                    type="number" 
                    placeholder="السعر د.ع" 
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    dir="ltr"
                    className="h-10 text-right"
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={handleAddUnit}
                  variant="secondary"
                  className="h-10 shrink-0"
                >
                  <Plus className="h-4 w-4" /> إضافة
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>

          <div className="space-y-2 pt-2 border-t mt-4">
            <Label htmlFor="image">صورة المنتج (اختياري)</Label>
            <Input id="image" name="image" type="file" accept="image/*" className="cursor-pointer" />
          </div>

          <Button type="submit" className="w-full bg-brand-orange hover:bg-brand-orange/90" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "نشر المنتج"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
