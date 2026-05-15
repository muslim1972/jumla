"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"

export function AddToCartButton({ user }: { user: any }) {
  const router = useRouter()

  const handleAddToCart = () => {
    if (!user) {
      router.push("/register?message=" + encodeURIComponent("يجب تسجيل الدخول أو إنشاء حساب لإضافة منتجات للسلة."))
      return
    }
    // Add to cart logic here (e.g. state management, API call)
    alert("تم إضافة المنتج للسلة!")
  }

  return (
    <Button className="w-full gap-2" variant="default" onClick={handleAddToCart}>
      <ShoppingCart className="w-4 h-4" />
      أضف للسلة
    </Button>
  )
}
