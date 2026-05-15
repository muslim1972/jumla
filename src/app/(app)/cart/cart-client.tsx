"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import { Minus, Plus, Trash2, ShoppingBag, Loader2, Check } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { removeFromCart, updateQuantity } from "./actions"
import { useState } from "react"

export function CartClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isOrdered, setIsOrdered] = useState(false)

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setIsUpdating(itemId)
    try {
      await updateQuantity(itemId, newQuantity)
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ))
    } catch (error) {
      alert("خطأ في تحديث الكمية")
    } finally {
      setIsUpdating(null)
    }
  }

  const handleRemove = async (itemId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج من السلة؟")) return
    setIsUpdating(itemId)
    try {
      await removeFromCart(itemId)
      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (error) {
      alert("خطأ في حذف المنتج")
    } finally {
      setIsUpdating(null)
    }
  }

  const handleCheckout = async () => {
    setIsCheckingOut(true)
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsOrdered(true)
    setIsCheckingOut(false)
  }

  const subtotal = items.reduce((acc, item) => acc + (item.products.price * item.quantity), 0)
  
  // Calculate unique merchant delivery fees
  const merchantFees = items.reduce((acc, item) => {
    const merchantId = item.products.merchant_id
    const fee = item.products.profiles?.delivery_fee || 0
    if (!acc[merchantId]) {
      acc[merchantId] = fee
    }
    return acc
  }, {} as Record<string, number>)
  
  const totalDeliveryFee = (Object.values(merchantFees) as number[]).reduce((acc, fee) => acc + fee, 0)
  const total = subtotal + totalDeliveryFee

  if (isOrdered) {
    return (
      <div className="text-center py-20 bg-green-500/5 rounded-3xl border-2 border-green-500/20 max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
        <div className="bg-green-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
          <Check className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-green-700">تم إرسال طلبك بنجاح!</h2>
        <p className="text-lg text-green-600/80 mb-8 max-w-md mx-auto">
          شكراً لتسوقك معنا. سيتم التواصل معك من قبل التجار قريباً لتأكيد موعد التوصيل.
        </p>
        <Link 
          href="/" 
          className={buttonVariants({ variant: "default", size: "lg" }) + " rounded-full px-8 h-14 text-lg"}
        >
          العودة للرئيسية
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">السلة فارغة حالياً</h2>
        <p className="text-muted-foreground mb-8">ابدأ بالتسوق وأضف بعض المنتجات الرائعة!</p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          الذهاب للتسوق
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 p-4 bg-card rounded-xl border shadow-sm group hover:border-primary/30 transition-colors">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {item.products.image_url ? (
                <Image
                  src={item.products.image_url}
                  alt={item.products.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
            
            <div className="flex-grow flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg line-clamp-1">{item.products.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-sm font-bold text-primary">
                    {item.products.price} د.ع
                  </p>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    لكل {item.products.unit_type}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border rounded-lg overflow-hidden h-9 bg-background">
                  <button 
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={isUpdating === item.id || item.quantity <= 1}
                    className="px-3 hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 font-bold min-w-[40px] text-center border-x">
                    {item.quantity}
                  </span>
                  <button 
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    disabled={isUpdating === item.id}
                    className="px-3 hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemove(item.id)}
                  disabled={isUpdating === item.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-1">
        <div className="bg-card rounded-2xl border p-6 shadow-lg shadow-primary/5 sticky top-24 border-primary/10">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            ملخص الطلب
          </h3>
          <div className="space-y-4 pb-6 border-b border-dashed">
            <div className="flex justify-between text-muted-foreground">
              <span>قيمة المنتجات</span>
              <span className="font-medium text-foreground">{subtotal} د.ع</span>
            </div>
            <div className="flex justify-between text-muted-foreground items-center">
              <span className="flex items-center gap-1.5">
                أجور التوصيل
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {Object.keys(merchantFees).length} تاجر
                </span>
              </span>
              <span className="font-medium text-foreground">{totalDeliveryFee} د.ع</span>
            </div>
          </div>
          
          <div className="py-6 flex justify-between items-center">
            <span className="text-lg font-bold">المجموع الكلي</span>
            <div className="text-right">
              <span className="text-3xl font-black text-primary block leading-none">{total}</span>
              <span className="text-xs text-muted-foreground mt-1 block">دينار عراقي</span>
            </div>
          </div>

          <Button 
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="w-full h-14 text-xl font-black rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 bg-gradient-to-r from-primary to-blue-600"
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin ml-2" />
                جاري المعالجة...
              </>
            ) : (
              "إتمام الشراء الآن"
            )}
          </Button>
          
          <div className="mt-6 space-y-3">
             <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span>دفع آمن عند الاستلام</span>
             </div>
             <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span>توصيل سريع من قبل التجار مباشرة</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
