"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  Users, 
  Trash2, 
  Sparkles, 
  Package, 
  History,
  Phone,
  Search,
  Loader2,
  MapPin,
  Store,
  ShieldAlert
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AuditLogViewer } from "@/features/admin/components/audit-log-viewer"

interface Profile {
  id: string
  full_name: string | null
  role: string | null
  phone: string | null
  store_name: string | null
  address: string | null
  created_at: string
}

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  product_price: number
  unit_type: string
}

interface Order {
  id: string
  invoice_number: number
  status: string
  total_rounded: number
  created_at: string
  store_name: string
  phone: string
  address: string
  buyer_id: string
  merchant_id: string
  items?: OrderItem[]
  buyer_name?: string
  merchant_name?: string
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "users">("orders")
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [isSupport, setIsSupport] = useState(false)
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  const [auditLogRecordId, setAuditLogRecordId] = useState("")

  const openAuditLogFor = (id: string) => {
    setAuditLogRecordId(id)
    setShowAuditLogs(true)
  }
  const [isLoading, setIsLoading] = useState(true)
  
  // Data States
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  
  // Search States
  const [userSearch, setUserSearch] = useState("")
  const [orderSearch, setOrderSearch] = useState("")

  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (isSupport) {
      if (activeTab === "users") fetchProfiles()
      if (activeTab === "orders") fetchOrders()
    }
  }, [isSupport, activeTab])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setUserProfile(profile)
      if (profile.role === 'support' || profile.role === 'call_center' || profile.role === 'admin') {
        setIsSupport(true)
      }
    }
    setIsLoading(false)
  }

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setProfiles(data)
    }
  }

  const fetchOrders = async () => {
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && ordersData) {
      // جلب أسماء المشترين والتجار لتسهيل العرض
      const userIds = [...new Set(ordersData.flatMap(o => [o.user_id, o.merchant_id]).filter(Boolean))]
      
      let profileMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, store_name')
          .in('id', userIds)
        
        if (profilesData) {
          profileMap = Object.fromEntries(
            profilesData.map(p => [p.id, p.store_name || p.full_name || "مستخدم مجهول"])
          )
        }
      }

      const enrichedOrders = ordersData.map((o: any) => ({
        ...o,
        buyer_name: profileMap[o.user_id],
        merchant_name: profileMap[o.merchant_id],
        items: o.order_items
      }))

      setOrders(enrichedOrders)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟ سيتم تسجيل هذه الحركة في الـ Audit Log.")) return

    const { error } = await supabase.from('orders').delete().eq('id', orderId)
    if (error) {
      alert("حدث خطأ أثناء الحذف: " + error.message)
    } else {
      setOrders(prev => prev.filter(o => o.id !== orderId))
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) {
      alert("حدث خطأ أثناء تحديث الحالة: " + error.message)
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
  }

  const handleUpdateUserProfile = async (profileId: string, field: string, value: string) => {
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', profileId)
    if (error) {
      alert("خطأ: " + error.message)
    } else {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, [field]: value } : p))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (!isSupport) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-black text-destructive mb-2">صلاحيات غير كافية</h1>
        <p className="text-muted-foreground">
          هذه الصفحة مخصصة لموظفي الدعم فقط. الرجاء تسجيل الدخول بحساب موظف دعم.
        </p>
      </div>
    )
  }

  const filteredOrders = orders.filter(o => 
    String(o.invoice_number).includes(orderSearch) || 
    (o.phone || "").includes(orderSearch) ||
    (o.buyer_name || "").includes(orderSearch) ||
    (o.merchant_name || "").includes(orderSearch)
  )

  const filteredProfiles = profiles.filter(p => 
    (p.full_name || "").includes(userSearch) || 
    (p.phone || "").includes(userSearch) ||
    (p.store_name || "").includes(userSearch)
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400">لوحة دعم العملاء</h1>
            <Button 
              onClick={() => openAuditLogFor("")}
              variant="outline"
              size="sm"
              className="rounded-full shadow-sm gap-2 border-violet-500/30 text-violet-700 hover:text-violet-800 hover:bg-violet-500/10"
            >
              <History className="w-4 h-4" />
              سجل الحركات المتعمق
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">إدارة الطلبات، مساعدة المستخدمين، ومتابعة الحركات.</p>
        </div>
        
        {/* Tabs Control */}
        <div className="flex bg-muted/65 p-1 rounded-xl w-full sm:w-auto shadow-inner flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab("orders")}
            className={cn(
              "flex-grow sm:flex-grow-0 px-5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
              activeTab === "orders" ? "bg-card text-violet-600 dark:text-violet-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Package className="w-4 h-4" />
            الطلبات
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex-grow sm:flex-grow-0 px-5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
              activeTab === "users" ? "bg-card text-violet-600 dark:text-violet-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-4 h-4" />
            المستخدمين
          </button>
        </div>
      </div>

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <Card className="border border-border/40 shadow-premium animate-in fade-in duration-300 overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-violet-600 dark:text-violet-400">جميع الطلبات</CardTitle>
                <CardDescription className="text-xs">استعراض وتعديل حالات الطلبات للمساعدة في حل المشاكل</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="ابحث برقم الوصل، الاسم، أو الهاتف..." 
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="pr-9 h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                لم يتم العثور على طلبات مطابقة.
              </div>
            ) : (
              <div className="w-full overflow-x-auto pb-4">
                <table className="w-full text-right border-collapse text-xs sm:text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs">
                    <th className="p-3 font-bold">رقم الوصل</th>
                    <th className="p-3 font-bold">المشتري (الهاتف)</th>
                    <th className="p-3 font-bold">التاجر</th>
                    <th className="p-3 font-bold">تاريخ الطلب</th>
                    <th className="p-3 font-bold text-center">المبلغ</th>
                    <th className="p-3 font-bold text-center">الحالة</th>
                    <th className="p-3 font-bold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-black text-violet-600 dark:text-violet-400">#{String(order.invoice_number).padStart(5, '0')}</td>
                      <td className="p-3">
                        <div className="font-bold">{order.buyer_name || order.store_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono" dir="ltr">{order.phone}</div>
                      </td>
                      <td className="p-3 font-bold text-brand-orange">{order.merchant_name}</td>
                      <td className="p-3 text-muted-foreground text-[10px]">
                        {new Date(order.created_at).toLocaleString("ar-IQ")}
                      </td>
                      <td className="p-3 text-center font-bold tabular-nums">
                        {order.total_rounded.toLocaleString('en-US')}
                      </td>
                      <td className="p-3 text-center">
                        <select 
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="bg-card border border-border/80 rounded-lg p-1 text-xs font-bold text-center text-foreground cursor-pointer focus:border-violet-500 outline-none"
                        >
                          <option value="pending">قيد الانتظار</option>
                          <option value="delivered">مكتمل / تم التوصيل</option>
                          <option value="cancelled">ملغي</option>
                          <option value="editing">قيد التعديل</option>
                          <option value="archived">مؤرشف</option>
                        </select>
                      </td>
                      <td className="p-3 text-center flex justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openAuditLogFor(order.id)}
                          className="h-8 w-8 text-violet-600 hover:bg-violet-500/10"
                          title="سجل الحركات لهذا الطلب"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="حذف نهائي (يسجل في Audit Log)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
             </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* USERS TAB */}
      {activeTab === "users" && (
        <Card className="border border-border/40 shadow-premium animate-in fade-in duration-300 overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-violet-600 dark:text-violet-400">إدارة حسابات المستخدمين</CardTitle>
                <CardDescription className="text-xs">تعديل بيانات الاتصال ومساعدة التجار والمشترين</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="ابحث بالاسم، الهاتف، أو المتجر..." 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pr-9 h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                لم يتم العثور على مستخدمين مطابقين.
              </div>
            ) : (
              <div className="w-full overflow-x-auto pb-4">
                <table className="w-full text-right border-collapse text-xs sm:text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs">
                    <th className="p-3 font-bold">الاسم الكامل / الرتبة</th>
                    <th className="p-3 font-bold">اسم المتجر / الشركة</th>
                    <th className="p-3 font-bold">رقم الهاتف</th>
                    <th className="p-3 font-bold">العنوان</th>
                    <th className="p-3 font-bold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3">
                        <div className="font-black text-brand-blue dark:text-foreground">{profile.full_name || "مستخدم مجهول"}</div>
                        <div className="text-[10px] mt-0.5 inline-block px-2 py-0.5 rounded-full bg-muted border">
                          {profile.role === 'admin' ? 'مدير' : profile.role === 'support' ? 'دعم فني' : profile.role === 'call_center' ? 'Call Center' : profile.role === 'merchant' ? 'تاجر' : profile.role === 'delivery' ? 'توصيل' : profile.role === 'materials' ? 'إدارة المواد' : 'مشتري'}
                        </div>
                      </td>
                      <td className="p-3">
                        <Input 
                          value={profile.store_name || ''} 
                          onChange={(e) => handleUpdateUserProfile(profile.id, 'store_name', e.target.value)}
                          placeholder="اسم المتجر"
                          className="h-8 text-xs border-transparent hover:border-border focus:border-violet-500 bg-transparent hover:bg-background transition-all"
                        />
                      </td>
                      <td className="p-3">
                        <Input 
                          value={profile.phone || ''} 
                          onChange={(e) => handleUpdateUserProfile(profile.id, 'phone', e.target.value)}
                          placeholder="رقم الهاتف"
                          dir="ltr"
                          className="h-8 text-xs text-right border-transparent hover:border-border focus:border-violet-500 bg-transparent hover:bg-background transition-all"
                        />
                      </td>
                      <td className="p-3">
                        <Input 
                          value={profile.address || ''} 
                          onChange={(e) => handleUpdateUserProfile(profile.id, 'address', e.target.value)}
                          placeholder="العنوان"
                          className="h-8 text-xs border-transparent hover:border-border focus:border-violet-500 bg-transparent hover:bg-background transition-all"
                        />
                      </td>
                      <td className="p-3 text-center flex justify-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openAuditLogFor(profile.id)}
                          className="h-8 w-8 text-violet-600 hover:bg-violet-500/10"
                          title="سجل الحركات لهذا المستخدم"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
             </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* حوار سجل الحركات */}
      <AuditLogViewer 
        open={showAuditLogs} 
        onOpenChange={(open) => {
          setShowAuditLogs(open)
          if (!open) setAuditLogRecordId("")
        }} 
        initialRecordId={auditLogRecordId}
      />
    </div>
  )
}
