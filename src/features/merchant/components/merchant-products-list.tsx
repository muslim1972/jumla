"use client"

import { useState } from "react"
import { CardTitle } from "@/components/ui/card"
import { LayoutGrid, List, Search, X } from "lucide-react"
import Image from "next/image"
import { EditProductModal } from "@/features/merchant/components/edit-product-modal"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function MerchantProductsList({ products, categories }: { products: any[], categories: any[] }) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProducts = (products || []).filter(product => {
    if (!searchQuery.trim()) return true
    return product.name?.toLowerCase().includes(searchQuery.trim().toLowerCase())
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base sm:text-lg font-black text-foreground">
          منتجاتي ({products?.length || 0})
          {searchQuery && (
            <span className="text-xs font-bold text-muted-foreground mr-1.5">
              (نتائج البحث: {filteredProducts.length})
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1 rounded-md transition-colors cursor-pointer",
              viewMode === 'list' ? "bg-background shadow-2xs text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title="عرض كقائمة"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1 rounded-md transition-colors cursor-pointer",
              viewMode === 'grid' ? "bg-background shadow-2xs text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title="عرض كشبكة"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* حقل البحث في منتجات التاجر بالاسم لمنع التكديس والتمرير المرهق */}
      <div className="relative mb-2.5">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="ابحث في منتجاتك باسم المنتج..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pr-9 pl-8 text-xs sm:text-sm bg-card border-border/80 rounded-xl"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
            title="مسح البحث"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {!products || products.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
          <p className="text-muted-foreground text-xs sm:text-sm">لم تقم بإضافة أي منتجات بعد.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 bg-card rounded-xl border border-dashed border-border/70">
          <p className="text-xs sm:text-sm text-muted-foreground">لا توجد منتجات مطابقة لـ «{searchQuery}»</p>
        </div>
      ) : (
        /* حاوية محددة الارتفاع تستوعب 4 إلى 5 بطاقات فقط مع سكرول داخلي */
        <div className={cn(
          "max-h-[350px] overflow-y-auto pr-0.5 [scrollbar-width:thin]",
          viewMode === 'grid' 
            ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5" 
            : "space-y-2"
        )}>
          {filteredProducts.map((product) => {
            const stockQty = product.stock_quantity !== undefined 
              ? Math.floor(product.stock_quantity / (product.units?.find((u: any) => u.type === (product.stock_unit || "كارتون"))?.multiplier_to_base || 1))
              : 0
            const unitLabel = product.stock_unit || product.unit_type || "كارتون"

            return (
              <div key={product.id} className={cn(
                "overflow-hidden border border-border/80 bg-card transition-all",
                viewMode === 'grid' 
                  ? "flex flex-col rounded-xl shadow-2xs hover:shadow-md" 
                  : "flex flex-row items-center justify-between p-2 sm:p-2.5 rounded-xl gap-2 sm:gap-3 shadow-2xs hover:shadow-sm"
              )}>
                {viewMode === 'list' ? (
                  <>
                    {/* الصورة الدلالية المصغرة لتاجر الجملة على اليمين */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-muted/50 rounded-lg overflow-hidden border border-border/60 flex items-center justify-center">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <span className="text-[9px] text-muted-foreground">بدون صورة</span>
                      )}
                    </div>

                    {/* بيانات المادة في المنتصف */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[190px] sm:max-w-none">
                          {product.name}
                        </h3>
                        {product.master_product_id && (
                          <span className="bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0">
                            مربوطة مركزياً
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="font-black text-brand-blue text-xs sm:text-sm" dir="ltr">
                          {Number(product.price || 0).toLocaleString('en-US')} د.ع
                        </span>
                        <span className="bg-secondary/60 text-secondary-foreground px-1.5 py-0.2 rounded text-[10px] font-medium">
                          {unitLabel}
                        </span>
                        <span className="text-muted-foreground text-[10px] font-medium">
                          • المخزون: <strong className={stockQty <= 5 ? "text-rose-600 font-bold" : "text-foreground"}>{stockQty} {unitLabel}</strong>
                        </span>
                        {product.categories?.name && (
                          <span className="text-muted-foreground text-[10px] hidden sm:inline">
                            • {product.categories.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* زري الإجراءات على أقصى اليسار بشكل عمودي مدمج */}
                    <EditProductModal product={product} categories={categories} sideActions={true} />
                  </>
                ) : (
                  <>
                    {/* عرض الشبكة الكلاسيكي المريح */}
                    {product.image_url ? (
                      <div className="relative bg-muted h-28 w-full">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-contain p-2"
                        />
                      </div>
                    ) : (
                      <div className="relative bg-muted flex items-center justify-center h-28 w-full">
                        <span className="text-xs text-muted-foreground">بدون صورة</span>
                      </div>
                    )}

                    <div className="flex flex-col flex-1 min-w-0 p-3">
                      <CardTitle className="text-xs sm:text-sm font-bold line-clamp-2 leading-snug flex items-center gap-1.5 flex-wrap mb-2">
                        <span>{product.name}</span>
                        {product.master_product_id && (
                          <span className="bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0">
                            مربوطة مركزياً
                          </span>
                        )}
                      </CardTitle>

                      <div className="mt-auto space-y-2 border-t pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-brand-blue text-sm" dir="ltr">
                            {Number(product.price || 0).toLocaleString('en-US')} د.ع
                          </span>
                          <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {unitLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex justify-between">
                          <span>المخزون:</span>
                          <span className="font-bold text-foreground">{stockQty} {unitLabel}</span>
                        </div>
                        <EditProductModal product={product} categories={categories} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
