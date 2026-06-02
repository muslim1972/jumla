"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { getDeliveryMerchants, getMerchantPendingOrders, confirmDelivery, getDeliveryHistory } from "@/app/(app)/delivery/actions"
import { Search, Store, Package, CheckCircle2, MapPin, Phone, Truck, ShieldCheck, ChevronDown, ChevronUp, Loader2, Clock, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DeliveryDashboard() {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current")

  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-brand-blue flex items-center gap-2">
          <Truck className="w-6 h-6 text-brand-orange" />
          لوحة عامل التوصيل
        </h2>
        
        {/* Tabs */}
        <div className="flex border-b border-border/40 gap-4">
          <button 
            onClick={() => setActiveTab("current")}
            className={cn(
              "flex items-center gap-2 pb-3 px-2 border-b-2 font-bold text-sm transition-colors whitespace-nowrap",
              activeTab === "current" 
                ? "border-brand-orange text-brand-orange" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Clock className="w-4 h-4" />
            الطلبات الحالية
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 pb-3 px-2 border-b-2 font-bold text-sm transition-colors whitespace-nowrap",
              activeTab === "history" 
                ? "border-brand-orange text-brand-orange" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            سجل التوصيل
          </button>
        </div>
      </div>

      {activeTab === "current" ? <CurrentDeliveries /> : <DeliveryHistoryView />}
    </div>
  )
}

function CurrentDeliveries() {
  const [merchants, setMerchants] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null)
  
  const loadMerchants = useCallback(async () => {
    setIsLoading(true)
    const result = await getDeliveryMerchants(searchQuery)
    if (result.merchants) {
      setMerchants(result.merchants)
    }
    setIsLoading(false)
  }, [searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMerchants()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, loadMerchants])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('delivery_merchants_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadMerchants()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadMerchants])

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="relative group">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand-orange transition-colors" />
          <Input 
            placeholder="ابحث عن اسم تاجر..." 
            className="pr-10 h-12 bg-card border-border focus:border-brand-orange transition-all rounded-xl shadow-sm text-foreground text-sm sm:text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Merchants List */}
      <div className="max-w-3xl mx-auto space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          </div>
        ) : merchants.length === 0 ? (
          <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border border-dashed border-border/50 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            لا توجد طلبات جاهزة للتوصيل حالياً.
          </div>
        ) : (
          merchants.map(merchant => (
            <div key={merchant.id} className="space-y-3">
              <button 
                onClick={() => setExpandedMerchant(expandedMerchant === merchant.id ? null : merchant.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 glass rounded-2xl hover:bg-muted/30 transition-all duration-300 group border border-border/40 shadow-sm text-right cursor-pointer",
                  expandedMerchant === merchant.id && "border-brand-blue/30 bg-muted/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 shadow-inner",
                    expandedMerchant === merchant.id
                      ? "bg-brand-blue text-white" 
                      : "bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue group-hover:text-white"
                  )}>
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-brand-blue dark:text-foreground">{merchant.full_name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">انقر لرؤية القوائم الجاهزة للتوصيل</p>
                  </div>
                </div>
                {expandedMerchant === merchant.id ? (
                  <ChevronUp className="h-5 w-5 text-brand-blue" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Orders for this merchant */}
              {expandedMerchant === merchant.id && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <MerchantOrders merchantId={merchant.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DeliveryHistoryView() {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0])

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    const result = await getDeliveryHistory(dateFilter)
    if (result.orders) {
      setOrders(result.orders)
    }
    setIsLoading(false)
  }, [dateFilter])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-card p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-brand-blue font-bold">
          <Calendar className="w-5 h-5" />
          تاريخ التوصيل
        </div>
        <Input 
          type="date"
          className="w-full sm:w-auto"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border border-dashed border-border/50 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
          لا توجد طلبات تم توصيلها في هذا التاريخ.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-muted/20 px-4 py-2 rounded-lg text-sm font-bold text-muted-foreground">
            <span>إجمالي الطلبات: {orders.length}</span>
            <span>إجمالي المبالغ المستلمة: {orders.reduce((sum, o) => sum + o.total_rounded, 0).toLocaleString()} د.ع</span>
          </div>
          {orders.map(order => (
            <OrderDeliveryCard key={order.id} order={order} isHistoryMode={true} />
          ))}
        </div>
      )}
    </div>
  )
}

function MerchantOrders({ merchantId }: { merchantId: string }) {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    const result = await getMerchantPendingOrders(merchantId)
    if (result.orders) setOrders(result.orders)
    setIsLoading(false)
  }, [merchantId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`delivery_orders_changes_${merchantId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `merchant_id=eq.${merchantId}` 
        },
        async () => {
          // جلب الطلبات من جديد لتحديث الحالة صامتاً
          const result = await getMerchantPendingOrders(merchantId)
          if (result.orders) setOrders(result.orders)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [merchantId])

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
  }

  if (orders.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl">لا توجد قوائم معلقة لهذا التاجر</div>
  }

  return (
    <div className="space-y-3 px-2 sm:px-4">
      {orders.map(order => (
        <OrderDeliveryCard key={order.id} order={order} />
      ))}
    </div>
  )
}

function OrderDeliveryCard({ order: initialOrder, isHistoryMode = false }: { order: any, isHistoryMode?: boolean }) {
  const [order, setOrder] = useState(initialOrder)
  const [isExpanded, setIsExpanded] = useState(false)
  const [secretCode, setSecretCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (secretCode.length !== 7) {
      setErrorMsg("الكود يجب أن يتكون من 7 رموز")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")
    const result = await confirmDelivery(order.id, secretCode)
    setIsSubmitting(false)

    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setOrder({ ...order, status: "delivered", delivered_at: new Date().toISOString() })
    }
  }

  const isDelivered = order.status === "delivered"

  return (
    <div className={cn(
      "border rounded-xl bg-card overflow-hidden transition-all duration-300 shadow-sm",
      isDelivered ? "border-emerald-500/50 bg-emerald-50/10" : "hover:border-brand-orange/40"
    )}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between p-4 text-right cursor-pointer"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-brand-blue">{order.store_name}</span>
            {isDelivered && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> تم التسليم
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{order.address}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono" dir="ltr">
            <Phone className="w-3.5 h-3.5" />
            <span>{order.phone}</span>
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="font-black text-brand-orange tabular-nums">
            {order.total_rounded.toLocaleString()} د.ع
          </div>
          {isHistoryMode && order.delivered_at && (
            <div className="text-[10px] mt-1 text-muted-foreground text-left">
              {new Date(order.delivered_at).toLocaleTimeString('ar-IQ')}
            </div>
          )}
          <div className="text-muted-foreground mt-2 flex justify-end">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 border-t bg-muted/10 animate-in slide-in-from-top-2">
          {/* عناصر الطلب */}
          {order.items && order.items.length > 0 && (
            <div className="border border-border/50 shadow-sm rounded-lg overflow-hidden bg-card mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground">
                    <th className="text-right p-2 font-semibold">المنتج</th>
                    <th className="text-center p-2 font-semibold">الكمية</th>
                    <th className="text-left p-2 font-semibold">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: any, idx: number) => (
                    <tr key={item.id} className={idx < order.items.length - 1 ? "border-b border-dashed border-border/50" : ""}>
                      <td className="p-2">
                        <span className="font-medium text-brand-blue dark:text-foreground">{item.product_name}</span>
                        <span className="text-[10px] text-muted-foreground mr-1">({item.unit_type})</span>
                      </td>
                      <td className="text-center p-2 font-bold tabular-nums text-brand-orange">{item.quantity}</td>
                      <td className="text-left p-2 font-bold tabular-nums text-brand-blue dark:text-foreground">
                        {(item.product_price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isDelivered ? (
            <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-emerald-700 dark:text-emerald-400 font-bold">تم استلام قائمة المواد</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">تم إرسال إشعار للمشتري والتاجر بتمام العملية.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-brand-orange/5 border border-brand-orange/20 p-3 rounded-lg flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-brand-blue/90 font-medium leading-relaxed">
                  أدخل كود القائمة السري بعد تأكيد تسليم المواد للمشتري واستلامك لمبلغ القائمة بالكامل.
                </p>
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="رمز التحقق (7 رموز)"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                  className="font-mono text-center tracking-widest uppercase border-brand-blue/30 focus:border-brand-orange"
                  maxLength={7}
                  dir="ltr"
                  disabled={isSubmitting}
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting || secretCode.length !== 7}
                  className="bg-brand-orange hover:bg-brand-orange/90 text-white min-w-[80px]"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد وتم"}
                </Button>
              </div>
              {errorMsg && (
                <p className="text-xs font-bold text-destructive text-center bg-destructive/10 py-2 rounded-md">
                  {errorMsg}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
