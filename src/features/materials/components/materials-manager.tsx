"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createMasterProduct, editMasterProduct, deleteMasterProduct } from "@/features/materials/actions"
import { validateBarcode } from "@/features/materials/lib/barcode"
import { Plus, X, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Search, Pencil, Trash2, Package } from "lucide-react"
import { cn } from "@/lib/utils"

type MasterUnit = { type: string, multiplier_to_base: number }

export type MasterProduct = {
  id: string
  name: string
  description: string | null
  category_id: string | null
  categories?: { name: string } | null
  image_url: string | null
  barcode: string | null
  base_price: number | null
  units: MasterUnit[]
  unit_conversions: { from: string, to: string, multiplier: number }[]
}

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

const emptyConversion = (from: string): Conversion => ({
  id: Math.random().toString(),
  from,
  to: "",
  multiplier: "",
  isConfirmed: false,
  isNoParts: false
})

function buildConversionsFromInitial(initial?: MasterProduct): Conversion[] {
  if (!initial?.unit_conversions?.length) {
    return [emptyConversion(initial?.units?.[0]?.type || "كارتون")]
  }
  const rows: Conversion[] = initial.unit_conversions.map(c => ({
    id: Math.random().toString(),
    from: c.from,
    to: c.to,
    multiplier: String(c.multiplier),
    isConfirmed: true,
    isNoParts: false
  }))
  rows.push(emptyConversion(rows[rows.length - 1].to))
  return rows
}

// نموذج موحد يُستخدم للإضافة وللتعديل (Dialog)
function MasterProductForm({
  categories,
  initial,
  formId,
  submitLabel,
  onSubmit,
  onSuccess,
}: {
  categories: { id: string, name: string }[]
  initial?: MasterProduct
  formId: string
  submitLabel: string
  onSubmit: (formData: FormData) => Promise<{ success: boolean, error?: string } | undefined>
  onSuccess?: () => void
}) {
  const [name, setName] = useState(initial?.name || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [categoryId, setCategoryId] = useState(initial?.category_id || "none")
  const [barcode, setBarcode] = useState(initial?.barcode || "")
  const [barcodeError, setBarcodeError] = useState("")
  const [basePrice, setBasePrice] = useState(initial?.base_price != null ? String(initial.base_price) : "")
  const [image, setImage] = useState<File | null>(null)

  const [units, setUnits] = useState<{ type: string }[]>(
    initial?.units?.map(u => ({ type: u.type })) || []
  )
  const [currentUnitType, setCurrentUnitType] = useState("كارتون")
  const [conversions, setConversions] = useState<Conversion[]>(() => buildConversionsFromInitial(initial))
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // الوحدة المرجعية لبداية سلسلة التحويلات = أول وحدة مضافة
  const [hasSavedConversions] = useState(!!initial?.unit_conversions?.length)
  useEffect(() => {
    if (hasSavedConversions) return
    const anchor = units[0]?.type || "كارتون"
    if (conversions.length === 0 || conversions[0].from !== anchor) {
      setConversions([emptyConversion(anchor)])
    }
  }, [units, conversions, hasSavedConversions])

  const handleAddUnit = () => {
    if (units.some(u => u.type === currentUnitType)) {
      setFormError("هذه الوحدة مضافة مسبقاً لهذه المادة")
      return
    }
    setUnits([...units, { type: currentUnitType }])
    setFormError("")
  }

  const handleRemoveUnit = (type: string) => {
    setUnits(units.filter(u => u.type !== type))
  }

  const handleConfirmConversion = (index: number) => {
    const conv = conversions[index]
    if (!conv.multiplier || parseFloat(conv.multiplier) <= 0 || !conv.to) {
      setFormError("يجب إدخال المعامل واختيار الوحدة الأصغر بشكل صحيح")
      return
    }
    if (conv.to === conv.from) {
      setFormError("لا يمكن التحويل لنفس الوحدة")
      return
    }

    const newConversions = [...conversions]
    newConversions[index].isConfirmed = true
    newConversions[index].isNoParts = false

    if (index === newConversions.length - 1) {
      newConversions.push(emptyConversion(conv.to))
    }

    setConversions(newConversions)
    setFormError("")
  }

  const handleNoParts = (index: number) => {
    const newConversions = [...conversions]
    newConversions[index].isNoParts = true
    newConversions[index].isConfirmed = false
    newConversions.splice(index + 1)
    setConversions(newConversions)
    setFormError("")
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
    if (!name.trim()) {
      setFormError("اسم المادة مطلوب")
      return
    }

    if (units.length === 0) {
      setFormError("يجب إضافة وحدة واحدة على الأقل")
      return
    }

    // التحقق من سلسلة التحويلات
    const firstConv = conversions[0]
    if (!firstConv) {
      setFormError("يجب تحديد علاقة الوحدات")
      return
    }
    if (!firstConv.isConfirmed && !firstConv.isNoParts) {
      if (firstConv.multiplier && firstConv.to && parseFloat(firstConv.multiplier) > 0) {
        firstConv.isConfirmed = true
      } else if (!firstConv.multiplier && !firstConv.to) {
        firstConv.isNoParts = true
      } else {
        setFormError("يرجى إكمال وتأكيد علاقة الوحدات أو اختيار 'بدون أجزاء'")
        return
      }
    }
    const validConversions = conversions
      .filter(c => c.isConfirmed)
      .map(c => ({ from: c.from, to: c.to, multiplier: parseFloat(c.multiplier) }))

    // التحقق من الباركود (اختياري لكن يجب أن يكون صحيحاً إن وُجد)
    const bcError = validateBarcode(barcode)
    if (bcError) {
      setBarcodeError(bcError)
      setFormError(bcError)
      return
    }

    setIsSubmitting(true)
    setFormError("")

    formData.append("units", JSON.stringify(units))
    formData.append("unit_conversions", JSON.stringify(validConversions))

    const result = await onSubmit(formData)
    setIsSubmitting(false)

    if (!result?.success) {
      setFormError(result?.error || "حدث خطأ أثناء الحفظ")
    } else {
      onSuccess?.()
    }
  }

  return (
    <form id={formId} action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${formId}-name`}>اسم المادة</Label>
        <Input id={`${formId}-name`} name="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-description`}>وصف المادة</Label>
        <Input id={`${formId}-description`} name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-2 flex-1">
          <Label htmlFor={`${formId}-category`}>القسم (اختياري)</Label>
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
          <Label htmlFor={`${formId}-barcode`}>الباركود (اختياري)</Label>
          <Input
            id={`${formId}-barcode`}
            name="barcode"
            value={barcode}
            onChange={(e) => { setBarcode(e.target.value); setBarcodeError("") }}
            dir="ltr"
            placeholder="4006381333931"
            className={cn("text-right font-mono", barcodeError && "border-destructive")}
          />
          {barcodeError ? (
            <p className="text-xs text-destructive font-bold">{barcodeError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">8 أو 12 أو 13 أو 14 رقماً — لا يمكن تكراره لمادتين</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-base-price`}>السعر الأساسي للمادة (اختياري)</Label>
        <Input
          id={`${formId}-base-price`}
          name="base_price"
          type="number"
          min="0"
          step="any"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          dir="ltr"
          placeholder="0"
          className="text-right sm:w-[200px]"
        />
        <p className="text-xs text-muted-foreground">سعر مرجعي يسترشد به التجار عند تحديد أسعارهم — لا يُعرض للمشترين</p>
      </div>

      {/* وحدات المادة (بلا أسعار — التاجر يسعّر عند الربط) */}
      <div className="space-y-3 pt-2 border-t mt-4">
        <Label>وحدات المادة</Label>
        <p className="text-xs text-muted-foreground">
          حدد وحدات البيع المتاحة للمادة (كارتون، تكة...) — التاجر يحدد أسعاره لكل وحدة عند ربط المادة بمتجره.
        </p>

        <div className="flex flex-col gap-2 p-3 bg-muted/30 border rounded-lg">
          {units.map((unit, index) => (
            <div key={index} className="flex items-center gap-2 bg-background p-2 rounded-md border">
              <span className="font-medium text-sm flex-1">{unit.type}</span>
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
            <Button
              type="button"
              onClick={handleAddUnit}
              variant="secondary"
              className="h-10 shrink-0"
            >
              <Plus className="h-4 w-4" /> إضافة وحدة
            </Button>
          </div>
        </div>
      </div>

      {/* سلسلة علاقات الوحدات */}
      <div className="space-y-3 pt-2 border-t mt-4 bg-muted/10 p-3 rounded-lg border border-dashed border-border/60">
        <div className="flex items-center gap-2">
          <Label className="text-brand-blue font-bold">علاقات الوحدات (تحويل المخزون)</Label>
          <AlertCircle className="w-4 h-4 text-brand-orange" />
        </div>
        <p className="text-xs text-muted-foreground">
          حدد مكونات الوحدة ليعرف التجار كيف يُخصم المخزون عند البيع بالوحدات الأصغر.
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
                  <CheckCircle2 className="w-4 h-4 mr-1" />
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
                  بدون أجزاء
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t mt-4">
        <Label htmlFor={`${formId}-image`}>صورة المادة (اختياري)</Label>
        <Input
          id={`${formId}-image`}
          name="image"
          type="file"
          accept="image/*"
          className="cursor-pointer"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />
      </div>

      {formError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
        </div>
      )}

      <Button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue/90" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : submitLabel}
      </Button>
    </form>
  )
}

function MasterProductRow({ product, onEdit, onDelete }: {
  product: MasterProduct
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-background border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      {product.image_url ? (
        <div className="relative w-14 h-14 shrink-0 bg-muted rounded-lg border overflow-hidden">
          <Image src={product.image_url} alt={product.name} fill sizes="56px" className="object-contain p-1" />
        </div>
      ) : (
        <div className="w-14 h-14 shrink-0 bg-muted rounded-lg border flex items-center justify-center">
          <Package className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm truncate">{product.name}</span>
          {product.categories?.name && (
            <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">
              {product.categories.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {product.barcode && (
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded" dir="ltr">{product.barcode}</span>
          )}
          {product.base_price != null && (
            <span className="font-bold text-brand-blue" dir="rtl">
              أساسي: {product.base_price.toLocaleString('en-US')} د.ع
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {product.units?.map((u, idx) => (
            <span key={idx} className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">
              {u.type}
            </span>
          ))}
        </div>

        {product.unit_conversions?.length > 0 && (
          <p className="text-[10px] text-muted-foreground truncate">
            {product.unit_conversions.map(c => `1 ${c.from} = ${c.multiplier} ${c.to}`).join(" • ")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-brand-blue hover:bg-brand-blue/10"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function MaterialsManager({ initialProducts, categories }: {
  initialProducts: MasterProduct[]
  categories: { id: string, name: string }[]
}) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [query, setQuery] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addFormKey, setAddFormKey] = useState(0)
  const [editing, setEditing] = useState<MasterProduct | null>(null)
  const [deleting, setDeleting] = useState<MasterProduct | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  // مزامنة القائمة بعد router.refresh() من السيرفر
  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  // البحث الفوري: بالاسم أو رمز الباركود
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    const qDigits = q.replace(/\D/g, "")
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (qDigits && (p.barcode || "").includes(qDigits))
    )
  }, [products, query])

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleteLoading(true)
    setDeleteError("")
    const result = await deleteMasterProduct(deleting.id)
    setIsDeleteLoading(false)
    if (!result?.success) {
      setDeleteError(result?.error || "حدث خطأ أثناء الحذف")
    } else {
      setDeleting(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* البحث الفوري */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو برمز الباركود..."
          className="pr-9 h-11 bg-background"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* إضافة مادة جديدة */}
      <Card className={cn("transition-all", isAddOpen ? "shadow-md border-primary/20" : "")}>
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsAddOpen(!isAddOpen)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>إضافة مادة جديدة للكتالوج</CardTitle>
              <CardDescription>تُسجل المادة مركزياً ثم يربطها التجار بأسعارهم الخاصة</CardDescription>
            </div>
            {isAddOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </div>
        </CardHeader>

        {isAddOpen && (
          <CardContent className="animate-in slide-in-from-top-2 duration-300 border-t pt-4">
            <MasterProductForm
              key={addFormKey}
              formId="add-master-product"
              categories={categories}
              submitLabel="حفظ المادة في الكتالوج"
              onSubmit={createMasterProduct}
              onSuccess={() => {
                setAddFormKey(k => k + 1)
                router.refresh()
              }}
            />
          </CardContent>
        )}
      </Card>

      {/* قائمة المواد المسجلة */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">
          المواد المسجلة ({filtered.length})
          {query && <span className="text-sm font-normal text-muted-foreground"> — نتائج البحث</span>}
        </h2>

        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
            <p className="text-muted-foreground">
              {query ? "لا توجد مواد مطابقة لبحثك." : "لم تُسجل أي مواد بعد. ابدأ بإضافة مادة جديدة."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1">
            {filtered.map(p => (
              <MasterProductRow
                key={p.id}
                product={p}
                onEdit={() => setEditing(p)}
                onDelete={() => { setDeleteError(""); setDeleting(p) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* تعديل مادة */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent dir="rtl" className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل المادة</DialogTitle>
          </DialogHeader>
          {editing && (
            <MasterProductForm
              key={editing.id}
              formId="edit-master-product"
              categories={categories}
              initial={editing}
              submitLabel="حفظ التعديلات"
              onSubmit={async (formData) => {
                formData.append("id", editing.id)
                return editMasterProduct(formData)
              }}
              onSuccess={() => {
                setEditing(null)
                router.refresh()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent dir="rtl" className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-right">حذف المادة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من حذف المادة <span className="font-bold text-foreground">«{deleting?.name}»</span> نهائياً من الكتالوج المركزي؟
            لا يمكن الحذف إذا كانت مرتبطة بمنتجات التجار.
          </p>

          {deleteError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {deleteError}
            </div>
          )}

          <div className="flex gap-2 justify-start">
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading}>
              {isDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              حذف نهائي
            </Button>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleteLoading}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
