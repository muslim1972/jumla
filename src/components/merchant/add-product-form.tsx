"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { addProductWithUnits } from "@/app/(merchant)/dashboard/actions"
import { Plus, X, Loader2 } from "lucide-react"

type Unit = { type: string, price: number }

export function AddProductForm({ disabled }: { disabled: boolean }) {
  const [units, setUnits] = useState<Unit[]>([])
  const [currentUnitType, setCurrentUnitType] = useState("كارتون")
  const [currentPrice, setCurrentPrice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

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

  const handleSubmit = async (formData: FormData) => {
    if (units.length === 0) {
      setError("يجب إضافة كمية واحدة وسعرها على الأقل")
      return
    }

    setIsSubmitting(true)
    setError("")

    formData.append("units", JSON.stringify(units))
    const result = await addProductWithUnits(formData)

    if (!result?.success) {
      setError(result?.error || "حدث خطأ أثناء الإضافة")
      setIsSubmitting(false)
    } else {
      // Reset form
      setUnits([])
      setCurrentPrice("")
      setCurrentUnitType("كارتون")
      setIsSubmitting(false)
      const form = document.getElementById("add-product-form") as HTMLFormElement
      if (form) form.reset()
    }
  }

  return (
    <Card className={disabled ? "opacity-50 pointer-events-none" : "sticky top-24"}>
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

          <div className="space-y-3 pt-2 border-t mt-4">
            <Label>الكميات والأسعار</Label>
            
            <div className="flex flex-col gap-2 p-3 bg-muted/30 border rounded-lg">
              {units.map((unit, index) => (
                <div key={index} className="flex items-center gap-2 bg-background p-2 rounded-md border">
                  <span className="font-medium text-sm flex-1">{unit.type}</span>
                  <span className="text-brand-orange font-bold flex-1" dir="ltr">{unit.price.toLocaleString()} د.ع</span>
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
                      <SelectItem value="كارتون">كارتون</SelectItem>
                      <SelectItem value="تكة">تكة</SelectItem>
                      <SelectItem value="باكيت">باكيت</SelectItem>
                      <SelectItem value="درزن">درزن</SelectItem>
                      <SelectItem value="نصف درزن">نصف درزن</SelectItem>
                      <SelectItem value="مفرد">مفرد</SelectItem>
                      <SelectItem value="كيلو">كيلو</SelectItem>
                      <SelectItem value="كيس">كيس</SelectItem>
                      <SelectItem value="علبة">علبة</SelectItem>
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
                  className="h-10"
                >
                  <Plus className="h-4 w-4 ml-1" /> إضافة
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>

          <div className="space-y-2 pt-2">
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
