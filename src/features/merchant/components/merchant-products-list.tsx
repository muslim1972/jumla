"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutGrid, List } from "lucide-react"
import Image from "next/image"
import { EditProductModal } from "@/features/merchant/components/edit-product-modal"
import { cn } from "@/lib/utils"

export function MerchantProductsList({ products, categories }: { products: any[], categories: any[] }) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">منتجاتي ({products?.length || 0})</h2>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {!products || products.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
          <p className="text-muted-foreground">لم تقم بإضافة أي منتجات بعد.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-3",
          viewMode === 'grid' ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
        )}>
          {products.map((product) => (
            <Card key={product.id} className={cn(
              "overflow-hidden flex shadow-sm hover:shadow-md transition-shadow",
              viewMode === 'grid' ? "flex-col rounded-xl" : "flex-row rounded-lg items-stretch"
            )}>
              {/* Product Image */}
              {product.image_url ? (
                <div className={cn(
                  "relative bg-muted",
                  viewMode === 'grid' ? "h-28 w-full" : "w-28 shrink-0 border-l"
                )}>
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className={cn(
                  "relative bg-muted flex items-center justify-center",
                  viewMode === 'grid' ? "h-28 w-full" : "w-28 shrink-0 border-l"
                )}>
                  <span className="text-xs text-muted-foreground">بدون صورة</span>
                </div>
              )}

              {/* Product Content */}
              <div className="flex flex-col flex-1 min-w-0">
                <CardHeader className={cn("pb-1", viewMode === 'grid' ? "p-3" : "p-3 pb-0")}>
                  <CardTitle className="text-sm font-bold line-clamp-1">{product.name}</CardTitle>
                </CardHeader>
                
                <CardContent className={cn("pt-0 flex-1 flex flex-col", viewMode === 'grid' ? "p-3" : "p-3")}>
                  {viewMode === 'grid' && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 mb-2">
                      {product.description || "لا يوجد وصف"}
                    </p>
                  )}
                  
                  <div className={cn(
                    "mt-auto",
                    viewMode === 'list' && "flex items-center justify-between gap-4"
                  )}>
                    <div className={cn("space-y-1", viewMode === 'list' && "flex-1")}>
                      {product.units && product.units.length > 0 ? (
                        product.units.map((unit: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs border-b border-border/50 pb-1 last:border-0 last:pb-0">
                            <span className="font-bold text-brand-blue" dir="ltr">{unit.price.toLocaleString('en-US')}</span>
                            <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">{unit.type}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-brand-blue" dir="ltr">{product.price?.toLocaleString('en-US')}</span>
                          <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">{product.unit_type}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={cn(
                      "flex items-center justify-between border-border/50",
                      viewMode === 'grid' ? "mt-3 border-t pt-2" : "border-r pr-4"
                    )}>
                      <div className="text-xs text-muted-foreground flex flex-col gap-1">
                        <span>المخزون: <span className="font-bold text-foreground">
                          {product.stock_quantity !== undefined 
                            ? Math.floor(product.stock_quantity / (product.units?.find((u: any) => u.type === (product.stock_unit || "كارتون"))?.multiplier_to_base || 1))
                            : 0} {product.stock_unit || "كارتون"}
                        </span></span>
                        {product.categories?.name && <span>القسم: <span className="font-medium text-foreground">{product.categories.name}</span></span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <div className={cn(
                  "mt-auto",
                  viewMode === 'grid' ? "p-3 pt-0" : "p-3 border-t bg-muted/20"
                )}>
                  <EditProductModal product={product} categories={categories} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
