"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button"
import Image from "next/image"
import { PackageOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ProductCard({ 
  product, 
  user, 
  cartItems, 
  viewMode 
}: { 
  product: any, 
  user: any, 
  cartItems: any[], 
  viewMode: "grid" | "list" 
}) {
  // If product.units exists, we use it. Otherwise, fallback to the old unit_type and price
  const hasMultipleUnits = product.units && Array.isArray(product.units) && product.units.length > 0;
  
  // State for the currently selected unit type
  const [selectedUnitType, setSelectedUnitType] = useState<string>(
    hasMultipleUnits ? product.units[0].type : product.unit_type
  );

  // Determine current price based on selection
  const currentPrice = hasMultipleUnits 
    ? product.units.find((u: any) => u.type === selectedUnitType)?.price || product.price
    : product.price;

  // Find the initial cart item for this specific unit
  // The cart_items table now uses unit_type to distinguish items
  const initialCartItem = cartItems.find(i => 
    i.product_id === product.id && 
    (i.unit_type === selectedUnitType || (!i.unit_type && !hasMultipleUnits))
  );

  if (viewMode === "grid") {
    return (
      <Card className="overflow-hidden border border-border/40 shadow-premium hover:shadow-premium-hover hover:border-brand-orange/30 transition-all duration-500 group bg-card/85 backdrop-blur-sm flex flex-col h-full rounded-2xl">
        <div className="aspect-[4/5] relative bg-muted/30 overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-contain group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-secondary/10">
              <PackageOpen className="w-8 h-8 text-muted-foreground/20" />
            </div>
          )}
        </div>

        <CardHeader className="p-3 pb-1 space-y-0.5">
          <CardTitle className="text-xs sm:text-sm font-bold line-clamp-2 min-h-[2.25rem] leading-snug group-hover:text-brand-orange transition-colors">
            {product.name}
          </CardTitle>
          {product.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {product.description}
            </p>
          )}
          {product.source_url && (
            <a href={product.source_url} target="_blank" rel="noreferrer" className="text-[9px] text-muted-foreground underline">
              مصدر البيانات والصورة: {product.source_provider || "مصدر خارجي"}{product.source_license ? ` · ${product.source_license}` : ""}
            </a>
          )}
        </CardHeader>

        <CardContent className="p-3 pt-1 pb-2 flex-grow flex justify-between items-end gap-2">
          <div className="flex flex-col mt-0.5">
            <span className="text-[10px] text-muted-foreground mb-0.5 font-medium leading-none">السعر</span>
            <span className="text-base font-black text-brand-blue dark:text-foreground leading-none tabular-nums">
              {Number(currentPrice).toLocaleString('en-US')} <span className="text-[10px] font-normal">د.ع</span>
            </span>
          </div>

          <div className="z-10 min-w-[70px]">
            {hasMultipleUnits ? (
              <Select value={selectedUnitType} onValueChange={(val) => val && setSelectedUnitType(val)}>
                <SelectTrigger className="h-7 px-2 text-xs font-bold bg-muted/50 border-border/50" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {product.units.map((u: any, idx: number) => (
                    <SelectItem key={idx} value={u.type} className="text-xs font-bold">
                      {u.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="bg-muted/50 border border-border/50 text-foreground px-2 py-1 rounded-md text-xs font-bold text-center">
                {product.unit_type}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-3 pt-0">
          <AddToCartButton 
            key={`${product.id}-${selectedUnitType}`}
            user={user} 
            productId={product.id} 
            productPrice={currentPrice}
            unitType={selectedUnitType}
            initialCartItem={initialCartItem}
            variant="compact"
            maxQuantity={Math.floor((product.stock_quantity ?? 0) / (hasMultipleUnits ? (product.units.find((u: any) => u.type === selectedUnitType)?.multiplier_to_base || 1) : 1))}
          />
        </CardFooter>
      </Card>
    )
  }

  /* List View - صورة على اليمين، والاسم والسعر والوحدة في صف واحد */
  return (
    <div className="flex items-stretch gap-3 p-2.5 sm:p-3 glass rounded-xl hover:bg-muted/30 hover:border-brand-orange/30 border border-border/30 transition-all duration-300 group min-h-[104px]">
      <div className="relative aspect-square w-1/4 min-w-[84px] max-w-[112px] shrink-0 self-center overflow-hidden rounded-lg border border-border/10 bg-muted/40 shadow-sm">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 25vw, 112px"
            className="object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PackageOpen className="w-7 h-7 text-muted-foreground/20" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
        <div className="min-w-0">
          <div data-slot="product-name-price" className="flex min-w-0 items-center gap-1.5">
            <h4 className="min-w-0 flex-1 truncate text-xs sm:text-sm font-bold leading-snug group-hover:text-brand-orange transition-colors">
              {product.name}
            </h4>

            <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span className="text-brand-blue dark:text-foreground font-black text-[11px] sm:text-xs tabular-nums whitespace-nowrap">
                {Number(currentPrice).toLocaleString('en-US')} <span className="text-[9px] font-normal">د.ع</span>
              </span>

              {hasMultipleUnits ? (
                <Select value={selectedUnitType} onValueChange={(val) => val && setSelectedUnitType(val)}>
                  <SelectTrigger className="h-6 max-w-[76px] px-1.5 py-0 text-[10px] font-bold bg-muted/50 border-border/50 rounded-md" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {product.units.map((u: any, idx: number) => (
                      <SelectItem key={idx} value={u.type} className="text-xs font-bold">
                        {u.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="max-w-[76px] truncate bg-muted/50 border border-border/50 text-foreground px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                  {product.unit_type}
                </div>
              )}
            </div>
          </div>

          {product.description && (
            <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
              {product.description}
            </p>
          )}
          {product.source_url && (
            <a href={product.source_url} target="_blank" rel="noreferrer" className="mt-0.5 block text-[9px] text-muted-foreground underline">
              مصدر البيانات والصورة: {product.source_provider || "مصدر خارجي"}{product.source_license ? ` · ${product.source_license}` : ""}
            </a>
          )}
        </div>

        <div className="flex items-center border-t border-border/25 pt-1">
          <AddToCartButton 
            key={`list-${product.id}-${selectedUnitType}`}
            user={user} 
            productId={product.id} 
            productPrice={currentPrice}
            unitType={selectedUnitType}
            initialCartItem={initialCartItem}
            variant="icon"
            maxQuantity={Math.floor((product.stock_quantity ?? 0) / (hasMultipleUnits ? (product.units.find((u: any) => u.type === selectedUnitType)?.multiplier_to_base || 1) : 1))}
          />
        </div>
      </div>
    </div>
  )
}
