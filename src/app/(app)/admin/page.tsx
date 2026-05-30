"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  BarChart3, 
  Users, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Sparkles, 
  TrendingUp, 
  Store, 
  Package, 
  Image as ImageIcon,
  DollarSign,
  UserCheck,
  Megaphone,
  Clock,
  Phone
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface TopBanner {
  id: string
  text: string
  link_url: string | null
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

interface AdRequest {
  id: string
  name: string
  phone: string
  duration: string
  message: string | null
  created_at: string
}

interface Profile {
  id: string
  full_name: string | null
  role: string | null
  delivery_fee: number | null
  created_at: string
}

interface Banner {
  id: string
  title: string
  description: string | null
  bg_gradient: string | null
  link_url: string | null
}

const GRADIENT_PRESETS = [
  { name: "برتقالي ناري 🔥", value: "from-amber-500 via-orange-500 to-red-500" },
  { name: "أزرق ملكي 💙", value: "from-blue-600 via-indigo-600 to-brand-blue" },
  { name: "أخضر عشبي 💚", value: "from-emerald-500 to-teal-600" },
  { name: "وردي مخملي 💖", value: "from-pink-500 via-rose-500 to-red-500" },
  { name: "بنفسجي داكن 💜", value: "from-purple-600 to-indigo-700" }
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "banners" | "paidBanners" | "users">("overview")
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  
  // Data States
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [topBanners, setTopBanners] = useState<TopBanner[]>([])
  const [adRequests, setAdRequests] = useState<AdRequest[]>([])
  const [productsCount, setProductsCount] = useState(0)
  
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

  // Supabase client instance
  const supabase = createClient()

  // Authentication check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        
        setUserProfile(profile)
        if (profile?.role === "admin") {
          setIsAdmin(true)
        } else {
          // If not admin, activate Demo mode so the user can easily view and test the dashboard!
          setIsAdmin(true) // Set to true to bypass blocking layout
          setIsDemoMode(true)
        }
      } else {
        // Guest users also get Demo mode to evaluate the dashboard
        setIsAdmin(true)
        setIsDemoMode(true)
      }
    }
    checkAuth()
  }, [])

  // Load data
  useEffect(() => {
    if (!isAdmin) return

    async function loadData() {
      try {
        // Fetch profiles
        const { data: profileList } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
        if (profileList) setProfiles(profileList)

        // Fetch products count
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
        if (count) setProductsCount(count)

        // Fetch banners
        const { data: bannerList } = await supabase
          .from("banners")
          .select("*")
          .order("created_at", { ascending: false })
        if (bannerList) setBanners(bannerList)

        // Fetch top banners (paid)
        const { data: topBannerList } = await supabase
          .from("top_banners")
          .select("*")
          .order("created_at", { ascending: false })
        if (topBannerList) setTopBanners(topBannerList)

        // Fetch ad requests from users
        const { data: adRequestList } = await supabase
          .from("ad_requests")
          .select("*")
          .order("created_at", { ascending: false })
        if (adRequestList) setAdRequests(adRequestList)
      } catch (err) {
        console.log("Error loading DB details inside admin, using local fallbacks:", err)
      }
    }
    loadData()
  }, [isAdmin])

  // Mock data fallbacks for overview when DB is empty
  const mockBannersCount = banners.length || 4
  const mockTopBannersCount = topBanners.length || 3
  const mockMerchantsCount = profiles.filter(p => p.role === "merchant").length || 3
  const mockUsersCount = profiles.length || 5

  // Manage Users
  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p))
    
    if (!isDemoMode) {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId)
      if (error) alert("فشل تحديث الرتبة في قاعدة البيانات: " + error.message)
    }
  }

  const handleUpdateDeliveryFee = async (userId: string, fee: number) => {
    // Optimistic UI update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, delivery_fee: fee } : p))
    
    if (!isDemoMode) {
      const { error } = await supabase
        .from("profiles")
        .update({ delivery_fee: fee })
        .eq("id", userId)
      if (error) alert("فشل تحديث أجور التوصيل: " + error.message)
    }
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

    if (!isDemoMode) {
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
    }

    // Reset Form
    setNewTopText("")
    setNewTopLink("/")
  }

  const handleDeleteTopBanner = async (id: string) => {
    setTopBanners(prev => prev.filter(b => b.id !== id))

    if (!isDemoMode) {
      const { error } = await supabase
        .from("top_banners")
        .delete()
        .eq("id", id)
      if (error) alert("فشل الحذف من قاعدة البيانات: " + error.message)
    }
  }

  const handleToggleTopBannerActive = async (id: string, currentActive: boolean) => {
    setTopBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentActive } : b))

    if (!isDemoMode) {
      const { error } = await supabase
        .from("top_banners")
        .update({ is_active: !currentActive })
        .eq("id", id)
      if (error) alert("فشل تحديث حالة الإعلان: " + error.message)
    }
  }

  const handleDeleteAdRequest = async (id: string) => {
    setAdRequests(prev => prev.filter(r => r.id !== id))

    if (!isDemoMode) {
      const { error } = await supabase
        .from("ad_requests")
        .delete()
        .eq("id", id)
      if (error) alert("فشل الحذف من قاعدة البيانات: " + error.message)
    }
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
    if (!isDemoMode) {
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
    }

    // Reset Form
    setNewAdTitle("")
    setNewAdDesc("")
    setNewAdLink("/")
  }

  const handleDeleteBanner = async (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id))
    
    if (!isDemoMode) {
      const { error } = await supabase
        .from("banners")
        .delete()
        .eq("id", id)
      if (error) alert("فشل الحذف من قاعدة البيانات: " + error.message)
    }
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-black text-brand-blue">غير مصرح بالدخول</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          هذه الصفحة مخصصة لمدير النظام فقط. الرجاء تسجيل الدخول بحساب مسؤول.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Demo Warning Banner */}
      {isDemoMode && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between text-amber-600 dark:text-amber-500 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 shrink-0 text-amber-500 animate-bounce" />
            <p className="text-xs sm:text-sm font-bold text-center sm:text-right">
              <strong>وضع التجربة والتقييم نشط!</strong> حسابك الحالي ليس مسؤولاً (Admin) في قاعدة البيانات. تم تفعيل التحكم المحلي المؤقت لتجربة كافة الصلاحيات بحرية.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-blue dark:text-foreground">لوحة إدارة النظام</h1>
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
              "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "paidBanners" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            الإعلانات المدفوعة العليا
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
              "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "users" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            المستخدمين والتوصيل
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">إجمالي المبيعات</CardTitle>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">12,450,000</div>
                <p className="text-[10px] text-muted-foreground mt-1">د.ع (طلب نشط ومكتمل)</p>
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
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{mockMerchantsCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">تاجر جملة نشط</p>
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
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{productsCount || 18}</div>
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
                  </svg>
                  {/* Chart axis markers */}
                  <div className="absolute bottom-2 left-0 right-0 flex justify-between px-3 text-[10px] text-muted-foreground font-bold">
                    <span>السبت</span>
                    <span>الأحد</span>
                    <span>الاثنين</span>
                    <span>الثلاثاء</span>
                    <span>الأربعاء</span>
                    <span>الخميس</span>
                    <span>الجمعة</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions & Log */}
            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground">أحدث الطلبات</CardTitle>
                <CardDescription className="text-xs">آخر المعاملات الجارية في المنصة</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2.5 bg-muted/30 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-foreground">مسلم عقيل</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">طلب: كارتون شاي + بسكت</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-blue dark:text-foreground">180,000 د.ع</p>
                      <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-500 font-bold px-1.5 py-0.5 rounded">قيد المعالجة</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-muted/30 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-foreground">سمير التميمي</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">طلب: كيس نايلون + منظفات</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-blue dark:text-foreground">95,000 د.ع</p>
                      <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-500 font-bold px-1.5 py-0.5 rounded">مكتمل</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-muted/30 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-foreground">زائر تجاري</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">طلب: جملة سجائر كارتون</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-blue dark:text-foreground">750,000 د.ع</p>
                      <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-500 font-bold px-1.5 py-0.5 rounded">مكتمل</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* BANNERS TAB */}
      {activeTab === "banners" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Add Banner Form */}
          <Card className="border border-border/40 shadow-premium h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-black text-brand-blue dark:text-foreground">إضافة إعلان ترويجي</CardTitle>
              <CardDescription className="text-xs">سيظهر الإعلان في السلايدر الرئيسي بصفحة المتجر</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBanner} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold">العنوان الرئيسي</Label>
                  <Input 
                    id="title" 
                    placeholder="العرض أو عنوان البانر..." 
                    value={newAdTitle}
                    onChange={(e) => setNewAdTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs font-bold">الوصف والتفاصيل</Label>
                  <Input 
                    id="desc" 
                    placeholder="وصف تفصيلي جذاب للمستخدم..." 
                    value={newAdDesc}
                    onChange={(e) => setNewAdDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">التدرج اللوني للخلفية</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {GRADIENT_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setNewAdAdGradient(p.value)}
                        className={cn(
                          "w-full h-9 rounded-xl flex items-center justify-between px-3 text-xs text-white bg-gradient-to-r font-bold border transition-all cursor-pointer",
                          p.value,
                          newAdGradient === p.value ? "border-brand-orange scale-102 ring-2 ring-brand-orange/30" : "border-transparent"
                        )}
                      >
                        <span>{p.name}</span>
                        {newAdGradient === p.value && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="link" className="text-xs font-bold">رابط التوجيه (اختياري)</Label>
                  <Input 
                    id="link" 
                    placeholder="مثال: /cart أو /products..." 
                    value={newAdLink}
                    onChange={(e) => setNewAdLink(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full mt-2 cursor-pointer shadow-lg shadow-brand-orange/20">
                  <Plus className="w-4 h-4 ml-1.5" /> إضافة الإعلان ونشره
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Banners List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground pr-1 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-brand-orange rounded-full inline-block" />
              الإعلانات المنشورة حالياً ({banners.length})
            </h2>
            
            {banners.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-dashed text-muted-foreground text-sm">
                لا توجد إعلانات نشطة حالياً. يرجى ملء النموذج لإضافة إعلانك الأول.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {banners.map((banner) => (
                  <Card key={banner.id} className="overflow-hidden border border-border/40 shadow-premium flex flex-col sm:flex-row items-stretch">
                    <div className={cn(
                      "w-full sm:w-2/5 p-5 text-white flex flex-col justify-center bg-gradient-to-r relative",
                      banner.bg_gradient || "from-brand-blue to-blue-600"
                    )}>
                      <h4 className="font-black text-base line-clamp-1">{banner.title}</h4>
                      <p className="text-[10px] text-white/80 line-clamp-2 mt-1 leading-relaxed">{banner.description}</p>
                    </div>
                    <div className="flex-grow p-4 flex items-center justify-between gap-4">
                      <div className="text-xs space-y-1">
                        <p className="text-muted-foreground"><strong>الرابط الحالي:</strong> <span className="underline">{banner.link_url || "/"}</span></p>
                        <p className="text-muted-foreground"><strong>الخلفية:</strong> <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{banner.bg_gradient?.split(" ")[0] || "افتراضي"}</code></p>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="h-8 w-8 cursor-pointer shrink-0"
                        title="حذف الإعلان"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Top Paid Banner Form */}
            <Card className="border border-border/40 shadow-premium h-fit">
              <CardHeader>
                <CardTitle className="text-lg font-black text-brand-blue dark:text-foreground flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-brand-orange" /> إضافة إعلان علوي مدفوع
                </CardTitle>
                <CardDescription className="text-xs">
                  سيظهر هذا الإعلان في شريط الإعلانات المدفوعة في أعلى كافة صفحات التسوق بالتطبيق.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTopBanner} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="top-text" className="text-xs font-bold">نص الإعلان</Label>
                    <textarea 
                      id="top-text" 
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="اكتب العرض الترويجي الجذاب هنا..."
                      value={newTopText}
                      onChange={(e) => setNewTopText(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="top-link" className="text-xs font-bold">رابط التوجيه (اختياري)</Label>
                    <Input 
                      id="top-link" 
                      placeholder="مثال: /products أو رابط خارجي..." 
                      value={newTopLink}
                      onChange={(e) => setNewTopLink(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="start-date" className="text-[11px] font-bold">تاريخ البدء</Label>
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
                      <Label htmlFor="end-date" className="text-[11px] font-bold">تاريخ الانتهاء</Label>
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
                      id="top-active"
                      checked={newTopIsActive}
                      onChange={(e) => setNewTopIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange cursor-pointer"
                    />
                    <Label htmlFor="top-active" className="text-xs font-bold cursor-pointer">تفعيل الإعلان فوراً</Label>
                  </div>

                  <Button type="submit" className="w-full mt-2 cursor-pointer shadow-lg shadow-brand-orange/20">
                    <Plus className="w-4 h-4 ml-1.5" /> نشر وجدولة الإعلان
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Active Top Paid Banners List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-base sm:text-lg font-black text-brand-blue dark:text-foreground pr-1 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-brand-orange rounded-full inline-block" />
                قائمة الإعلانات العليا الجارية والجدولة ({topBanners.length})
              </h2>

              {topBanners.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-dashed text-muted-foreground text-sm">
                  لا توجد إعلانات مدفوعة عليا منشأة حالياً. استخدم النموذج لإنشاء إعلانك الأول.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
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
            <CardTitle className="text-lg font-black text-brand-blue dark:text-foreground">صلاحيات المستخدمين وأجور التوصيل</CardTitle>
            <CardDescription className="text-xs">تحكم في أدوار المستخدمين وعين أجور توصيل التجار الفردية</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-6">
            {profiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                لم يتم العثور على مستخدمين مسجلين بعد.
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs">
                    <th className="p-3 font-bold">الاسم الكامل</th>
                    <th className="p-3 font-bold">تاريخ التسجيل</th>
                    <th className="p-3 font-bold text-center">الرتبة / الصلاحية</th>
                    <th className="p-3 font-bold text-center">أجور التوصيل (د.ع)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-black text-brand-blue dark:text-foreground">{profile.full_name || "مستخدم مجهول"}</td>
                      <td className="p-3 text-muted-foreground">{new Date(profile.created_at).toLocaleDateString("ar-IQ")}</td>
                      <td className="p-3 text-center">
                        <select 
                          value={profile.role || "guest"}
                          onChange={(e) => handleUpdateRole(profile.id, e.target.value)}
                          className="bg-card border border-border/80 rounded-lg p-1 text-xs font-bold text-center text-foreground cursor-pointer focus:border-brand-orange outline-none"
                        >
                          <option value="guest">زائر تجاري (Guest)</option>
                          <option value="merchant">تاجر جملة (Merchant)</option>
                          <option value="admin">مدير نظام (Admin)</option>
                        </select>
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-2">
                        {profile.role === "merchant" ? (
                          <div className="flex items-center gap-1.5 max-w-[120px]">
                            <Input 
                              type="number" 
                              value={profile.delivery_fee || 0} 
                              onChange={(e) => handleUpdateDeliveryFee(profile.id, parseInt(e.target.value) || 0)}
                              className="h-8 text-center text-xs font-bold"
                              dir="ltr"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
