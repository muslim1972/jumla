import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star, Loader2, CheckCircle2 } from "lucide-react"
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
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // جلب التقييم السابق إن وجد
  useEffect(() => {
    if (open) {
      setIsSuccess(false)
      setErrorMessage(null)
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

  // إغلاق تلقائي بعد ثانية ونصف عند النجاح
  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => {
      setIsSuccess(false)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    }, 1500)
    return () => clearTimeout(timer)
  }, [isSuccess, onOpenChange, onSuccess])

  const handleSubmit = async () => {
    if (rating === 0) {
      setErrorMessage("الرجاء اختيار عدد النجوم للتقييم")
      return
    }

    setErrorMessage(null)
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
        setErrorMessage(result.error)
      } else {
        setIsSuccess(true)
      }
    } catch (e) {
      setErrorMessage("حدث خطأ أثناء حفظ التقييم")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 gap-3 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in-50 duration-300" />
            </div>
            <h3 className="text-2xl font-black text-foreground">شكراً لتقييمكم!</h3>
            <p className="text-xs text-muted-foreground">تم حفظ تقييمك ومشاركتها بنجاح</p>
          </div>
        ) : (
          <>
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
                        onClick={() => {
                          setRating(star)
                          setErrorMessage(null)
                        }}
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

                {errorMessage && (
                  <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 text-center font-bold animate-in fade-in duration-150">
                    {errorMessage}
                  </p>
                )}

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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
