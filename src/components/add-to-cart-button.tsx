"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart, Loader2, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { addToCart } from "@/app/(app)/cart/actions"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function AddToCartButton({ 
  user, 
  productId,
  variant = "default"
}: { 
  user: any, 
  productId: string,
  variant?: "default" | "compact"
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => setIsSuccess(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess])

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/register?message=" + encodeURIComponent("يجب تسجيل الدخول أو إنشاء حساب لإضافة منتجات للسلة."))
      return
    }

    try {
      setIsLoading(true)
      const result = await addToCart(productId)
      
      if (result?.error) {
        alert("فشل الإضافة: " + result.error)
      } else {
        setIsSuccess(true)
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      alert("حدث خطأ أثناء الإضافة للسلة. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  const isCompact = variant === "compact"

  return (
    <Button 
      className={cn(
        "w-full transition-all duration-300 relative overflow-hidden",
        isCompact ? "h-9 sm:h-10 text-xs sm:text-sm gap-1" : "gap-2",
        isSuccess && "bg-green-600 hover:bg-green-700"
      )} 
      variant={isSuccess ? "default" : "default"} 
      onClick={handleAddToCart}
      disabled={isLoading || isSuccess}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isSuccess ? (
        <Check className="w-4 h-4 animate-in zoom-in" />
      ) : (
        <ShoppingCart className={cn("w-4 h-4", isCompact && "w-3 h-3 sm:w-4 sm:h-4")} />
      )}
      
      <span className={cn(
        "transition-all duration-300",
        (isLoading || isSuccess) ? "opacity-100" : "opacity-100"
      )}>
        {isLoading ? "جاري..." : isSuccess ? "تم الإضافة" : "أضف للسلة"}
      </span>
    </Button>
  )
}
