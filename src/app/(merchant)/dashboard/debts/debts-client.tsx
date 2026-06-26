"use client"

import { useState, useEffect } from "react"
import { getMerchantDebts, payDebt } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wallet, ChevronDown, ChevronUp, Loader2, Store, Phone, Receipt, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function MerchantDebtsClient({ merchantId }: { merchantId: string }) {
  const [buyers, setBuyers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedBuyer, setExpandedBuyer] = useState<string | null>(null)

  useEffect(() => {
    loadDebts()
  }, [])

  async function loadDebts() {
    setIsLoading(true)
    const { buyers, error } = await getMerchantDebts(merchantId)
    if (!error && buyers) {
      setBuyers(buyers)
    }
    setIsLoading(false)
  }

  const totalDebts = buyers.reduce((sum, b) => sum + b.totalDebt, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-orange" />
            الديون والتسديد
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            إدارة الديون المستحقة على المشترين لقاء الطلبات الآجلة
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-xl text-center">
          <p className="text-xs font-bold text-destructive mb-1">إجمالي الديون المستحقة</p>
          <p className="text-xl font-black text-destructive tabular-nums">{totalDebts.toLocaleString('en-US')} د.ع</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
        </div>
      ) : buyers.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground shadow-sm">
          <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <h3 className="font-bold text-lg mb-1">لا توجد ديون مستحقة</h3>
          <p className="text-sm">جميع الطلبات الآجلة تم تسديدها أو لا توجد طلبات آجلة حتى الآن.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {buyers.map(buyer => (
            <div key={buyer.buyerId} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:border-brand-orange/40 transition-colors">
              <button
                onClick={() => setExpandedBuyer(expandedBuyer === buyer.buyerId ? null : buyer.buyerId)}
                className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-brand-blue/10 p-3 rounded-xl text-brand-blue">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{buyer.buyerName}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {buyer.storeName && (
                        <span className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" /> {buyer.storeName}
                        </span>
                      )}
                      {buyer.phone && (
                        <span className="flex items-center gap-1 font-mono" dir="ltr">
                          <Phone className="w-3.5 h-3.5" /> {buyer.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full font-bold">
                        <Receipt className="w-3.5 h-3.5" /> {buyer.ordersCount} قوائم
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                  <div className="text-left">
                    <p className="text-xs font-bold text-muted-foreground mb-0.5">المبلغ المستحق</p>
                    <p className="font-black text-destructive text-lg tabular-nums">{buyer.totalDebt.toLocaleString('en-US')} د.ع</p>
                  </div>
                  {expandedBuyer === buyer.buyerId ? (
                    <ChevronUp className="w-5 h-5 text-brand-blue shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </button>

              {expandedBuyer === buyer.buyerId && (
                <div className="border-t bg-muted/10 p-4 sm:p-5 animate-in slide-in-from-top-2">
                  <h4 className="font-bold mb-3 text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-brand-orange" />
                    القوائم غير المسددة كلياً
                  </h4>
                  <div className="space-y-3">
                    {buyer.orders.map((order: any) => (
                      <DebtOrderCard 
                        key={order.id} 
                        order={order} 
                        onPaymentSuccess={loadDebts} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DebtOrderCard({ order, onPaymentSuccess }: { order: any, onPaymentSuccess: () => void }) {
  const [paymentAmount, setPaymentAmount] = useState<number | "">("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handlePay = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      setErrorMsg("الرجاء إدخال مبلغ صحيح")
      return
    }
    if (paymentAmount > order.debt) {
      setErrorMsg("المبلغ المدفوع أكبر من الدين المتبقي")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")
    const { success, error } = await payDebt(order.id, Number(paymentAmount))
    setIsSubmitting(false)

    if (error) {
      setErrorMsg(error)
    } else {
      setPaymentAmount("")
      onPaymentSuccess()
    }
  }

  return (
    <div className="bg-background border rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* تفاصيل القائمة */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">قائمة رقم: <span className="font-mono text-brand-blue">{order.invoiceNumber}</span></span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {new Date(order.date).toLocaleDateString('ar-IQ')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">المبلغ الكلي: <span className="font-bold text-foreground tabular-nums">{order.total.toLocaleString('en-US')}</span> د.ع</span>
            <span className="text-emerald-600">الواصل: <span className="font-bold tabular-nums">{order.paid.toLocaleString('en-US')}</span> د.ع</span>
            <span className="text-destructive font-bold bg-destructive/10 px-1.5 py-0.5 rounded">الباقي (دين): <span className="tabular-nums">{order.debt.toLocaleString('en-US')}</span> د.ع</span>
          </div>
        </div>

        {/* إدخال الدفعة */}
        <div className="flex flex-col gap-2 shrink-0 md:w-64">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                min="1"
                max={order.debt}
                placeholder="مبلغ التسديد"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : "")}
                className="h-10 text-sm font-bold tabular-nums pr-3 pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                د.ع
              </span>
            </div>
            <Button 
              size="sm" 
              onClick={handlePay}
              disabled={isSubmitting || !paymentAmount}
              className="h-10 shrink-0 bg-brand-orange hover:bg-brand-orange/90 text-white"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسديد"}
            </Button>
          </div>
          {errorMsg && <p className="text-xs text-red-500 font-medium text-center">{errorMsg}</p>}
          
          <div className="flex justify-between items-center px-1">
            <button 
              onClick={() => setPaymentAmount(order.debt)}
              className="text-[10px] font-bold text-brand-blue hover:underline"
            >
              تسديد كامل الدين
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
