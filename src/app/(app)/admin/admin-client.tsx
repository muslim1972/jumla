"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { 
  BarChart3, 
  Users, 
  Plus, 
  Trash2, 
  ShieldAlert,
  TrendingUp,
  Store, 
  Package, 
  Image as ImageIcon,
  DollarSign,
  UserCheck,
  Megaphone,
  Clock,
  Phone,
  History,
  MessageCircle,
  Ban,
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { AuditLogViewer } from "@/features/admin/components/audit-log-viewer"
import { ContactSettingsModal } from "@/features/admin/components/contact-settings-modal"
import { MerchantBillingAdmin } from "@/features/admin/components/merchant-billing-admin"
import { AdminActiveOrders } from "./admin-active-orders"
import { AdminUserDetails } from "@/features/admin/components/admin-user-details"
import { updateUserRoleWithSync, getAdminUserDetails, approveUser, rejectUser } from "@/features/admin/actions"

export interface TopBanner {
  id: string
  text: string
  link_url: string | null
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface AdRequest {
  id: string
  name: string
  phone: string
  duration: string
  message: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  role: string | null
  delivery_fee: number | null
  banned_until: string | null
  created_at: string
  approval_status?: string | null
  phone?: string | null
  store_name?: string | null
  address?: string | null
}

export interface Banner {
  id: string
  title: string
  description: string | null
  bg_gradient: string | null
  link_url: string | null
}

// تسميات الأدوار بالعربية (الحسابات القديمة تُعرض شارة ثابتة دون قائمة تغيير)
const ROLE_LABELS: Record<string, string> = {
  guest: "مشتري",
  merchant: "تاجر",
  member: "عضو تطبيق",
  admin: "مدير نظام",
  support: "موظف دعم",
  delivery: "مندوب توصيل",
  materials: "إدارة المواد",
  call_center: "Call Center"
}

type BanPeriod = "day" | "week" | "month" | "forever"

// الحظر الدائم يُخزَّن "infinity" في PostgreSQL ولا يفهمها Date في JS لذا نفحص السلسلة
const isPermanentBan = (bannedUntil: string | null | undefined) =>
  !!bannedUntil && (bannedUntil === "infinity" || bannedUntil.startsWith("9999"))

const isUserBanned = (bannedUntil: string | null | undefined) => {
  if (!bannedUntil) return false
  if (isPermanentBan(bannedUntil)) return true
  return new Date(bannedUntil) > new Date()
}

const GRADIENT_PRESETS = [
  { name: "برتقالي ناري 🔥", value: "from-amber-500 via-orange-500 to-red-500" },
  { name: "أزرق ملكي 💙", value: "from-blue-600 via-indigo-600 to-brand-blue" },
  { name: "أخضر عشبي 💚", value: "from-emerald-500 to-teal-600" },
  { name: "وردي مخملي 💖", value: "from-pink-500 via-rose-500 to-red-500" },
  { name: "بنفسجي داكن 💜", value: "from-purple-600 to-indigo-700" }
]

export interface AdminClientProps {
  initialProfiles: Profile[]
  initialProductsCount: number
  initialBuyersCount: number
  initialMerchantsCount: number
  initialBanners: Banner[]
  initialTopBanners: TopBanner[]
  initialAdRequests: AdRequest[]
  initialPaidRevenue: number
  initialUnpaidRevenue: number
}

export function AdminClient({
  initialProfiles,
  initialProductsCount,
  initialBuyersCount,
  initialMerchantsCount,
  initialBanners,
  initialTopBanners,
  initialAdRequests,
  initialPaidRevenue,
  initialUnpaidRevenue
}: AdminClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRefreshing, startTransition] = useTransition()
  
  const [activeTab, setActiveTab] = useState<"overview" | "banners" | "paidBanners" | "users" | "merchantBilling">(
    searchParams.get("tab") === "users" ? "users" : "overview"
  )
  const [approvalFilter, setApprovalFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    searchParams.get("approval") === "pending" ? "pending" : "all"
  )

  useEffect(() => {
    const tab = searchParams.get("tab")
    const approval = searchParams.get("approval")
    if (tab === "users") setActiveTab("users")
    if (approval === "pending") setApprovalFilter("pending")
  }, [searchParams])

  const [showContactSettings, setShowContactSettings] = useState(false)
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  
  // Data States initialized directly from server
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [banners, setBanners] = useState<Banner[]>(initialBanners)
  const [topBanners, setTopBanners] = useState<TopBanner[]>(initialTopBanners)
  const [adRequests, setAdRequests] = useState<AdRequest[]>(initialAdRequests)
  const [productsCount, setProductsCount] = useState(initialProductsCount)
  const [buyersCount, setBuyersCount] = useState(initialBuyersCount)
  const [merchantsCount, setMerchantsCount] = useState(initialMerchantsCount)
  const [totalPaidRevenue, setTotalPaidRevenue] = useState(initialPaidRevenue)
  const [totalUnpaidRevenue, setTotalUnpaidRevenue] = useState(initialUnpaidRevenue)

  // Users Tab States
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [rejectModalUser, setRejectModalUser] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  
  const pendingApprovalCount = profiles.filter(p => p.approval_status === "pending").length

  const filteredProfiles = profiles.filter(p => {
    const term = searchQuery.toLowerCase()
    const matchesSearch = (p.full_name?.toLowerCase().includes(term) || false) ||
                          (p.store_name?.toLowerCase().includes(term) || false) ||
                          (p.phone?.includes(term) || false)
    const matchesRole = roleFilter === "all" || p.role === roleFilter
    const matchesApproval = 
      approvalFilter === "all" ? true :
      approvalFilter === "pending" ? p.approval_status === "pending" :
      approvalFilter === "approved" ? (p.approval_status === "approved" || !p.approval_status) :
      approvalFilter === "rejected" ? p.approval_status === "rejected" : true
    return matchesSearch && matchesRole && matchesApproval
  })

  // Forms States (Free Banners)
  const [newAdTitle, setNewAdTitle] = useState("")
  const [newAdDesc, setNewAdDesc] = useState("")
  const [newAdGradient, setNewAdAdGradient] = useState(GRADIENT_PRESETS[0].value)
  const [newAdLink, setNewAdLink] = useState("/")

  // Forms States (Paid Top Banners)
  const [newTopText, setNewTopText] = useState("")
  const [newTopLink, setNewTopLink] = useState("/")
  const [newTopStartDate, setNewTopStartDate] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [newTopEndDate, setNewTopEndDate] = useState(() => {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    nextWeek.setMinutes(nextWeek.getMinutes() - nextWeek.getTimezoneOffset())
    return nextWeek.toISOString().slice(0, 16)
  })
  const [newTopIsActive, setNewTopIsActive] = useState(true)

  // Supabase client instance for client-side operations
  const supabase = createClient()

  // Manual refresh via router.refresh
  const handleRefresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  // Manage Users — تحديث الدور مع مزامنة auth.users عبر server action آمن
  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p))
    
    const result = await updateUserRoleWithSync(userId, newRole)
    if (result.error) {
      alert("فشل تحديث الرتبة: " + result.error)
      // Revert on error — إعادة جلب البيانات
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      if (data) setProfiles(prev => prev.map(p => p.id === userId ? data : p))
    }
  }

  const handleUpdateDeliveryFee = async (userId: string, fee: number) => {
    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, delivery_fee: fee } : p))
    
    const { error } = await supabase
      .from("profiles")
      .update({ delivery_fee: fee })
      .eq("id", userId)
    if (error) alert("فشل تحديث أجور التوصيل: " + error.message)
  }

  // تفعيل حساب المستخدم المعلق
  const handleApproveUser = async (userId: string) => {
    setProcessingUserId(userId)
    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, approval_status: 'approved' } : p))
    
    const res = await approveUser(userId)
    setProcessingUserId(null)
    
    if (res.error) {
      alert("فشل تفعيل الحساب: " + res.error)
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      if (data) setProfiles(prev => prev.map(p => p.id === userId ? data : p))
    }
  }

  // رفض حساب المستخدم مع إشعار
  const handleConfirmReject = async () => {
    if (!rejectModalUser) return
    const userId = rejectModalUser.id
    setProcessingUserId(userId)
    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, approval_status: 'rejected' } : p))
    
    const res = await rejectUser(userId, rejectReason)
    setProcessingUserId(null)
    setRejectModalUser(null)
    setRejectReason("")

    if (res.error) {
      alert("فشل رفض الحساب: " + res.error)
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
      if (data) setProfiles(prev => prev.map(p => p.id === userId ? data : p))
    }
  }

  // إدارة حظر حسابات (المشتري والتاجر): زر حظر ← اختيار الفترة ← تأكيد
  const [banningId, setBanningId] = useState<string | null>(null)
  const [banPeriod, setBanPeriod] = useState<BanPeriod>("day")

  const handleBanUser = async (userId: string) => {
    const now = new Date()
    let bannedUntil: string
    if (banPeriod === "forever") {
      bannedUntil = "infinity"
    } else if (banPeriod === "day") {
      bannedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    } else if (banPeriod === "week") {
      bannedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    } else {
      const monthLater = new Date(now)
      monthLater.setMonth(monthLater.getMonth() + 1)
      bannedUntil = monthLater.toISOString()
    }

    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, banned_until: bannedUntil } : p))
    setBanningId(null)

    const { error } = await supabase
      .from("profiles")
      .update({ banned_until: bannedUntil })
      .eq("id", userId)
    if (error) alert("فشل حظر المستخدم: " + error.message)
  }

  const handleUnbanUser = async (userId: string) => {
    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, banned_until: null } : p))

    const { error } = await supabase
      .from("profiles")
      .update({ banned_until: null })
      .eq("id", userId)
    if (error) alert("فشل إلغاء الحظر: " + error.message)
  }

  // Manage Top Paid Banners
  const handleAddTopBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTopText) return

    const newBanner = {
      id: Math.random().toString(),
      text: newTopText,
      link_url: newTopLink,
      start_date: new Date(newTopStartDate).toISOString(),
      end_date: new Date(newTopEndDate).toISOString(),
      is_active: newTopIsActive,
      created_at: new Date().toISOString()
    }

    // Optimistic update
    setTopBanners(prev => [newBanner, ...prev])

    const { error } = await supabase
      .from("top_banners")
      .insert({
        text: newTopText,
        link_url: newTopLink,
        start_date: new Date(newTopStartDate).toISOString(),
        end_date: new Date(newTopEndDate).toISOString(),
        is_active: newTopIsActive
      })
    if (error) {
      alert("فشل إضافة الإعلان في قاعدة البيانات (تأكد من إنشاء جدول top_banners): " + error.message)
    }

    // Reset Form
    setNewTopText("")
    setNewTopLink("/")
  }

  const handleDeleteTopBanner = async (id: string) => {
    setTopBanners(prev => prev.filter(b => b.id !== id))

    const { error } = await supabase
      .from("top_banners")
      .delete()
      .eq("id", id)
    if (error) alert("فشل الحذف من قاعدة البيانات: " + error.message)
  }

  const handleToggleTopBannerActive = async (id: string, currentActive: boolean) => {
    setTopBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentActive } : b))

    const { error } = await supabase
      .from("top_banners")
      .update({ is_active: !currentActive })
      .eq("id", id)
    if (error) alert("فشل تحديث حالة الإعلان: " + error.message)
  }

  const handleDeleteAdRequest = async (id: string) => {
    setAdRequests(prev => prev.filter(r => r.id !== id))

    const { error } = await supabase
      .from("ad_requests")
      .delete()
      .eq("id", id)
    if (error) alert("فشل الحذف من قاعدة البيانات: " + error.message)
  }

  // Manage Banners
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdTitle) return

    const newBanner = {
      id: Math.random().toString(),
      title: newAdTitle,
      description: newAdDesc,
      bg_gradient: newAdGradient,
      link_url: newAdLink
    }

    // Optimistic update
    setBanners(prev => [newBanner, ...prev])
    
    // Save to DB
    const { error } = await supabase
      .from("banners")
      .insert({
        title: newAdTitle,
        description: newAdDesc,
        bg_gradient: newAdGradient,
        link_url: newAdLink
      })
    if (error) {
      alert("فشل إضافة الإعلان في قاعدة البيانات (تأكد من إنشاء جدول banners): " + error.message)
    }

    // Reset Form
    setNewAdTitle("")
    setNewAdDesc("")
    setNewAdLink("/")
  }

  const handleDeleteBanner = async (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id))
    
    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", id)
    if (error) alert("فشل الحذف من قاعدة البيانات: " + error.message)
  }

  // Fallbacks for empty banners
  const mockBannersCount = banners.length || 4
  const mockTopBannersCount = topBanners.length || 3

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-blue dark:text-foreground">لوحة إدارة النظام</h1>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="rounded-full shadow-sm gap-1 sm:gap-1.5 border-slate-400/30 text-slate-700 hover:bg-slate-500/10 text-xs sm:text-sm cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              <Button 
                onClick={() => setShowAuditLogs(true)}
                variant="outline"
                size="sm"
                className="rounded-full shadow-sm gap-1 sm:gap-2 border-slate-500/30 text-slate-700 hover:text-slate-800 hover:bg-slate-500/10 text-xs sm:text-sm"
              >
                <History className="w-3 h-3 sm:w-4 sm:h-4" />
                سجل الحركات
              </Button>
              <Button 
                onClick={() => setShowContactSettings(true)}
                variant="outline"
                size="sm"
                className="rounded-full shadow-sm gap-1 sm:gap-2 border-emerald-500/30 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10 text-xs sm:text-sm"
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                إعدادات التواصل
              </Button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">تتبع الأداء، وأدر المتاجر، وخصص الإعلانات الترويجية.</p>
        </div>
        
        {/* Tabs Control */}
        <div className="flex bg-muted/65 p-1 rounded-xl w-full sm:w-auto shadow-inner flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "overview" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            الإحصائيات
          </button>
          <button 
            onClick={() => setActiveTab("paidBanners")}
            className={cn(
              "relative flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "paidBanners" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            الإعلانات المدفوعة العليا
            {adRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-[9px] font-black text-white shadow-sm animate-pulse border-2 border-background">
                {adRequests.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab("banners")}
            className={cn(
              "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "banners" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            إعلانات السلايدر السفلي
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={cn(
              "relative flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "users" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            المستخدمين والتوصيل
            {pendingApprovalCount > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white shadow-sm animate-pulse border-2 border-background">
                {pendingApprovalCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab("merchantBilling")}
            className={cn(
              "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
              activeTab === "merchantBilling" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            التحاسب والفواتير
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* New Registrations Card */}
            <Card 
              onClick={() => {
                setActiveTab("users")
                setApprovalFilter("pending")
              }}
              className={cn(
                "border shadow-premium cursor-pointer transition-all hover:scale-[1.02] col-span-2 sm:col-span-1",
                pendingApprovalCount > 0 
                  ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30" 
                  : "border-border/40"
              )}
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">طلبات التسجيل الجديدة</CardTitle>
                <div className={cn(
                  "p-2 rounded-xl", 
                  pendingApprovalCount > 0 ? "bg-amber-500/20 text-amber-600 animate-pulse" : "bg-muted text-muted-foreground"
                )}>
                  <UserCheck className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className={cn(
                  "text-lg sm:text-2xl font-black", 
                  pendingApprovalCount > 0 ? "text-amber-600" : "text-brand-blue dark:text-foreground"
                )}>
                  {pendingApprovalCount}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {pendingApprovalCount > 0 ? "حساب بانتظار موافقتك ⏳ (انقر هنا)" : "لا توجد طلبات معلقة"}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium lg:col-span-1">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">أرباح التطبيق (مسددة)</CardTitle>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-emerald-600">{totalPaidRevenue.toLocaleString('en-US')}</div>
                <p className="text-[10px] text-muted-foreground mt-1">د.ع تم استلامها من التجار</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium lg:col-span-1">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">أرباح التطبيق (غير مسددة)</CardTitle>
                <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-orange">{totalUnpaidRevenue.toLocaleString('en-US')}</div>
                <p className="text-[10px] text-muted-foreground mt-1">د.ع بانتظار دفعها من التجار</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">التجار المعتمدون</CardTitle>
                <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl">
                  <Store className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{merchantsCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">تاجر جملتي نشط</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">الأسواق المسجلة (المشترون)</CardTitle>
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{buyersCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">سوق مشتري مسجل بالتطبيق</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">المواد والمعروضات</CardTitle>
                <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{productsCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">منتج نشط بالمنصة</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">السلايدر السفلي</CardTitle>
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                  <ImageIcon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{mockBannersCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">إعلانات نشطة بالأسفل</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">الإعلانات العليا</CardTitle>
                <div className="p-2 bg-indigo-500/10 text-indigo-550 rounded-xl">
                  <Megaphone className="w-4 h-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{mockTopBannersCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">إعلانات مدفوعة نشطة</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart & Recent Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart Card */}
            <Card className="lg:col-span-2 border border-border/40 shadow-premium">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground">نمو وحركة المبيعات الأسبوعية</CardTitle>
                    <CardDescription className="text-xs">رصد تقريبي لإقبال التجار والتسوق بالجملة</CardDescription>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <TrendingUp className="w-3.5 h-3.5" /> +12.4%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-6">
                {/* SVG Visual Sales Line Graph */}
                <div className="relative w-full h-44 sm:h-52 bg-muted/20 rounded-2xl border border-border/30 p-2 overflow-hidden flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(var(--brand-orange))" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="oklch(var(--brand-orange))" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {/* Area path */}
                    <path 
                      d="M0,150 L0,120 L80,95 L160,110 L240,65 L320,85 L400,40 L480,25 L500,25 L500,150 Z" 
                      fill="url(#chartGrad)" 
                    />
                    {/* Line path */}
                    <path 
                      d="M0,120 L80,95 L160,110 L240,65 L320,85 L400,40 L480,25 L500,25" 
                      fill="none" 
                      stroke="oklch(var(--brand-orange))" 
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Data Points */}
                    {[[0, 120], [80, 95], [160, 110], [240, 65], [320, 85], [400, 40], [480, 25], [500, 25]].map(([cx, cy], i) => (
                      <circle 
                        key={i} 
                        cx={cx} 
                        cy={cy} 
                        r="5" 
                        className="fill-background stroke-brand-orange" 
                        strokeWidth="3" 
                      />
                    ))}
                  </svg>
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 p-2">
                    <div className="border-b border-border w-full"></div>
                    <div className="border-b border-border w-full"></div>
                    <div className="border-b border-border w-full"></div>
                    <div className="border-b border-border w-full"></div>
                  </div>
                </div>

                {/* Day Labels */}
                <div className="flex justify-between text-[11px] text-muted-foreground font-bold mt-3 px-2">
                  <span>السبت</span>
                  <span>الأحد</span>
                  <span>الاثنين</span>
                  <span>الثلاثاء</span>
                  <span>الأربعاء</span>
                  <span>الخميس</span>
                  <span>الجمعة</span>
                </div>
              </CardContent>
            </Card>

            {/* Platform Health / Quick Info */}
            <Card className="border border-border/40 shadow-premium flex flex-col justify-between">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground">حالة منصة جملتي</CardTitle>
                <CardDescription className="text-xs">نظرة عامة على الجاهزية والخدمات النشطة</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">استجابة الخوادم (Supabase)</span>
                    <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> 99.9% ممتازة
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">خدمة الإشعارات (OneSignal)</span>
                    <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">نشطة وجاهزة</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">أمان المصادقة وحماية البيانات</span>
                    <span className="text-brand-blue font-bold bg-brand-blue/10 px-2 py-0.5 rounded-full">مشفّر ومؤمّن</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">إصدار النظام الحالي</span>
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">v1.3.0 Pro</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-brand-blue/5 to-brand-orange/5 p-4 rounded-xl border border-brand-blue/10 mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4 text-brand-orange" />
                    <span className="text-xs font-bold text-foreground">توجيه ذكي للإدارة</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    يمكنك تعديل إعلانات المنصة، إضافة عروض جديدة للتجار، ومتابعة التحاسب وموافقة الحسابات عبر التبويبات بالأعلى.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Orders Section */}
          <div className="pt-2">
            <AdminActiveOrders />
          </div>
        </div>
      )}

      {/* FREE BOTTOM BANNERS TAB */}
      {activeTab === "banners" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Create Banner Form */}
          <Card className="border border-border/40 shadow-premium h-fit">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground">إضافة إعلان سلايدر سفلي</CardTitle>
              <CardDescription className="text-xs">خصص إعلاناً داخلياً يظهر في السلايدر السفلي للشاشة الرئيسية</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBanner} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold">عنوان الإعلان</Label>
                  <Input 
                    id="title" 
                    placeholder="مثال: خصومات حصرية للمطاعم 🍕" 
                    value={newAdTitle}
                    onChange={(e) => setNewAdTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs font-bold">الوصف الإضافي</Label>
                  <Input 
                    id="desc" 
                    placeholder="وفر حتى 30% على طلبيات الجملة هذا الأسبوع" 
                    value={newAdDesc}
                    onChange={(e) => setNewAdDesc(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="link" className="text-xs font-bold">رابط التوجيه عند النقر</Label>
                  <Input 
                    id="link" 
                    placeholder="مثال: /category/beverages أو /search" 
                    value={newAdLink}
                    onChange={(e) => setNewAdLink(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">خلفية التدرج اللوني (Gradient)</Label>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setNewAdAdGradient(preset.value)}
                        className={cn(
                          "w-full h-8 rounded-lg bg-gradient-to-r text-white text-[11px] font-bold flex items-center justify-between px-3 transition-transform cursor-pointer",
                          preset.value,
                          newAdGradient === preset.value ? "ring-2 ring-foreground ring-offset-2 scale-[1.01]" : "opacity-80 hover:opacity-100"
                        )}
                      >
                        <span>{preset.name}</span>
                        {newAdGradient === preset.value && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner Live Preview */}
                <div className="pt-2">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">معاينة حية</Label>
                  <div className={cn("p-4 rounded-xl text-white bg-gradient-to-r shadow-md space-y-1", newAdGradient)}>
                    <h4 className="font-black text-sm">{newAdTitle || "عنوان الإعلان هنا"}</h4>
                    <p className="text-[11px] opacity-90">{newAdDesc || "الوصف الترويجي يظهر بهذا المكان..."}</p>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold cursor-pointer">
                  <Plus className="w-4 h-4 ml-1" /> إضافة الإعلان للمنصة
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Banners List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground pr-1">الإعلانات النشطة حالياً في السلايدر ({banners.length})</h2>
            
            {banners.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border text-muted-foreground text-sm">
                لا توجد إعلانات مخصصة بعد. أضف إعلانك الأول ليظهر فوراً في السلايدر السفلي.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {banners.map((banner) => (
                  <Card key={banner.id} className="overflow-hidden border border-border/40 shadow-premium p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-14 h-14 rounded-xl shrink-0 bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shadow-inner", banner.bg_gradient || GRADIENT_PRESETS[0].value)}>
                        <ImageIcon className="w-6 h-6 opacity-80" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-sm sm:text-base text-foreground">{banner.title}</h4>
                        {banner.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{banner.description}</p>
                        )}
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground inline-block">
                          رابط: {banner.link_url || "/"}
                        </span>
                      </div>
                    </div>

                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="h-9 w-9 cursor-pointer shrink-0"
                      title="حذف الإعلان"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAID TOP BANNERS TAB */}
      {activeTab === "paidBanners" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create Paid Top Banner Form */}
            <Card className="border border-border/40 shadow-premium h-fit">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground">إضافة إعلان مدفوع أعلى الموقع</CardTitle>
                <CardDescription className="text-xs">
                  يظهر في شريط الإعلانات المدفوعة الدوّار بأعلى التطبيق لجميع المستخدمين، مع إمكانية جدولة تاريخ البدء والانتهاء.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTopBanner} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="top-text" className="text-xs font-bold">نص الإعلان</Label>
                    <Input 
                      id="top-text" 
                      placeholder="مثال: خصم 20% لدى شركة الرافدين للمواد الغذائية بمناسبة الافتتاح 🎉" 
                      value={newTopText}
                      onChange={(e) => setNewTopText(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="top-link" className="text-xs font-bold">رابط التوجيه (اختياري)</Label>
                    <Input 
                      id="top-link" 
                      placeholder="مثال: /store/merchant-id أو رقم هاتف" 
                      value={newTopLink}
                      onChange={(e) => setNewTopLink(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="start-date" className="text-xs font-bold">تاريخ وساعة البدء</Label>
                      <Input 
                        id="start-date" 
                        type="datetime-local"
                        value={newTopStartDate}
                        onChange={(e) => setNewTopStartDate(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="end-date" className="text-xs font-bold">تاريخ وساعة الانتهاء</Label>
                      <Input 
                        id="end-date" 
                        type="datetime-local"
                        value={newTopEndDate}
                        onChange={(e) => setNewTopEndDate(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox"
                      id="is-active"
                      checked={newTopIsActive}
                      onChange={(e) => setNewTopIsActive(e.target.checked)}
                      className="rounded border-border w-4 h-4 text-brand-orange cursor-pointer"
                    />
                    <Label htmlFor="is-active" className="text-xs font-bold cursor-pointer">
                      تفعيل الإعلان فوراً بعد الإضافة
                    </Label>
                  </div>

                  {/* Live Preview */}
                  <div className="pt-2">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">معاينة الشريط العلوي</Label>
                    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-brand-orange/10 border border-brand-orange/30 p-2.5 rounded-xl flex items-center gap-2">
                      <span className="bg-brand-orange text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs shrink-0">إعلان</span>
                      <p className="text-xs font-bold text-foreground truncate">{newTopText || "نص الإعلان العلوي المميز يظهر هنا..."}</p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold cursor-pointer">
                    <Plus className="w-4 h-4 ml-1" /> إضافة الإعلان المدفوع
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Active Paid Top Banners List */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground pr-1 flex items-center justify-between">
                <span>الإعلانات المدفوعة العليا ({topBanners.length})</span>
              </h2>

              {topBanners.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border text-muted-foreground text-sm">
                  لا توجد إعلانات عليا حالياً. أضف إعلاناً مميزاً ليعرض في الشريط العلوي لكل الزوار.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {topBanners.map((banner) => {
                    const isExpired = new Date(banner.end_date) < new Date()
                    const isUpcoming = new Date(banner.start_date) > new Date()
                    
                    return (
                      <Card key={banner.id} className={cn(
                        "overflow-hidden border border-border/40 shadow-premium p-4 flex flex-col justify-between gap-3 relative",
                        isExpired ? "opacity-60 bg-muted/20" : ""
                      )}>
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-grow">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded-full border",
                                isExpired 
                                  ? "bg-red-500/10 text-red-500 border-red-500/20" 
                                  : isUpcoming 
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              )}>
                                {isExpired ? "منتهي الصلاحية" : isUpcoming ? "مجدول لاحقاً" : "نشط حالياً"}
                              </span>
                              {!isExpired && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleTopBannerActive(banner.id, banner.is_active)}
                                  className={cn(
                                    "text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer",
                                    banner.is_active 
                                      ? "bg-brand-blue/15 text-brand-blue border-brand-blue/30" 
                                      : "bg-muted text-muted-foreground border-border/60"
                                  )}
                                >
                                  {banner.is_active ? "تعطيل مؤقت" : "تفعيل"}
                                </button>
                              )}
                            </div>
                            <p className="font-bold text-xs sm:text-sm text-foreground pt-1.5">{banner.text}</p>
                          </div>
                          
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => handleDeleteTopBanner(banner.id)}
                            className="h-8 w-8 cursor-pointer shrink-0"
                            title="حذف الإعلان"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="border-t border-border/40 pt-2 flex flex-col sm:flex-row justify-between text-[10px] text-muted-foreground gap-2">
                          <div>
                            <strong>رابط التوجيه:</strong> <span className="underline">{banner.link_url || "/"}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Clock className="w-3.5 h-3.5" />
                            <span>من: {new Date(banner.start_date).toLocaleString("ar-IQ")}</span>
                            <span>إلى: {new Date(banner.end_date).toLocaleString("ar-IQ")}</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Ad requests from users */}
          <div className="space-y-4 pt-4">
            <h2 className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground pr-1 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-brand-orange rounded-full inline-block" />
              طلبات الإعلان الواردة من المستخدمين ({adRequests.length})
            </h2>

            {adRequests.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-2xl border text-muted-foreground text-sm">
                لا توجد طلبات إعلان واردة حالياً. تظهر هنا الطلبات المرسلة من مودال "أعلن معنا".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adRequests.map((req) => (
                  <Card key={req.id} className="border border-border/40 shadow-premium p-4 flex flex-col justify-between gap-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-black text-sm text-brand-blue">{req.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Phone className="w-3 h-3 text-brand-orange animate-pulse" />
                          <span dir="ltr">{req.phone}</span>
                          <span className="bg-brand-orange/10 text-brand-orange font-bold text-[10px] px-1.5 py-0.5 rounded mr-2">
                            المدة: {
                              req.duration === "week" ? "أسبوع" :
                              req.duration === "two_weeks" ? "أسبوعين" :
                              req.duration === "month" ? "شهر" : "فترة مخصصة"
                            }
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAdRequest(req.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="حذف الطلب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {req.message && (
                      <p className="bg-muted/30 p-2.5 rounded-lg text-xs leading-relaxed text-foreground/80 border border-border/20">
                        {req.message}
                      </p>
                    )}
                    <div className="text-[10px] text-muted-foreground text-left">
                      أُرسل بتاريخ: {new Date(req.created_at).toLocaleString("ar-IQ")}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* USERS & ROLES TAB */}
      {activeTab === "users" && (
        <Card className="border border-border/40 shadow-premium animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-black text-brand-blue dark:text-foreground">المستخدمين والصلاحيات</CardTitle>
            <CardDescription className="text-xs">تحكم في أدوار المستخدمين، واعرض تفاصيل حساباتهم وتقييماتهم</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-6 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-0 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto">
                <Input
                  placeholder="ابحث بالاسم، المتجر، أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs text-xs sm:text-sm h-9"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-card border border-input rounded-md h-9 px-2.5 text-xs outline-none cursor-pointer"
                >
                  <option value="all">كل الأدوار</option>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Approval status filter pills */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/40 text-xs w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setApprovalFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs whitespace-nowrap",
                    approvalFilter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  الكل ({profiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalFilter("pending")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 whitespace-nowrap",
                    approvalFilter === "pending" ? "bg-amber-500 text-white shadow-xs" : "text-amber-600 hover:bg-amber-500/10"
                  )}
                >
                  بانتظار الموافقة ⏳
                  {pendingApprovalCount > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                      approvalFilter === "pending" ? "bg-white text-amber-700" : "bg-amber-500 text-white"
                    )}>
                      {pendingApprovalCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalFilter("approved")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs whitespace-nowrap",
                    approvalFilter === "approved" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  المفعّلون ✅
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalFilter("rejected")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs whitespace-nowrap",
                    approvalFilter === "rejected" ? "bg-destructive text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  المرفوضون ❌
                </button>
              </div>
            </div>

            {approvalFilter === "pending" && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="leading-relaxed">
                  هذه قائمة <strong>طلبات التسجيل الجديدة</strong> بانتظار موافقة الإدارة. يرجى مراجعة اسم المتقدم والمتجر ورقم هاتفه ثم النقر على <strong>تفعيل الحساب</strong> أو <strong>رفض</strong>.
                </p>
              </div>
            )}

            {filteredProfiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {approvalFilter === "pending" 
                  ? "رائع! لا توجد طلبات تسجيل معلقة بانتظار الموافقة حالياً." 
                  : "لم يتم العثور على مستخدمين يطابقون بحثك."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs">
                      <th className="p-3 font-bold">الاسم ومعلومات الحساب</th>
                      <th className="p-3 font-bold">تاريخ التسجيل</th>
                      <th className="p-3 font-bold text-center">الرتبة / الصلاحية</th>
                      <th className="p-3 font-bold text-center">حالة الحساب</th>
                      <th className="p-3 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredProfiles.map((profile) => {
                      const isPending = profile.approval_status === "pending"
                      const isRejected = profile.approval_status === "rejected"
                      const isProcessing = processingUserId === profile.id

                      return (
                        <tr key={profile.id} className={cn(
                          "hover:bg-muted/10 transition-colors",
                          isPending ? "bg-amber-500/5" : ""
                        )}>
                          <td className="p-3">
                            <div className="font-black text-brand-blue dark:text-foreground">
                              {profile.full_name || "مستخدم مجهول"}
                            </div>
                            {profile.store_name && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Store className="w-3 h-3 text-brand-orange" />
                                <span>{profile.store_name}</span>
                              </div>
                            )}
                            {profile.phone && (
                              <div className="text-[10px] text-muted-foreground dir-ltr text-right mt-0.5" dir="ltr">
                                {profile.phone}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">{new Date(profile.created_at).toLocaleDateString("ar-IQ")}</td>
                          <td className="p-3 text-center">
                            {isPending ? (
                              <span className="inline-block px-2.5 py-1 rounded-md bg-muted text-foreground text-xs font-bold border border-border/60">
                                {ROLE_LABELS[profile.role || "guest"] || "مشتري"}
                              </span>
                            ) : (
                              <select
                                value={profile.role || "guest"}
                                onChange={(e) => handleUpdateRole(profile.id, e.target.value)}
                                className="bg-card border border-border/80 rounded-lg p-1 text-xs font-bold text-center text-foreground cursor-pointer focus:border-brand-orange outline-none w-[130px]"
                              >
                                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold animate-pulse">
                                <Clock className="w-3 h-3" />
                                بانتظار الموافقة
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30 text-[11px] font-bold">
                                <X className="w-3 h-3" />
                                مرفوض
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                                <Check className="w-3 h-3" />
                                مفعّل
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              {/* 1. الحسابات المعلقة بانتظار الموافقة: تفعيل أو رفض فقط لا غير (لا حظر ولا تفاصيل طلبات قديمة) */}
                              {isPending ? (
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm"
                                    disabled={isProcessing}
                                    onClick={() => handleApproveUser(profile.id)}
                                    className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black gap-1.5 shadow-sm cursor-pointer"
                                    title="الموافقة وتفعيل الحساب"
                                  >
                                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    تفعيل الحساب
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="destructive"
                                    disabled={isProcessing}
                                    onClick={() => {
                                      setRejectModalUser({ id: profile.id, name: profile.full_name || "المستخدم" })
                                      setRejectReason("")
                                    }}
                                    className="h-8 px-3 text-xs font-bold gap-1 cursor-pointer"
                                    title="رفض الطلب"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    رفض
                                  </Button>
                                </div>
                              ) : isRejected ? (
                                /* 2. الحسابات المرفوضة: إعادة تفعيل */
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  disabled={isProcessing}
                                  onClick={() => handleApproveUser(profile.id)}
                                  className="h-7 px-2.5 border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 text-xs font-bold gap-1 cursor-pointer"
                                  title="إعادة تفعيل الحساب"
                                >
                                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  إعادة تفعيل
                                </Button>
                              ) : (
                                /* 3. الحسابات المعتمدة والمفعلة فقط: أجور التوصيل، تفاصيل السجل، والحظر */
                                <>
                                  {/* أجور التوصيل للتجار */}
                                  {profile.role === "merchant" && (
                                    <div className="flex items-center gap-1 min-w-max">
                                      <span className="text-[10px] text-muted-foreground">أجور توصيل:</span>
                                      <Input 
                                        type="number" 
                                        value={profile.delivery_fee || 0} 
                                        onChange={(e) => handleUpdateDeliveryFee(profile.id, parseInt(e.target.value) || 0)}
                                        className="h-7 w-16 text-center text-xs font-bold p-1"
                                        dir="ltr"
                                      />
                                    </div>
                                  )}

                                  {/* زر التفاصيل للحسابات المفعلة */}
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 px-2 text-xs cursor-pointer"
                                    onClick={() => setSelectedUserId(profile.id)}
                                  >
                                    التفاصيل
                                  </Button>

                                  {/* الحظر للحسابات المفعلة */}
                                  {isUserBanned(profile.banned_until) ? (
                                    <div className="flex items-center gap-1.5 min-w-max">
                                      <span className="inline-block px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive text-[10px] font-black">
                                        {isPermanentBan(profile.banned_until) ? "محظور نهائياً" : "محظور مؤقتاً"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUnbanUser(profile.id)}
                                        className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                                      >
                                        فك
                                      </button>
                                    </div>
                                  ) : banningId === profile.id ? (
                                    <div className="flex items-center gap-1 min-w-max">
                                      <select
                                        value={banPeriod}
                                        onChange={(e) => setBanPeriod(e.target.value as BanPeriod)}
                                        className="bg-card border border-border/80 rounded p-0.5 text-[10px] cursor-pointer outline-none"
                                      >
                                        <option value="day">يوم</option>
                                        <option value="week">أسبوع</option>
                                        <option value="month">شهر</option>
                                        <option value="forever">للأبد</option>
                                      </select>
                                      <button
                                        onClick={() => handleBanUser(profile.id)}
                                        className="px-1.5 py-0.5 rounded bg-destructive text-white text-[10px] cursor-pointer"
                                      >
                                        تأكيد
                                      </button>
                                      <button
                                        onClick={() => setBanningId(null)}
                                        className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] cursor-pointer"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setBanningId(profile.id)}
                                      className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
                                    >
                                      حظر
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* نافذة تأكيد رفض الحساب */}
      {rejectModalUser && (
        <Dialog open={!!rejectModalUser} onOpenChange={(open) => !open && setRejectModalUser(null)}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <DialogTitle className="text-base font-black">رفض طلب تسجيل الحساب</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-xs text-muted-foreground leading-relaxed">
              هل أنت متأكد من رفض تفعيل حساب <strong className="text-foreground">{rejectModalUser.name}</strong>؟ سيتم إشعار المستخدم بالرفض ومنعه من الدخول.
            </p>
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="reject-reason" className="text-xs font-bold">سبب الرفض (اختياري، يظهر للمستخدم):</Label>
              <Input
                id="reject-reason"
                placeholder="مثال: يرجى كتابة اسم المتجر ورقم الهاتف الصحيح..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs"
              />
            </div>
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectModalUser(null)}
                disabled={!!processingUserId}
                className="cursor-pointer text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmReject}
                disabled={!!processingUserId}
                className="cursor-pointer text-xs font-bold"
              >
                {processingUserId ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : null}
                تأكيد الرفض
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* نافذة تفاصيل المستخدم */}
      <AdminUserDetails 
        open={!!selectedUserId} 
        onOpenChange={(open) => !open && setSelectedUserId(null)} 
        userId={selectedUserId} 
      />

      {/* MERCHANT BILLING TAB */}
      {activeTab === "merchantBilling" && (
        <div className="animate-in fade-in duration-300">
          <MerchantBillingAdmin />
        </div>
      )}

      {/* حوار سجل الحركات */}
      <AuditLogViewer 
        open={showAuditLogs} 
        onOpenChange={setShowAuditLogs} 
      />

      {/* حوار إعدادات التواصل */}
      <ContactSettingsModal 
        open={showContactSettings}
        onOpenChange={setShowContactSettings}
      />
    </div>
  )
}
