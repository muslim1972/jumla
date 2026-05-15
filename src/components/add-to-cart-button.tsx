"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { addToCart } from "@/app/(app)/cart/actions"
import { useState } from "react"

export function AddToCartButton({ 
  user, 
  productId 
}: { 
  user: any, 
  productId: string 
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/register?message=" + encodeURIComponent("يجب تسجيل الدخول أو إنشاء حساب لإضافة منتجات للسلة."))
      return
    }

    try {
      setIsLoading(true)
      await addToCart(productId)
      alert("تم إضافة المنتج للسلة بنجاح!")
    } catch (error) {
      console.error("Error adding to cart:", error)
      alert("حدث خطأ أثناء الإضافة للسلة. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      className="w-full gap-2" 
      variant="default" 
      onClick={handleAddToCart}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShoppingCart className="w-4 h-4" />
      )}
      {isLoading ? "جاري الإضافة..." : "أضف للسلة"}
    </Button>
  )
}
