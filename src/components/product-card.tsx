"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AddToCartButton } from "@/components/add-to-cart-button"
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
          
          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
            {hasMultipleUnits ? (
              <Select value={selectedUnitType} onValueChange={(val) => val && setSelectedUnitType(val)}>
                <SelectTrigger className="h-6 px-2 py-0 text-[10px] font-bold bg-brand-blue/90 text-white border-none focus:ring-0 shadow-sm rounded-lg" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {product.units.map((u: any, idx: number) => (
                    <SelectItem key={idx} value={u.type} className="text-xs">
                      {u.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="bg-brand-blue/90 dark:bg-brand-blue text-white px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm">
                {product.unit_type}
              </div>
            )}
          </div>
        </div>

        <CardHeader className="p-3 pb-1 space-y-0.5">
          <CardTitle className="text-sm font-bold line-clamp-1 group-hover:text-brand-orange transition-colors">
            {product.name}
          </CardTitle>
          {product.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {product.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="p-3 pt-1 pb-2 flex-grow">
          <div className="flex flex-col mt-0.5">
            <span className="text-base font-black text-brand-blue dark:text-foreground">
              {Number(currentPrice).toLocaleString('en-US')} <span className="text-[10px] font-normal">د.ع</span>
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-3 pt-0">
          <AddToCartButton 
            user={user} 
            productId={product.id} 
            productPrice={currentPrice}
            unitType={selectedUnitType}
            initialCartItem={initialCartItem}
            variant="compact"
          />
        </CardFooter>
      </Card>
    )
  }

  /* List View - Ultra Compact */
  return (
    <div className="flex items-center gap-3 p-2.5 glass rounded-xl hover:bg-muted/30 hover:border-brand-orange/30 border border-border/30 transition-all duration-300 group">
      <div className="h-12 w-12 rounded-lg bg-muted/40 relative overflow-hidden shrink-0 shadow-sm border border-border/10">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <PackageOpen className="w-4 h-4 text-muted-foreground/20" />
          </div>
        )}
      </div>
      
      <div className="flex-grow min-w-0 flex flex-col justify-center">
        <h4 className="text-sm font-bold line-clamp-1 leading-tight group-hover:text-brand-orange transition-colors">{product.name}</h4>
        {product.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
            {product.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-brand-blue dark:text-foreground font-black text-sm">
            {Number(currentPrice).toLocaleString('en-US')} <span className="text-[10px] font-normal">د.ع</span>
          </span>
          
          {hasMultipleUnits ? (
            <Select value={selectedUnitType} onValueChange={(val) => val && setSelectedUnitType(val)}>
              <SelectTrigger className="h-5 px-1.5 py-0 text-[9px] font-bold text-brand-blue bg-brand-blue/10 border-none focus:ring-0 rounded" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {product.units.map((u: any, idx: number) => (
                  <SelectItem key={idx} value={u.type} className="text-xs">
                    {u.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-[9px] text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded font-bold">
              {product.unit_type}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <AddToCartButton 
          user={user} 
          productId={product.id} 
          productPrice={currentPrice}
          unitType={selectedUnitType}
          initialCartItem={initialCartItem}
          variant="icon"
        />
      </div>
    </div>
  )
}
