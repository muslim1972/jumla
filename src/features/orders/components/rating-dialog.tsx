"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star, Loader2 } from "lucide-react"
import { upsertRating, getOrderRatings } from "@/features/orders/actions/rating-actions"

interface RatingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  ratedId: string
  ratedName: string
  ratedRole: string
  onSuccess?: () => void
}

export function RatingDialog({
  open,
  onOpenChange,
  orderId,
  ratedId,
  ratedName,
  ratedRole,
  onSuccess
}: RatingDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // جلب التقييم السابق إن وجد
  useEffect(() => {
    if (open) {
      const fetchExisting = async () => {
        setIsFetching(true)
        try {
          const res = await getOrderRatings(orderId)
          if (res.ratings) {
            const existing = res.ratings.find(r => r.rated_id === ratedId)
            if (existing) {
              setRating(existing.rating)
              setComment(existing.comment || "")
            } else {
              setRating(0)
              setComment("")
            }
          }
        } catch (e) {
          console.error("Error fetching rating:", e)
        } finally {
          setIsFetching(false)
        }
      }
      fetchExisting()
    }
  }, [open, orderId, ratedId])

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("الرجاء اختيار عدد النجوم للتقييم")
      return
    }

    setIsLoading(true)
    try {
      const result = await upsertRating({
        orderId,
        ratedId,
        ratedRole,
        rating,
        comment
      })

      if (result.error) {
        alert(result.error)
      } else {
        alert("تم حفظ التقييم بنجاح، شكراً لك!")
        onOpenChange(false)
        if (onSuccess) onSuccess()
      }
    } catch (e) {
      alert("حدث خطأ أثناء حفظ التقييم")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            تقييم التعامل مع {ratedName}
          </DialogTitle>
        </DialogHeader>

        {isFetching ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* النجوم */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">كيف كان تعاملك؟</span>
              <div className="flex items-center gap-1 flex-row-reverse">
                {[5, 4, 3, 2, 1].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 transition-colors"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star 
                      className={`w-10 h-10 ${
                        (hoverRating ? star <= hoverRating : star <= rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      } transition-all`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* التعليق */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">
                تعليق (اختياري)
              </label>
              <textarea 
                placeholder="اكتب رأيك بصراحة لمساعدتنا في تحسين الخدمة..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none h-24"
              />
            </div>

            {/* الإرسال */}
            <Button 
              className="w-full h-12 text-base font-bold rounded-xl"
              onClick={handleSubmit}
              disabled={isLoading || rating === 0}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "حفظ التقييم"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
