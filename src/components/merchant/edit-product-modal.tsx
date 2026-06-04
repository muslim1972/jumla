"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { editProductWithUnits, deleteProductAction } from "@/app/(merchant)/dashboard/actions"
import { Plus, X, Loader2, Edit, Trash2 } from "lucide-react"

type Unit = { type: string, price: number }

export function EditProductModal({ product }: { product: any }) {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState<Unit[]>(product.units || (product.price ? [{ type: product.unit_type, price: product.price }] : []))
  const [currentUnitType, setCurrentUnitType] = useState("كارتون")
  const [currentPrice, setCurrentPrice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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

    formData.append("id", product.id)
    formData.append("units", JSON.stringify(units))
    const result = await editProductWithUnits(formData)

    if (!result?.success) {
      setError(result?.error || "حدث خطأ أثناء التعديل")
    } else {
      setOpen(false)
    }
    setIsSubmitting(false)
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
      <div className="flex gap-2 w-full mt-2">
        <DialogTrigger render={
          <Button variant="outline" className="flex-1 border-brand-orange text-brand-orange hover:bg-brand-orange/10">
            <Edit className="w-4 h-4 ml-2" /> تعديل
          </Button>
        } />
        <Button 
          variant="outline" 
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 ml-2" /> حذف</>}
        </Button>
      </div>

      <DialogContent dir="rtl" className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
