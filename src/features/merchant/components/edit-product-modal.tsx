"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { editProductWithUnits, deleteProductAction } from "@/app/(merchant)/dashboard/actions"
import { Plus, X, Loader2, Edit, Trash2, CheckCircle2, Circle, AlertCircle } from "lucide-react"
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

export function EditProductModal({ product, categories = [] }: { product: any, categories?: {id: string, name: string}[] }) {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState<Unit[]>(product.units || (product.price ? [{ type: product.unit_type, price: product.price }] : []))
  const [categoryId, setCategoryId] = useState(product.category_id || "none")
  const [currentUnitType, setCurrentUnitType] = useState("كارتون")
  const [currentPrice, setCurrentPrice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  let stockMultiplier = 1;
  if (product.units) {
     const su = product.units.find((u: any) => u.type === (product.stock_unit || "كارتون"));
     if (su && su.multiplier_to_base) {
        stockMultiplier = su.multiplier_to_base;
     }
  }
  
  const initialStockQty = product.stock_quantity !== undefined && product.stock_quantity !== 0 ? Math.floor(product.stock_quantity / stockMultiplier) : "";

  // UOM State
  const [stockQuantity, setStockQuantity] = useState(initialStockQty.toString())
  const [stockUnit, setStockUnit] = useState(product.stock_unit || "كارتون")
  
  const [conversions, setConversions] = useState<Conversion[]>([])

  // Initialize conversions on open
  useEffect(() => {
    if (open) {
      const existingConversions = product.unit_conversions || []
      const initialConversions = existingConversions.length > 0 
        ? existingConversions.map((c: any) => ({
            id: Math.random().toString(),
            from: c.from,
            to: c.to,
            multiplier: c.multiplier.toString(),
            isConfirmed: true,
            isNoParts: false
          }))
        : [{
            id: Math.random().toString(),
            from: product.stock_unit || "كارتون",
            to: "",
            multiplier: "",
            isConfirmed: false,
            isNoParts: false
          }]
      setConversions(initialConversions)
      setStockUnit(product.stock_unit || "كارتون")
      setCategoryId(product.category_id || "none")
      let stockMultiplier = 1;
      if (product.units) {
         const su = product.units.find((u: any) => u.type === (product.stock_unit || "كارتون"));
         if (su && su.multiplier_to_base) {
            stockMultiplier = su.multiplier_to_base;
         }
      }
      const initialStockQty = product.stock_quantity !== undefined && product.stock_quantity !== 0 ? Math.floor(product.stock_quantity / stockMultiplier) : "";
      setStockQuantity(initialStockQty.toString())
      setUnits(product.units || (product.price ? [{ type: product.unit_type, price: product.price }] : []))
    }
  }, [open, product])

  useEffect(() => {
    if (open && conversions.length > 0 && conversions[0].from !== stockUnit) {
      setConversions([{
        id: Math.random().toString(),
        from: stockUnit,
        to: "",
        multiplier: "",
        isConfirmed: false,
        isNoParts: false
      }])
    }
  }, [stockUnit, open])

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
    newConversions[index].isConfirmed = false
    newConversions.splice(index + 1)
    setConversions(newConversions)
    setError("")
  }

  const handleConversionChange = (index: number, field: keyof Conversion, value: string) => {
    const newConversions = [...conversions]
    newConversions[index] = { ...newConversions[index], [field]: value, isConfirmed: false, isNoParts: false }
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

    let firstConv = conversions[0]
    if (!firstConv) {
      setError("يجب تحديد علاقة الكميات")
      return
    }

    if (!firstConv.isConfirmed && !firstConv.isNoParts) {
      if (firstConv.multiplier && firstConv.to && parseFloat(firstConv.multiplier) > 0) {
        firstConv.isConfirmed = true
      } else if (!firstConv.multiplier && !firstConv.to) {
        firstConv.isNoParts = true
      } else {
        setError("يرجى إكمال وتأكيد علاقة الوحدات (تحويل المخزون) أو اختيار 'بدون أجزاء'")
        return
      }
    }

    const validConversions = conversions.filter(c => c.isConfirmed).map(c => ({
      from: c.from,
      to: c.to,
      multiplier: parseFloat(c.multiplier)
    }))

    setIsSubmitting(true)
    setError("")

    formData.append("id", product.id)
    formData.append("units", JSON.stringify(units))
    formData.append("stock_unit", stockUnit)
    formData.append("unit_conversions", JSON.stringify(validConversions))
    formData.append("stock_quantity", stockQuantity)

    const result = await editProductWithUnits(formData)

    if (!result?.success) {
      setError(result?.error || "حدث خطأ أثناء التعديل")
      setIsSubmitting(false)
    } else {
      setIsSubmitting(false)
      setOpen(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return
    setIsDeleting(true)
    const result = await deleteProductAction(product.id)
    if (!result?.success) {
      setError(result?.error || "حدث خطأ أثناء الحذف")
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex gap-1.5 w-full mt-2">
        <DialogTrigger render={
          <Button variant="outline" className="flex-1 border-brand-orange text-brand-orange hover:bg-brand-orange/10 h-8 sm:h-9 text-[11px] sm:text-sm px-1 sm:px-4">
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2" /> تعديل
          </Button>
        } />
        <Button 
          variant="outline" 
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 border-destructive text-destructive hover:bg-destructive/10 h-8 sm:h-9 text-[11px] sm:text-sm px-1 sm:px-4"
        >
          {isDeleting ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2" /> حذف</>}
        </Button>
      </div>

      <DialogContent dir="rtl" className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">تعديل المنتج</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">اسم المادة</Label>
            <Input id="edit-name" name="name" defaultValue={product.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">وصف المادة</Label>
            <Input id="edit-description" name="description" defaultValue={product.description || ""} />
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
                  onChange={(e) => setStockQuantity(e.target.value.replace(/^0+(?=\d)/, ''))}
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

          <div className="space-y-2">
            <Label htmlFor="edit_min_stock_alert" className="flex items-center gap-1.5">
              <span>أقل كمية لإصدار تنبيه نفاد المخزون (اختياري)</span>
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </Label>
            <Input 
              id="edit_min_stock_alert" 
              name="min_stock_alert" 
              type="number" 
              min="0" 
              defaultValue={product.min_stock_alert || ""}
              dir="ltr" 
              className="text-right w-full sm:w-[200px]" 
            />
            <p className="text-xs text-muted-foreground">
              ضع القيمة صفر لإلغاء التنبيه. إذا كان المخزون أقل من هذه القيمة، سيظهر لك تنبيه في لوحة التحكم.
            </p>
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
                  <Plus className="h-4 w-4 ml-1" /> إضافة
                </Button>
              </div>
            </div>

            {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm font-bold flex items-center gap-2 mb-4"><AlertCircle className="w-4 h-4"/> {error}</div>}
          </div>

          <div className="space-y-2 pt-2 border-t mt-4">
            <Label htmlFor="edit-image">تغيير صورة المنتج (اختياري)</Label>
            <Input id="edit-image" name="image" type="file" accept="image/*" className="cursor-pointer" />
            {product.image_url && (
              <p className="text-xs text-muted-foreground mt-1">
                تجاهل هذا الحقل إذا كنت لا تريد تغيير الصورة الحالية.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full bg-brand-orange hover:bg-brand-orange/90 mt-4" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "حفظ التعديلات"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
