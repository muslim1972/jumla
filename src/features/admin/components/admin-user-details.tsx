"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getAdminUserDetails } from "@/features/admin/actions"
import { Loader2, User, Phone, Mail, Clock, ShieldAlert, Star, ShoppingBag, DollarSign, Store, Truck, Calendar } from "lucide-react"

interface AdminUserDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
}

export function AdminUserDetails({ open, onOpenChange, userId }: AdminUserDetailsProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && userId) {
      const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
          const res = await getAdminUserDetails(userId)
          if (res.error) {
            setError(res.error)
          } else {
            setData(res)
          }
        } catch (e: any) {
          setError(e.message || "خطأ غير متوقع")
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    } else {
      setData(null)
    }
  }, [open, userId])

  if (!open || !userId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2 text-primary">
            <User className="w-6 h-6" />
            تفاصيل الحساب
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 text-red-600 rounded-lg text-center font-bold">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6 pb-6">
            
            {/* المعلومات الأساسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-bold">{data.profile?.full_name || 'بدون اسم'}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mr-2">
                    {data.profile?.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-sm">{data.phone || 'لا يوجد هاتف'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-sm">{data.email || 'لا يوجد بريد'}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">تاريخ التسجيل: {new Date(data.profile?.created_at).toLocaleDateString("ar-IQ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">آخر دخول: {data.lastSignIn ? new Date(data.lastSignIn).toLocaleDateString("ar-IQ") : 'غير معروف'}</span>
                </div>
                {data.profile?.banned_until && (
                  <div className="flex items-center gap-2 text-red-600">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-bold truncate">محظور حتى: {new Date(data.profile.banned_until).toLocaleDateString("ar-IQ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* تفاصيل التاجر إن وجدت */}
            {data.profile?.role === 'merchant' && (
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <h3 className="font-bold text-emerald-800 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <Store className="w-4 h-4" /> معلومات المتجر
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p><strong>اسم المتجر:</strong> {data.profile?.store_name || 'غير محدد'}</p>
                  <p><strong>العنوان:</strong> {data.profile?.address || 'غير محدد'}</p>
                  <p><strong>أجرة التوصيل:</strong> {data.profile?.delivery_fee ? `${data.profile.delivery_fee.toLocaleString()} د.ع` : 'غير محدد'}</p>
                </div>
              </div>
            )}

            {/* الإحصاءات */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg">إحصاءات الحساب</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.stats?.totalOrders !== undefined && (
                  <div className="bg-card border p-3 rounded-xl text-center shadow-sm">
                    <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                    <p className="font-black text-lg">{data.stats.totalOrders}</p>
                  </div>
                )}
                {data.stats?.completedOrders !== undefined && (
                  <div className="bg-card border p-3 rounded-xl text-center shadow-sm">
                    <CheckCircle2Icon className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">الطلبات المكتملة</p>
                    <p className="font-black text-lg">{data.stats.completedOrders}</p>
                  </div>
                )}
                {data.stats?.totalSpent !== undefined && (
                  <div className="bg-card border p-3 rounded-xl text-center shadow-sm">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-brand-orange" />
                    <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
                    <p className="font-black text-sm tabular-nums">{data.stats.totalSpent.toLocaleString()} د.ع</p>
                  </div>
                )}
                {data.stats?.totalSales !== undefined && (
                  <div className="bg-card border p-3 rounded-xl text-center shadow-sm">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-brand-blue" />
                    <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                    <p className="font-black text-sm tabular-nums">{data.stats.totalSales.toLocaleString()} د.ع</p>
                  </div>
                )}
                {data.stats?.totalDeliveries !== undefined && (
                  <div className="bg-card border p-3 rounded-xl text-center shadow-sm">
                    <Truck className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <p className="text-xs text-muted-foreground">التوصيلات</p>
                    <p className="font-black text-lg">{data.stats.totalDeliveries}</p>
                  </div>
                )}
                {data.stats?.totalCollected !== undefined && (
                  <div className="bg-card border p-3 rounded-xl text-center shadow-sm">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-xs text-muted-foreground">المبالغ المحصلة</p>
                    <p className="font-black text-sm tabular-nums">{data.stats.totalCollected.toLocaleString()} د.ع</p>
                  </div>
                )}
              </div>
            </div>

            {/* التقييمات */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  تقييمات العملاء
                </h3>
                {data.avgRating && (
                  <span className="font-black text-lg text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
                    {data.avgRating.toFixed(1)} / 5.0
                  </span>
                )}
              </div>
              
              {data.ratingsReceived?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/10 rounded-lg border border-dashed">
                  لم يتلق هذا المستخدم أي تقييمات بعد
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {data.ratingsReceived?.map((r: any) => (
                    <div key={r.id} className="bg-card border p-3 rounded-lg text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("ar-IQ")}
                        </span>
                      </div>
                      {r.comment && <p className="text-muted-foreground text-xs">{r.comment}</p>}
                      <p className="text-[10px] text-muted-foreground mt-2 border-t pt-1">
                        مُقيَّم بواسطة: <span className="font-semibold">{r.rater_role}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CheckCircle2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
