"use client"

import { useState, useEffect } from "react"
import { getBuyerDebts } from "./actions"
import { Wallet, ChevronDown, ChevronUp, Loader2, Store, Phone, Receipt } from "lucide-react"

export function BuyerDebtsClient({ userId }: { userId: string }) {
  const [merchants, setMerchants] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null)

  useEffect(() => {
    loadDebts()
  }, [])

  async function loadDebts() {
    setIsLoading(true)
    const { merchants, error } = await getBuyerDebts(userId)
    if (!error && merchants) {
      setMerchants(merchants)
    }
    setIsLoading(false)
  }

  const totalDebts = merchants.reduce((sum, m) => sum + m.totalDebt, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-orange" />
            الديون والتسديد
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            متابعة الديون المستحقة عليك للتجار
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-xl text-center">
          <p className="text-xs font-bold text-destructive mb-1">إجمالي الديون (بذمتك)</p>
          <p className="text-xl font-black text-destructive tabular-nums">{totalDebts.toLocaleString('en-US')} د.ع</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
        </div>
      ) : merchants.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground shadow-sm">
          <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <h3 className="font-bold text-lg mb-1">لا توجد ديون مستحقة عليك</h3>
          <p className="text-sm">جميع طلباتك مسددة بالكامل أو لم تقم بالشراء بالآجل بعد.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {merchants.map(merchant => (
            <div key={merchant.merchantId} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:border-brand-orange/40 transition-colors">
              <button
                onClick={() => setExpandedMerchant(expandedMerchant === merchant.merchantId ? null : merchant.merchantId)}
                className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-brand-blue/10 p-3 rounded-xl text-brand-blue">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{merchant.merchantName}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {merchant.phone && (
                        <span className="flex items-center gap-1 font-mono" dir="ltr">
                          <Phone className="w-3.5 h-3.5" /> {merchant.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full font-bold">
                        <Receipt className="w-3.5 h-3.5" /> {merchant.ordersCount} قوائم
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                  <div className="text-left">
                    <p className="text-xs font-bold text-muted-foreground mb-0.5">المبلغ المطلوب تسديده</p>
                    <p className="font-black text-destructive text-lg tabular-nums">{merchant.totalDebt.toLocaleString('en-US')} د.ع</p>
                  </div>
                  {expandedMerchant === merchant.merchantId ? (
                    <ChevronUp className="w-5 h-5 text-brand-blue shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </button>

              {expandedMerchant === merchant.merchantId && (
                <div className="border-t bg-muted/10 p-4 sm:p-5 animate-in slide-in-from-top-2">
                  <h4 className="font-bold mb-3 text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-brand-orange" />
                    القوائم غير المسددة كلياً
                  </h4>
                  <div className="space-y-3">
                    {merchant.orders.map((order: any) => (
                      <div key={order.id} className="bg-background border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    لتسديد الديون، يرجى التواصل مع التاجر أو مندوب التوصيل
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
