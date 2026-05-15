"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { removeFromCart, updateQuantity } from "./actions"
import { useState } from "react"

export function CartClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

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

  const total = items.reduce((acc, item) => acc + (item.products.price * item.quantity), 0)

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
          <div key={item.id} className="flex gap-4 p-4 bg-card rounded-xl border shadow-sm group">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {item.products.image_url ? (
                <Image
                  src={item.products.image_url}
                  alt={item.products.name}
                  fill
                  className="object-cover"
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
                <p className="text-sm text-muted-foreground">
                  السعر للوحدة: {item.products.price} د.ع
                </p>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border rounded-lg overflow-hidden h-9">
                  <button 
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={isUpdating === item.id || item.quantity <= 1}
                    className="px-2 hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-medium min-w-[40px] text-center">
                    {item.quantity}
                  </span>
                  <button 
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    disabled={isUpdating === item.id}
                    className="px-2 hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemove(item.id)}
                  disabled={isUpdating === item.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-1">
        <div className="bg-card rounded-xl border p-6 shadow-sm sticky top-24">
          <h3 className="text-xl font-bold mb-4">ملخص الطلب</h3>
          <div className="space-y-3 pb-4 border-b">
            <div className="flex justify-between text-muted-foreground">
              <span>عدد المنتجات</span>
              <span>{items.length}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>إجمالي الوحدات</span>
              <span>{items.reduce((acc, item) => acc + item.quantity, 0)}</span>
            </div>
          </div>
          <div className="py-4 flex justify-between items-center">
            <span className="text-lg font-bold">المجموع الكلي</span>
            <span className="text-2xl font-bold text-primary">{total} د.ع</span>
          </div>
          <Button className="w-full h-12 text-lg font-bold mt-2">
            إتمام الشراء
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-4">
            بالضغط على إتمام الشراء، أنت توافق على شروط الخدمة وسياسة الخصوصية.
          </p>
        </div>
      </div>
    </div>
  )
}
