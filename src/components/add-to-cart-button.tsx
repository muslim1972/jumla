"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart, Loader2, Check, Plus, Minus } from "lucide-react"
import { useRouter } from "next/navigation"
import { addToCart, updateQuantity, removeFromCart } from "@/app/(app)/cart/actions"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_type?: string;
}

export function AddToCartButton({ 
  user, 
  productId,
  productPrice = 0,
  unitType,
  initialCartItem,
  variant = "default"
}: { 
  user: any, 
  productId: string,
  productPrice?: number,
  unitType?: string,
  initialCartItem?: CartItem,
  variant?: "default" | "compact" | "icon"
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [localQuantity, setLocalQuantity] = useState(initialCartItem?.quantity || 1)
  
  // Track if item is actually in the cart DB
  const [inCartItem, setInCartItem] = useState<CartItem | undefined>(initialCartItem)

  useEffect(() => {
    setInCartItem(initialCartItem)
    if (initialCartItem) {
      setLocalQuantity(initialCartItem.quantity)
    }
  }, [initialCartItem])

  const handleAction = async () => {
    if (!user) {
      router.push("/register?message=" + encodeURIComponent("يجب تسجيل الدخول أو إنشاء حساب لإضافة منتجات للسلة."))
      return
    }

    // If it's already in the cart, doing nothing when clicking checkmark, or maybe go to cart?
    if (inCartItem) {
      router.push("/cart")
      return
    }

    try {
      setIsLoading(true)
      const result = await addToCart(productId, localQuantity, unitType)
      
      if (result?.error) {
        alert("فشل الإضافة: " + result.error)
      } else {
        // Optimistically set it as in cart (it will be updated by server revalidation anyway)
        setInCartItem({ id: 'temp', product_id: productId, quantity: localQuantity, unit_type: unitType })
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      alert("حدث خطأ أثناء الإضافة للسلة. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateQuantity = async (newQty: number) => {
    if (newQty < 1) {
      if (inCartItem && inCartItem.id !== 'temp') {
        setIsLoading(true)
        await removeFromCart(inCartItem.id)
        setInCartItem(undefined)
        setLocalQuantity(1)
        setIsLoading(false)
      } else {
        setLocalQuantity(1)
      }
      return
    }

    setLocalQuantity(newQty)

    // If it's already in the cart, update it on the server
    if (inCartItem && inCartItem.id !== 'temp') {
      setIsLoading(true)
      try {
        await updateQuantity(inCartItem.id, newQty)
        setInCartItem({ ...inCartItem, quantity: newQty })
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const isCompact = variant === "compact"
  const isIcon = variant === "icon"

  const totalStr = (productPrice * localQuantity).toLocaleString('en-US') + " د.ع"

  // Icon-only variant (used in list view)
  if (isIcon) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {localQuantity > 0 && (
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 min-w-fit">
              = {(productPrice * localQuantity).toLocaleString('en-US')}
            </div>
          )}
          <div className="flex items-center border rounded-md overflow-hidden h-7 bg-background shadow-sm border-border/50">
            <button
              onClick={() => handleUpdateQuantity(localQuantity + 1)}
              disabled={isLoading}
              className="px-2 hover:bg-muted disabled:opacity-30 transition-colors h-full text-brand-orange"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="px-2 font-bold min-w-[24px] text-center border-x text-xs">
              {localQuantity}
            </span>
            <button
              onClick={() => handleUpdateQuantity(localQuantity - 1)}
              disabled={isLoading || localQuantity <= 1}
              className="px-2 hover:bg-muted disabled:opacity-30 transition-colors h-full text-brand-orange"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <Button 
          size="icon"
          className={cn(
            "h-8 w-8 transition-all duration-300",
            inCartItem ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-brand-orange hover:bg-brand-orange/90 shadow-brand-orange/20"
          )} 
          onClick={handleAction}
          disabled={isLoading}
          title={inCartItem ? "الذهاب للسلة" : "أضف للسلة"}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : inCartItem ? (
            <Check className="w-4 h-4 text-white" />
          ) : (
            <ShoppingCart className="w-4 h-4 text-white" />
          )}
        </Button>
      </div>
    )
  }

  // Compact or Default variants
  return (
    <div className={cn("flex flex-col gap-2 w-full", isCompact ? "" : "max-w-xs")}>
      {/* Quantity Selector & Price Preview */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-1.5 border border-border/40">
        <div className="flex items-center border rounded-md overflow-hidden h-7 sm:h-8 bg-background shadow-sm shrink-0">
          <button
            onClick={() => handleUpdateQuantity(localQuantity + 1)}
            disabled={isLoading}
            className="px-2 sm:px-2.5 hover:bg-muted disabled:opacity-30 transition-colors h-full text-brand-orange shrink-0 flex items-center justify-center"
          >
            <Plus className="w-3 h-3" />
          </button>
          <span className="px-2 sm:px-3 font-black min-w-[24px] sm:min-w-[28px] text-center border-x text-xs sm:text-sm flex items-center justify-center h-full">
            {localQuantity}
          </span>
          <button
            onClick={() => handleUpdateQuantity(localQuantity - 1)}
            disabled={isLoading || localQuantity <= 1}
            className="px-2 sm:px-2.5 hover:bg-muted disabled:opacity-30 transition-colors h-full text-brand-orange shrink-0 flex items-center justify-center"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
        
        <div className="text-left pl-1 sm:pl-2 min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium leading-none mb-0.5 truncate">المجموع</div>
          <div className="text-[11px] sm:text-xs font-black text-brand-blue dark:text-foreground leading-none truncate" dir="ltr">{totalStr}</div>
        </div>
      </div>

      {/* Action Button */}
      <Button 
        className={cn(
          "w-full transition-all duration-300 relative overflow-hidden font-bold",
          isCompact ? "h-9 text-xs gap-1.5" : "h-11 text-sm gap-2",
          inCartItem 
            ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white" 
            : "bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 text-white"
        )} 
        variant="default" 
        onClick={handleAction}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : inCartItem ? (
          <Check className="w-4 h-4 animate-in zoom-in" />
        ) : (
          <ShoppingCart className={cn("w-4 h-4", isCompact && "w-3.5 h-3.5")} />
        )}
        
        <span className="transition-all duration-300">
          {isLoading ? "جاري..." : inCartItem ? "الذهاب الى السلة" : "أضف للسلة"}
        </span>
      </Button>
    </div>
  )
}
